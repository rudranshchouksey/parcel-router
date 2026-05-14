import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);
  const department = searchParams.get('department');

  const records = await db.routingRecord.findMany({
    where: department ? { department } : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      createdAt: true,
      recipientName: true,
      weight: true,
      value: true,
      department: true,
      requiresInsurance: true,
      reason: true,
      appliedRuleLabel: true,
      source: true,
      processingMs: true,
    },
  });

  return NextResponse.json({ records, count: records.length });
}
