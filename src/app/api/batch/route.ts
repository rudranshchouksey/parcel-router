import { NextRequest, NextResponse } from "next/server";
import { detectFormat, parseXmlBatch, parseJsonBatch } from "@/lib/parsers";
import { RuleEngine } from "@/core/engine/RuleEngine";
import { activeRules } from "@/core/rules";
import { db } from "@/lib/db";
import { logRoutingDecision, logRoutingError } from "@/lib/logger";
import { env } from "@/lib/env";

const engine = new RuleEngine(activeRules);

const MAX_FILE_BYTES = env.MAX_BATCH_FILE_SIZE_MB * 1024 * 1024;
const MAX_PARCEL_COUNT = env.MAX_BATCH_PARCEL_COUNT;

const BATCH_TIMEOUT_MS = 25_000;

export async function POST(req: NextRequest) {
  const batchStart = Date.now();
  const correlationId = req.headers.get("x-correlation-id") ?? crypto.randomUUID();

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file uploaded. Include a file field." }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      {
        error: `File too large. Maximum allowed: ${env.MAX_BATCH_FILE_SIZE_MB}MB. Received: ${(file.size / 1024 / 1024).toFixed(1)}MB`,
      },
      { status: 413 }
    );
  }

  const content = await file.text();
  const format = detectFormat(file.name, content);

  let parcels: any[], batchId: string, parseErrors: string[];
  try {
    const parsed =
      format === "xml"
        ? parseXmlBatch(content)
        : parseJsonBatch(JSON.parse(content));
    parcels = parsed.parcels;
    batchId = parsed.batchId;
    parseErrors = parsed.errors;
  } catch (err) {
    logRoutingError(err, { correlationId, filename: file.name });
    return NextResponse.json({ error: "Failed to parse file", correlationId }, { status: 422 });
  }

  if (parcels.length === 0) {
    return NextResponse.json(
      { error: "No valid parcels found in file", parseErrors },
      { status: 422 }
    );
  }

  if (parcels.length > MAX_PARCEL_COUNT) {
    return NextResponse.json(
      {
        error: `Batch too large. Maximum ${MAX_PARCEL_COUNT} parcels per upload. Received: ${parcels.length}`,
      },
      { status: 422 }
    );
  }

  const batchJob = await db.batchJob.create({
    data: {
      filename: file.name,
      format,
      totalCount: parcels.length,
      successCount: 0,
      errorCount: parseErrors.length,
      status: "processing",
    },
  });

  const routingStart = Date.now();

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Batch processing timeout")), BATCH_TIMEOUT_MS)
  );

  const routingPromise = Promise.resolve(
    parcels.map((parcel, index) => {
      try {
        const decision = engine.route(parcel);
        return { parcel, decision, error: null };
      } catch (err) {
        logRoutingError(err, { correlationId, batchJobId: batchJob.id, parcelIndex: index });
        return {
          parcel,
          decision: null,
          error: `Parcel at index ${index} could not be routed`,
        };
      }
    })
  );

  let results: Awaited<typeof routingPromise>;
  try {
    results = await Promise.race([routingPromise, timeoutPromise]);
  } catch (err) {
    await db.batchJob.update({
      where: { id: batchJob.id },
      data: { status: "failed" },
    });
    logRoutingError(err, { correlationId, batchJobId: batchJob.id });
    return NextResponse.json(
      { error: "Batch processing timed out. Try uploading a smaller file.", correlationId },
      { status: 504 }
    );
  }

  const successful = results.filter((r) => r.decision !== null);
  const failed = results.filter((r) => r.decision === null);
  const routingMs = Date.now() - routingStart;

  if (successful.length > 0) {
    await db.routingRecord.createMany({
      data: successful.map(({ parcel, decision }) => ({
        weight: parcel.weight,
        value: parcel.value,
        recipientName: parcel.recipient?.name ?? null,
        batchId: batchJob.id,
        department: decision!.department,
        requiresInsurance: decision!.requiresInsurance,
        reason: decision!.reason,
        appliedRuleLabel: decision!.appliedRuleLabel,
        flags: decision!.flags,
        source: `batch_${format}` as "batch_xml" | "batch_json",
        processingMs: routingMs,
      })),
    });
  }

  const totalMs = Date.now() - batchStart;

  await db.batchJob.update({
    where: { id: batchJob.id },
    data: {
      successCount: successful.length,
      errorCount: parseErrors.length + failed.length,
      status: failed.length === 0 ? "completed" : "partial",
    },
  });

  successful.forEach(({ parcel, decision }) => {
    logRoutingDecision({
      parcelWeight: parcel.weight,
      parcelValue: parcel.value,
      department: decision!.department,
      requiresInsurance: decision!.requiresInsurance,
      appliedRule: decision!.appliedRuleLabel,
      source: `batch_${format}` as any,
      batchId: batchJob.id,
      processingMs: routingMs,
    });
  });

  return NextResponse.json({
    batchId: batchJob.id,
    correlationId,
    totalProcessed: successful.length,
    totalFailed: failed.length,
    totalMs,
    routingMs,
    parseErrors,
    routingErrors: failed.map((f) => f.error),
    results: successful.map(({ parcel, decision }) => ({
      recipient: parcel.recipient?.name ?? null,
      weight: parcel.weight,
      value: parcel.value,
      department: decision!.department,
      requiresInsurance: decision!.requiresInsurance,
      reason: decision!.reason,
    })),
  });
}