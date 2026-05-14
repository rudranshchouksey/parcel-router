/* // The Parcel input — what operators submit
export interface Parcel {
  weight: number;              // kg — required for routing
  value: number;               // € — required for insurance check
  destinationCountry?: string; // optional — not in current XML schema
  recipient?: {
    name: string;
    address?: {
      street?: string;
      houseNumber?: string;
      postalCode?: string;
      city?: string;
    };
  };
  attributes?: Record<string, unknown>; // extensible
}

// What the rule engine produces
export interface RouteDecision {
  department: Department;
  requiresInsurance: boolean;
  reason: string;              // operator-readable explanation
  appliedRuleLabel: string;    // which rule triggered this
  flags: RoutingFlag[];
}

// All possible departments — extend here for new ones
export type Department =
  | 'Mail'
  | 'Regular'
  | 'Heavy'
  | 'ManualReview';  // fallback if no rule matches

// Flags carried with a decision
export type RoutingFlag =
  | 'HIGH_VALUE'
  | 'REQUIRES_INSURANCE'
  | 'OVER_WEIGHT';

// A single business rule — this is the extension point
export interface Rule {
  label: string;               // human-readable name
  priority: number;            // lower = evaluated first
  condition: (parcel: Parcel) => boolean;
  decision: (parcel: Parcel) => RouteDecision;
}
*/
// src/core/engine/types.ts

// ─── Department Type ──────────────────────────────────────────────────────────
//
// Pattern: known literals unioned with `string & {}`
//
// Why not a plain string?
//   - Loses autocomplete and type safety for known departments
//
// Why not a strict enum?
//   - `'Fragile' as any` required for extensions — fails live interview modifications
//
// Why `string & {}`?
//   - Preserves autocomplete for known values (TypeScript narrows correctly)
//   - Accepts any string without casting for extended departments
//   - This is the same pattern Next.js uses for HttpMethod
//
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