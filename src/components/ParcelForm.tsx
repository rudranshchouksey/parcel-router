// src/components/ParcelForm.tsx

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Loader2, AlertCircle, PackageSearch } from "lucide-react";
import { RouteResult } from "./RouteResult";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormFields {
  weight: string;
  value: string;
  destinationCountry: string;
  recipientName: string;
}

interface FormErrors {
  weight?: string;
  value?: string;
  destinationCountry?: string;
}

interface RouteDecision {
  department: string;
  requiresInsurance: boolean;
  reason: string;
  appliedRuleLabel: string;
  flags: string[];
}

interface RouteApiResponse {
  parcel: {
    weight: number;
    value: number;
    destinationCountry?: string;
    recipient?: { name: string };
  };
  decision: RouteDecision;
  processingMs: number;
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateFields(fields: FormFields): FormErrors {
  const errors: FormErrors = {};

  const weight = parseFloat(fields.weight);
  if (!fields.weight.trim()) {
    errors.weight = "Weight is required.";
  } else if (isNaN(weight) || weight <= 0) {
    errors.weight = "Weight must be a positive number.";
  } else if (weight > 10000) {
    errors.weight = "Weight cannot exceed 10,000 kg.";
  }

  const value = parseFloat(fields.value);
  if (!fields.value.trim()) {
    errors.value = "Value is required.";
  } else if (isNaN(value) || value < 0) {
    errors.value = "Value must be 0 or greater.";
  } else if (value > 10_000_000) {
    errors.value = "Value cannot exceed €10,000,000.";
  }

  return errors;
}

// ─── Field component ──────────────────────────────────────────────────────────

function FormField({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-gray-400">{hint}</p>
      ) : null}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ParcelForm() {
  const [fields, setFields] = useState<FormFields>({
    weight: "",
    value: "",
    destinationCountry: "",
    recipientName: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<RouteApiResponse | null>(null);

  // ── Handlers ──

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));

    // Clear field error on change
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    const validationErrors = validateFields(fields);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setResult(null);

    try {
      const body: Record<string, unknown> = {
        weight: parseFloat(fields.weight),
        value: parseFloat(fields.value),
      };

      if (fields.destinationCountry.trim()) {
        body.destinationCountry = fields.destinationCountry.trim();
      }

      if (fields.recipientName.trim()) {
        body.recipient = { name: fields.recipientName.trim() };
      }

      const res = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        // Surface field-level API errors back into the form
        if (data?.details?.fieldErrors) {
          const apiErrors: FormErrors = {};
          const fe = data.details.fieldErrors;
          if (fe.weight?.[0]) apiErrors.weight = fe.weight[0];
          if (fe.value?.[0]) apiErrors.value = fe.value[0];
          setErrors(apiErrors);
        } else {
          throw new Error(data?.error ?? `Server error (${res.status})`);
        }
        return;
      }

      setResult(data);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFields({ weight: "", value: "", destinationCountry: "", recipientName: "" });
    setErrors({});
    setSubmitError(null);
    setResult(null);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">

        {/* ── Required fields ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            id="weight"
            label="Weight"
            required
            error={errors.weight}
            hint="In kilograms (kg)"
          >
            <Input
              id="weight"
              name="weight"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              max="10000"
              placeholder="e.g. 2.5"
              value={fields.weight}
              onChange={handleChange}
              aria-describedby={errors.weight ? "weight-error" : "weight-hint"}
              aria-invalid={!!errors.weight}
              className={errors.weight ? "border-red-400 focus-visible:ring-red-400" : ""}
              disabled={submitting}
            />
          </FormField>

          <FormField
            id="value"
            label="Declared Value"
            required
            error={errors.value}
            hint="In euros (€)"
          >
            <Input
              id="value"
              name="value"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="e.g. 150.00"
              value={fields.value}
              onChange={handleChange}
              aria-describedby={errors.value ? "value-error" : "value-hint"}
              aria-invalid={!!errors.value}
              className={errors.value ? "border-red-400 focus-visible:ring-red-400" : ""}
              disabled={submitting}
            />
          </FormField>
        </div>

        <Separator />

        {/* ── Optional fields ── */}
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Optional Details
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            id="recipientName"
            label="Recipient Name"
            hint="For audit log display"
          >
            <Input
              id="recipientName"
              name="recipientName"
              type="text"
              placeholder="e.g. Vinny Gankema"
              value={fields.recipientName}
              onChange={handleChange}
              disabled={submitting}
              maxLength={200}
            />
          </FormField>

          <FormField
            id="destinationCountry"
            label="Destination Country"
            hint="ISO code or full name"
          >
            <Input
              id="destinationCountry"
              name="destinationCountry"
              type="text"
              placeholder="e.g. NL or Netherlands"
              value={fields.destinationCountry}
              onChange={handleChange}
              disabled={submitting}
              maxLength={100}
            />
          </FormField>
        </div>

        {/* ── Submit error ── */}
        {submitError && (
          <Alert variant="destructive" className="py-2.5">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{submitError}</AlertDescription>
          </Alert>
        )}

        {/* ── Actions ── */}
        <div className="flex items-center gap-3 pt-1">
          <Button
            type="submit"
            disabled={submitting}
            className="flex-1 sm:flex-none sm:min-w-[160px] gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Routing parcel…
              </>
            ) : (
              <>
                <PackageSearch className="h-4 w-4" />
                Route Parcel
              </>
            )}
          </Button>

          {result && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleReset}
              className="text-gray-500"
            >
              Route another
            </Button>
          )}
        </div>
      </form>

      {/* ── Result ── */}
      {result && (
        <RouteResult
          department={result.decision.department}
          requiresInsurance={result.decision.requiresInsurance}
          reason={result.decision.reason}
          appliedRuleLabel={result.decision.appliedRuleLabel}
          flags={result.decision.flags}
          weight={result.parcel.weight}
          value={result.parcel.value}
          processingMs={result.processingMs}
        />
      )}
    </div>
  );
}