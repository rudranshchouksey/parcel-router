// src/components/RouteResult.tsx

"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ShieldCheck,
  Mail,
  Package,
  Weight,
  Cpu,
  Tag,
  Info,
  AlertTriangle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RouteResultProps {
  department: string;
  requiresInsurance: boolean;
  reason: string;
  appliedRuleLabel: string;
  flags: string[];
  weight: number;
  value: number;
  processingMs?: number;
}

// ─── Department config ────────────────────────────────────────────────────────

const DEPARTMENT_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ElementType;
    containerClass: string;
    badgeClass: string;
    iconClass: string;
    headingClass: string;
  }
> = {
  Mail: {
    label: "Mail Department",
    icon: Mail,
    containerClass: "border-blue-200 bg-blue-50",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
    iconClass: "text-blue-500",
    headingClass: "text-blue-900",
  },
  Regular: {
    label: "Regular Department",
    icon: Package,
    containerClass: "border-green-200 bg-green-50",
    badgeClass: "bg-green-100 text-green-800 border-green-200",
    iconClass: "text-green-500",
    headingClass: "text-green-900",
  },
  Heavy: {
    label: "Heavy Department",
    icon: Weight,
    containerClass: "border-orange-200 bg-orange-50",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-200",
    iconClass: "text-orange-500",
    headingClass: "text-orange-900",
  },
  ManualReview: {
    label: "Manual Review",
    icon: AlertTriangle,
    containerClass: "border-red-200 bg-red-50",
    badgeClass: "bg-red-100 text-red-800 border-red-200",
    iconClass: "text-red-500",
    headingClass: "text-red-900",
  },
};

const FALLBACK_CONFIG = {
  label: "Unknown Department",
  icon: Info,
  containerClass: "border-gray-200 bg-gray-50",
  badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
  iconClass: "text-gray-400",
  headingClass: "text-gray-900",
};

// ─── Flag label map ───────────────────────────────────────────────────────────

const FLAG_LABELS: Record<string, string> = {
  HIGH_VALUE:           "High Value",
  REQUIRES_INSURANCE:   "Requires Insurance",
  OVER_WEIGHT:          "Over Weight",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function RouteResult({
  department,
  requiresInsurance,
  reason,
  appliedRuleLabel,
  flags,
  weight,
  value,
  processingMs,
}: RouteResultProps) {
  const config = DEPARTMENT_CONFIG[department] ?? FALLBACK_CONFIG;
  const DeptIcon = config.icon;

  return (
    <div
      role="region"
      aria-label="Routing decision result"
      className={`rounded-xl border-2 p-5 space-y-4 ${config.containerClass}`}
    >

      {/* ── Department heading ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-white/60 ${config.iconClass}`}>
            <DeptIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Routed to
            </p>
            <h3 className={`text-lg font-bold leading-tight ${config.headingClass}`}>
              {config.label}
            </h3>
          </div>
        </div>

        <Badge
          variant="outline"
          className={`text-xs font-semibold shrink-0 ${config.badgeClass}`}
        >
          {department}
        </Badge>
      </div>

      {/* ── Insurance warning ── */}
      {requiresInsurance && (
        <Alert className="border-amber-300 bg-amber-50 py-3">
          <ShieldCheck className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm font-medium text-amber-800">
            Insurance approval required before this parcel can be dispatched.
            Please contact the Insurance Department.
          </AlertDescription>
        </Alert>
      )}

      <Separator className="opacity-40" />

      {/* ── Parcel summary ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-white/60 px-3 py-2.5">
          <p className="text-xs text-gray-500 mb-0.5">Weight</p>
          <p className="text-sm font-semibold text-gray-900 tabular-nums">
            {weight} kg
          </p>
        </div>
        <div className="rounded-lg bg-white/60 px-3 py-2.5">
          <p className="text-xs text-gray-500 mb-0.5">Declared Value</p>
          <p className="text-sm font-semibold text-gray-900 tabular-nums">
            €{value.toLocaleString("en-IE")}
          </p>
        </div>
      </div>

      {/* ── Decision reason ── */}
      <div className="flex items-start gap-2 rounded-lg bg-white/60 px-3 py-2.5">
        <Info className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Routing reason</p>
          <p className="text-sm text-gray-700">{reason}</p>
        </div>
      </div>

      {/* ── Flags ── */}
      {flags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Tag className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
          {flags.map((flag) => (
            <Badge
              key={flag}
              variant="secondary"
              className="text-xs"
            >
              {FLAG_LABELS[flag] ?? flag}
            </Badge>
          ))}
        </div>
      )}

      {/* ── Footer meta ── */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Cpu className="h-3 w-3" aria-hidden="true" />
          <span>
            Rule applied:{" "}
            <span className="font-mono font-medium text-gray-600">
              {appliedRuleLabel}
            </span>
          </span>
        </div>

        {processingMs !== undefined && (
          <p className="text-xs text-gray-400 tabular-nums">
            {processingMs}ms
          </p>
        )}
      </div>
    </div>
  );
}