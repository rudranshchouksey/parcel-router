// tests/integration/api-route.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/route/route";
import { NextRequest } from "next/server";

// Mock Prisma so tests never touch a real database
vi.mock("@/lib/db", () => ({
  db: {
    routingRecord: {
      create: vi.fn().mockResolvedValue({ id: "mock-id" }),
    },
  },
}));

// Mock logger to keep test output clean
vi.mock("@/lib/logger", () => ({
  logRoutingDecision: vi.fn(),
  logRoutingError: vi.fn(),
}));

// ─── Helper ───────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/route", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/route — routing outcomes", () => {
  it("routes 0.5kg parcel to Mail", async () => {
    const res = await POST(makeRequest({ weight: 0.5, value: 0 }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.decision.department).toBe("Mail");
  });

  it("routes 5kg parcel to Regular", async () => {
    const res = await POST(makeRequest({ weight: 5, value: 0 }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.decision.department).toBe("Regular");
  });

  it("routes 15kg parcel to Heavy", async () => {
    const res = await POST(makeRequest({ weight: 15, value: 0 }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.decision.department).toBe("Heavy");
  });

  it("sets requiresInsurance true for value > €1000", async () => {
    const res = await POST(makeRequest({ weight: 2, value: 1500 }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.decision.requiresInsurance).toBe(true);
  });

  it("returns processingMs in response", async () => {
    const res = await POST(makeRequest({ weight: 2, value: 0 }));
    const body = await res.json();
    expect(typeof body.processingMs).toBe("number");
  });

  it("returns reason string in decision", async () => {
    const res = await POST(makeRequest({ weight: 2, value: 0 }));
    const body = await res.json();
    expect(typeof body.decision.reason).toBe("string");
    expect(body.decision.reason.length).toBeGreaterThan(0);
  });
});

describe("POST /api/route — validation errors", () => {
  it("returns 400 for missing weight", async () => {
    const res = await POST(makeRequest({ value: 100 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing value", async () => {
    const res = await POST(makeRequest({ weight: 2 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for negative weight", async () => {
    const res = await POST(makeRequest({ weight: -1, value: 0 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for zero weight", async () => {
    const res = await POST(makeRequest({ weight: 0, value: 0 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for string weight", async () => {
    const res = await POST(makeRequest({ weight: "heavy", value: 0 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for malformed JSON", async () => {
    const req = new NextRequest("http://localhost:3000/api/route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ bad json ::::",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns validation details in error response", async () => {
    const res = await POST(makeRequest({ value: 100 }));
    const body = await res.json();
    expect(body.error).toBeTruthy();
    expect(body.details).toBeDefined();
  });
});