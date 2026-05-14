// tests/integration/api-batch.test.ts

import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { POST } from "@/app/api/batch/route";
import { NextRequest } from "next/server";

// Mock Prisma — never touch real DB in tests
vi.mock("@/lib/db", () => ({
  db: {
    batchJob: {
      create: vi.fn().mockResolvedValue({ id: "mock-batch-id" }),
      update: vi.fn().mockResolvedValue({}),
    },
    routingRecord: {
      createMany: vi.fn().mockResolvedValue({ count: 17 }),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logRoutingDecision: vi.fn(),
  logRoutingError: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeXmlRequest(filename: string, content: string): NextRequest {
  const formData = new FormData();
  formData.append("file", new Blob([content], { type: "text/xml" }), filename);
  return new NextRequest("http://localhost:3000/api/batch", {
    method: "POST",
    body: formData,
  });
}

function makeJsonRequest(filename: string, content: string): NextRequest {
  const formData = new FormData();
  formData.append("file", new Blob([content], { type: "application/json" }), filename);
  return new NextRequest("http://localhost:3000/api/batch", {
    method: "POST",
    body: formData,
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/batch — XML upload (real fixture)", () => {
  const xmlContent = readFileSync(
    resolve(__dirname, "../fixtures/Container_68465468.xml"),
    "utf-8"
  );

  it("returns 200 for valid XML batch", async () => {
    const res = await POST(makeXmlRequest("Container_68465468.xml", xmlContent));
    expect(res.status).toBe(200);
  });

  it("processes all 17 parcels from the fixture", async () => {
    const res = await POST(makeXmlRequest("Container_68465468.xml", xmlContent));
    const body = await res.json();
    expect(body.totalProcessed).toBe(17);
  });

  it("returns a batchId in the response", async () => {
    const res = await POST(makeXmlRequest("Container_68465468.xml", xmlContent));
    const body = await res.json();
    expect(body.batchId).toBeTruthy();
  });

  it("includes results array with department for each parcel", async () => {
    const res = await POST(makeXmlRequest("Container_68465468.xml", xmlContent));
    const body = await res.json();
    expect(Array.isArray(body.results)).toBe(true);
    expect(body.results).toHaveLength(17);
    body.results.forEach((r: any) => {
      expect(r.department).toBeTruthy();
      expect(typeof r.requiresInsurance).toBe("boolean");
    });
  });

  it("flags Ricardus Proper (100kg, €2000) as Heavy + insurance", async () => {
    const res = await POST(makeXmlRequest("Container_68465468.xml", xmlContent));
    const body = await res.json();
    const ricardus = body.results.find(
      (r: any) => r.recipient === "Ricardus Proper"
    );
    expect(ricardus?.department).toBe("Heavy");
    expect(ricardus?.requiresInsurance).toBe(true);
  });

  it("routes Vinny Gankema (0.02kg, €0) to Mail", async () => {
    const res = await POST(makeXmlRequest("Container_68465468.xml", xmlContent));
    const body = await res.json();
    const vinny = body.results.find((r: any) => r.recipient === "Vinny Gankema");
    expect(vinny?.department).toBe("Mail");
    expect(vinny?.requiresInsurance).toBe(false);
  });
});

describe("POST /api/batch — JSON upload", () => {
  const jsonContent = readFileSync(
    resolve(__dirname, "../fixtures/sample-batch.json"),
    "utf-8"
  );

  it("returns 200 for valid JSON batch", async () => {
    const res = await POST(makeJsonRequest("sample-batch.json", jsonContent));
    expect(res.status).toBe(200);
  });

  it("processes all 9 parcels from sample-batch.json", async () => {
    const res = await POST(makeJsonRequest("sample-batch.json", jsonContent));
    const body = await res.json();
    expect(body.totalProcessed).toBe(9);
  });

  it("correctly identifies insurance cases", async () => {
    const res = await POST(makeJsonRequest("sample-batch.json", jsonContent));
    const body = await res.json();
    const insuranceParcels = body.results.filter((r: any) => r.requiresInsurance);
    // Frank, Grace, Henry all have value > €1000
    expect(insuranceParcels).toHaveLength(3);
  });
});

describe("POST /api/batch — error handling", () => {
  it("returns 400 when no file is uploaded", async () => {
    const formData = new FormData();
    const req = new NextRequest("http://localhost:3000/api/batch", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 422 for malformed XML", async () => {
    const res = await POST(makeXmlRequest("bad.xml", "<broken xml <<<"));
    expect(res.status).toBe(422);
  });

  it("returns 422 for empty JSON parcels array", async () => {
    const res = await POST(
      makeJsonRequest("empty.json", JSON.stringify({ parcels: [] }))
    );
    expect(res.status).toBe(422);
  });
});