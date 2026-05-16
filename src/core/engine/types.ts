export type KnownDepartment = "Mail" | "Regular" | "Heavy" | "ManualReview";
export type Department = KnownDepartment | (string & {});

// ─── Routing Flag ─────────────────────────────────────────────────────────────

export type KnownFlag =
  | "HIGH_VALUE"
  | "REQUIRES_INSURANCE"
  | "OVER_WEIGHT";

export type RoutingFlag = KnownFlag | (string & {});

// ─── Core Domain Types ────────────────────────────────────────────────────────

export interface Parcel {
  weight: number;
  value: number;
  destinationCountry?: string;
  recipient?: {
    name: string;
    address?: {
      street?: string;
      houseNumber?: string;
      postalCode?: string;
      city?: string;
    };
  };
  attributes?: Record<string, unknown>;
}

export interface RouteDecision {
  department: Department;
  requiresInsurance: boolean;
  reason: string;
  appliedRuleLabel: string;
  flags: RoutingFlag[];
}

export interface Rule {
  label: string;
  priority: number;
  condition: (parcel: Parcel) => boolean;
  decision: (parcel: Parcel) => RouteDecision;
}