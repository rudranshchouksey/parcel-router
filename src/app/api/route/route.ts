import { NextRequest, NextResponse } from 'next/server';
import { ParcelInputSchema } from '@/core/validation/parcelSchema';
import { RuleEngine } from '@/core/engine/RuleEngine';
import { defaultRules } from '@/core/rules/defaultRules';
import { db } from '@/lib/db';
import { logRoutingDecision, logRoutingError } from '@/lib/logger';

const engine = new RuleEngine(defaultRules);

export async function POST(req: NextRequest) {
  const start = Date.now();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const parsed = ParcelInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const parcel = parsed.data;

  let decision;
  try {
    decision = engine.route(parcel);
  } catch (err) {
    logRoutingError(err, { parcel });
    return NextResponse.json(
      { error: 'Routing engine error', correlationId: crypto.randomUUID() },
      { status: 500 }
    );
  }

  const processingMs = Date.now() - start;

  // Persist to DB
  await db.routingRecord.create({
    data: {
      weight: parcel.weight,
      value: parcel.value,
      destinationCountry: parcel.destinationCountry,
      recipientName: parcel.recipient?.name,
      department: decision.department,
      requiresInsurance: decision.requiresInsurance,
      reason: decision.reason,
      appliedRuleLabel: decision.appliedRuleLabel,
      flags: decision.flags,
      source: 'single',
      processingMs,
    },
  });

  logRoutingDecision({
    parcelWeight: parcel.weight,
    parcelValue: parcel.value,
    department: decision.department,
    requiresInsurance: decision.requiresInsurance,
    appliedRule: decision.appliedRuleLabel,
    source: 'single',
    processingMs,
  });

  return NextResponse.json({ parcel, decision, processingMs }, { status: 200 });
}
