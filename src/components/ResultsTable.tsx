// src/components/ResultsTable.tsx

"use client";

import { useState, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  Search,
  X,
} from "lucide-react";
import type { BatchResultItem } from "./BatchUpload";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = "recipient" | "weight" | "value" | "department";
type SortDir = "asc" | "desc";

interface SortState {
  key: SortKey;
  dir: SortDir;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEPARTMENT_STYLES: Record<string, { badge: string; row: string }> = {
  Mail:         { badge: "bg-blue-100 text-blue-800 border-blue-200",     row: "" },
  Regular:      { badge: "bg-green-100 text-green-800 border-green-200",  row: "" },
  Heavy:        { badge: "bg-orange-100 text-orange-800 border-orange-200", row: "" },
  ManualReview: { badge: "bg-red-100 text-red-800 border-red-200",        row: "bg-red-50" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function DepartmentBadge({ department }: { department: string }) {
  const style = DEPARTMENT_STYLES[department] ?? {
    badge: "bg-gray-100 text-gray-700 border-gray-200",
    row: "",
  };
  return (
    <Badge variant="outline" className={`text-xs font-medium ${style.badge}`}>
      {department === "ManualReview" ? "Manual Review" : department}
    </Badge>
  );
}

function SortIcon({ col, sort }: { col: SortKey; sort: SortState }) {
  if (sort.key !== col) return <ArrowUpDown className="h-3.5 w-3.5 text-gray-300" />;
  return sort.dir === "asc"
    ? <ArrowUp className="h-3.5 w-3.5 text-gray-600" />
    : <ArrowDown className="h-3.5 w-3.5 text-gray-600" />;
}

function sortResults(
  items: BatchResultItem[],
  { key, dir }: SortState
): BatchResultItem[] {
  return [...items].sort((a, b) => {
    let cmp = 0;

    if (key === "recipient") {
      cmp = (a.recipient ?? "").localeCompare(b.recipient ?? "");
    } else if (key === "weight") {
      cmp = a.weight - b.weight;
    } else if (key === "value") {
      cmp = a.value - b.value;
    } else if (key === "department") {
      cmp = a.department.localeCompare(b.department);
    }

    return dir === "asc" ? cmp : -cmp;
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ResultsTable({ results }: { results: BatchResultItem[] }) {
  const [sort, setSort] = useState<SortState>({ key: "department", dir: "asc" });
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [search, setSearch] = useState("");

  // ── Sort toggle ──
  const toggleSort = (key: SortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  };

  // ── Filtered + sorted data ──
  const displayed = useMemo(() => {
    let filtered = results;

    if (departmentFilter !== "all") {
      filtered = filtered.filter((r) => r.department === departmentFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.recipient?.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q)
      );
    }

    return sortResults(filtered, sort);
  }, [results, departmentFilter, search, sort]);

  // ── Column header button ──
  const SortableHead = ({
    col,
    label,
    className = "",
  }: {
    col: SortKey;
    label: string;
    className?: string;
  }) => (
    <TableHead className={`text-xs font-semibold text-gray-600 ${className}`}>
      <button
        onClick={() => toggleSort(col)}
        className="flex items-center gap-1 hover:text-gray-900 transition-colors"
        aria-label={`Sort by ${label}`}
      >
        {label}
        <SortIcon col={col} sort={sort} />
      </button>
    </TableHead>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">

        {/* Search */}
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <Input
            type="search"
            placeholder="Search recipient, reason…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
            aria-label="Search results"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Department filter */}
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="h-8 w-full sm:w-44 text-sm">
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

        {/* Result count */}
        <p className="text-xs text-gray-400 whitespace-nowrap ml-auto">
          {displayed.length} of {results.length} parcels
        </p>
      </div>

      {/* ── Table ── */}
      <div className="rounded-md border border-gray-200 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <SortableHead col="recipient" label="Recipient" />
              <SortableHead col="weight"    label="Weight"    className="text-right" />
              <SortableHead col="value"     label="Value"     className="text-right" />
              <SortableHead col="department" label="Department" />
              <TableHead className="text-xs font-semibold text-gray-600">
                Reason
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {displayed.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-10 text-sm text-gray-400"
                >
                  {search || departmentFilter !== "all"
                    ? "No results match your filters."
                    : "No parcels to display."}
                </TableCell>
              </TableRow>
            ) : (
              displayed.map((row, index) => {
                const rowStyle =
                  DEPARTMENT_STYLES[row.department]?.row ?? "";

                return (
                  <TableRow
                    key={index}
                    className={`hover:bg-gray-50 transition-colors ${rowStyle}`}
                  >
                    {/* Recipient */}
                    <TableCell className="text-sm text-gray-900 max-w-[160px]">
                      <span className="block truncate" title={row.recipient ?? ""}>
                        {row.recipient ?? (
                          <span className="text-gray-400 italic">Unknown</span>
                        )}
                      </span>
                    </TableCell>

                    {/* Weight */}
                    <TableCell className="text-sm text-gray-700 text-right tabular-nums whitespace-nowrap">
                      {row.weight} kg
                    </TableCell>

                    {/* Value */}
                    <TableCell className="text-sm text-gray-700 text-right tabular-nums whitespace-nowrap">
                      €{row.value.toLocaleString("en-IE")}
                    </TableCell>

                    {/* Department + Insurance */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <DepartmentBadge department={row.department} />
                        {row.requiresInsurance && (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <ShieldCheck
                                    className="h-3.5 w-3.5 text-amber-500 cursor-default"
                                    aria-label="Insurance approval required"
                                  />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                Insurance approval required
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>

                    {/* Reason */}
                    <TableCell className="text-xs text-gray-500 max-w-[260px]">
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate cursor-default" title={row.reason}>
                              {row.reason}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="text-xs max-w-xs text-wrap"
                          >
                            {row.reason}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Insurance legend ── */}
      {results.some((r) => r.requiresInsurance) && (
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <ShieldCheck className="h-3 w-3 text-amber-500" />
          Parcels marked with this icon require Insurance Department approval before dispatch.
        </p>
      )}
    </div>
  );
}