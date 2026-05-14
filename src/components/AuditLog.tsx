// src/components/AuditLog.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, AlertCircle, ShieldCheck } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditRecord {
  id: string;
  createdAt: string;
  recipientName: string | null;
  weight: number;
  value: number;
  department: string;
  requiresInsurance: boolean;
  reason: string;
  appliedRuleLabel: string;
  source: string;
  processingMs: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEPARTMENT_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  Mail:         { label: "Mail",          className: "bg-blue-100 text-blue-800 border-blue-200" },
  Regular:      { label: "Regular",       className: "bg-green-100 text-green-800 border-green-200" },
  Heavy:        { label: "Heavy",         className: "bg-orange-100 text-orange-800 border-orange-200" },
  ManualReview: { label: "Manual Review", className: "bg-red-100 text-red-800 border-red-200" },
};

function DepartmentBadge({ department }: { department: string }) {
  const config = DEPARTMENT_BADGE[department] ?? {
    label: department,
    className: "bg-gray-100 text-gray-800 border-gray-200",
  };
  return (
    <Badge variant="outline" className={`text-xs font-medium ${config.className}`}>
      {config.label}
    </Badge>
  );
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 7 }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AuditLog() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchRecords = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (departmentFilter !== "all") params.set("department", departmentFilter);

      const res = await fetch(`/api/audit?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to fetch audit log (${res.status})`);

      const data = await res.json();
      setRecords(data.records);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }, [departmentFilter]);

  // Initial load + auto-refresh every 30 seconds
  useEffect(() => {
    setLoading(true);
    fetchRecords();

    const interval = setInterval(fetchRecords, 30_000);
    return () => clearInterval(interval);
  }, [fetchRecords]);

  const handleManualRefresh = () => {
    setLoading(true);
    fetchRecords();
  };

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Routing Audit Log</h2>
          {lastUpdated && (
            <p className="text-xs text-gray-500 mt-0.5">
              Last updated {formatDate(lastUpdated.toISOString())} · auto-refreshes every 30s
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Department filter */}
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-40 h-8 text-sm">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              <SelectItem value="Mail">Mail</SelectItem>
              <SelectItem value="Regular">Regular</SelectItem>
              <SelectItem value="Heavy">Heavy</SelectItem>
              <SelectItem value="ManualReview">Manual Review</SelectItem>
            </SelectContent>
          </Select>

          {/* Manual refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={loading}
            className="h-8 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Error state ── */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ── Table ── */}
      <div className="rounded-md border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="text-xs font-semibold text-gray-600 w-36">Time</TableHead>
              <TableHead className="text-xs font-semibold text-gray-600">Recipient</TableHead>
              <TableHead className="text-xs font-semibold text-gray-600 text-right">Weight</TableHead>
              <TableHead className="text-xs font-semibold text-gray-600 text-right">Value</TableHead>
              <TableHead className="text-xs font-semibold text-gray-600">Department</TableHead>
              <TableHead className="text-xs font-semibold text-gray-600">Reason</TableHead>
              <TableHead className="text-xs font-semibold text-gray-600 w-20">Source</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <SkeletonRows />
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                  No routing records found.{" "}
                  {departmentFilter !== "all" && "Try clearing the department filter."}
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow
                  key={record.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {/* Time */}
                  <TableCell className="text-xs text-gray-500 tabular-nums whitespace-nowrap">
                    {formatDate(record.createdAt)}
                  </TableCell>

                  {/* Recipient */}
                  <TableCell className="text-sm text-gray-900 max-w-[160px] truncate">
                    {record.recipientName ?? (
                      <span className="text-gray-400 italic">Unknown</span>
                    )}
                  </TableCell>

                  {/* Weight */}
                  <TableCell className="text-sm text-gray-700 text-right tabular-nums whitespace-nowrap">
                    {record.weight} kg
                  </TableCell>

                  {/* Value */}
                  <TableCell className="text-sm text-gray-700 text-right tabular-nums whitespace-nowrap">
                    €{record.value.toLocaleString("en-IE")}
                  </TableCell>

                  {/* Department + Insurance */}
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <DepartmentBadge department={record.department} />
                      {record.requiresInsurance && (
                        <ShieldCheck
                          className="h-3.5 w-3.5 text-amber-500"
                          aria-label="Insurance required"
                        />
                      )}
                    </div>
                  </TableCell>

                  {/* Reason */}
                  <TableCell className="text-xs text-gray-500 max-w-[240px] truncate">
                    <span title={record.reason}>{record.reason}</span>
                  </TableCell>

                  {/* Source */}
                  <TableCell>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {record.source.replace("batch_", "").replace("_", " ")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Footer count ── */}
      {!loading && records.length > 0 && (
        <p className="text-xs text-gray-400 text-right">
          Showing {records.length} most recent records
        </p>
      )}
    </div>
  );
}