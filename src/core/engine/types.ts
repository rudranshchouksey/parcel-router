// The Parcel input — what operators submit
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
