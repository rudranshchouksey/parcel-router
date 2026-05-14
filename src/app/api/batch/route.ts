import { NextRequest, NextResponse } from 'next/server';
import { detectFormat, parseXmlBatch, parseJsonBatch } from '@/lib/parsers';
import { RuleEngine } from '@/core/engine/RuleEngine';
import { defaultRules } from '@/core/rules/defaultRules';
import { db } from '@/lib/db';
import { logRoutingDecision } from '@/lib/logger';

const engine = new RuleEngine(defaultRules);
const MAX_FILE_SIZE = parseInt(process.env.MAX_BATCH_FILE_SIZE_MB ?? '10') * 1024 * 1024;

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File too large. Maximum size: ${process.env.MAX_BATCH_FILE_SIZE_MB}MB` },
      { status: 413 }
    );
  }

  const content = await file.text();
  const format = detectFormat(file.name, content);

  const { parcels, batchId, errors: parseErrors } =
    format === 'xml'
      ? parseXmlBatch(content)
      : parseJsonBatch(JSON.parse(content));

  if (parcels.length === 0) {
    return NextResponse.json(
      { error: 'No valid parcels found', parseErrors },
      { status: 422 }
    );
  }

  // Create BatchJob record
  const batchJob = await db.batchJob.create({
    data: {
      filename: file.name,
      format,
      totalCount: parcels.length,
      successCount: 0,
      errorCount: parseErrors.length,
      status: 'processing',
    },
  });

  // Route all parcels
  const results = parcels.map((parcel) => {
    const decision = engine.route(parcel);
    return { parcel, decision };
  });

  // Bulk insert to DB
  await db.routingRecord.createMany({
    data: results.map(({ parcel, decision }) => ({
      weight: parcel.weight,
      value: parcel.value,
      recipientName: parcel.recipient?.name,
      batchId: batchJob.id,
      department: decision.department,
      requiresInsurance: decision.requiresInsurance,
      reason: decision.reason,
      appliedRuleLabel: decision.appliedRuleLabel,
      flags: decision.flags,
      source: `batch_${format}` as any,
    })),
  });

  // Update batch job status
  await db.batchJob.update({
    where: { id: batchJob.id },
    data: { successCount: results.length, status: 'completed' },
  });

  results.forEach(({ parcel, decision }) => {
    logRoutingDecision({
      parcelWeight: parcel.weight,
      parcelValue: parcel.value,
      department: decision.department,
      requiresInsurance: decision.requiresInsurance,
      appliedRule: decision.appliedRuleLabel,
      source: `batch_${format}` as any,
      batchId: batchJob.id,
    });
  });

  return NextResponse.json({
    batchId: batchJob.id,
    totalProcessed: results.length,
    parseErrors,
    results: results.map(({ parcel, decision }) => ({
      recipient: parcel.recipient?.name,
      weight: parcel.weight,
      value: parcel.value,
      department: decision.department,
      requiresInsurance: decision.requiresInsurance,
      reason: decision.reason,
    })),
  });
}
