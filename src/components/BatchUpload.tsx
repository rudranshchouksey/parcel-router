// src/components/BatchUpload.tsx

"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  UploadCloud,
  FileText,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Download,
} from "lucide-react";
import { ResultsTable } from "./ResultsTable";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BatchResultItem {
  recipient: string | null;
  weight: number;
  value: number;
  department: string;
  requiresInsurance: boolean;
  reason: string;
}

interface BatchResponse {
  batchId: string;
  totalProcessed: number;
  parseErrors: string[];
  results: BatchResultItem[];
}

type UploadState = "idle" | "dragging" | "uploading" | "success" | "error";

const ACCEPTED_TYPES = [".xml", ".json"];
const MAX_FILE_SIZE_MB = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isValidFile(file: File): string | null {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (!ACCEPTED_TYPES.includes(ext)) {
    return `Unsupported file type "${ext}". Please upload a .xml or .json file.`;
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `File too large (${formatFileSize(file.size)}). Maximum allowed size is ${MAX_FILE_SIZE_MB}MB.`;
  }
  return null;
}

function exportToCsv(results: BatchResultItem[], batchId: string) {
  const header = ["Recipient", "Weight (kg)", "Value (€)", "Department", "Insurance Required", "Reason"];
  const rows = results.map((r) => [
    r.recipient ?? "Unknown",
    r.weight,
    r.value,
    r.department,
    r.requiresInsurance ? "Yes" : "No",
    `"${r.reason.replace(/"/g, '""')}"`,
  ]);

  const csv = [header, ...rows].map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `batch-${batchId}-results.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryStats({ response }: { response: BatchResponse }) {
  const byDept = response.results.reduce<Record<string, number>>((acc, r) => {
    acc[r.department] = (acc[r.department] ?? 0) + 1;
    return acc;
  }, {});

  const insuranceCount = response.results.filter((r) => r.requiresInsurance).length;

  const DEPT_COLORS: Record<string, string> = {
    Mail:         "bg-blue-100 text-blue-800 border-blue-200",
    Regular:      "bg-green-100 text-green-800 border-green-200",
    Heavy:        "bg-orange-100 text-orange-800 border-orange-200",
    ManualReview: "bg-red-100 text-red-800 border-red-200",
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">
          Batch Summary
          <span className="ml-2 text-xs font-normal text-gray-400">
            ID: {response.batchId}
          </span>
        </p>
        <Badge variant="outline" className="text-xs">
          {response.totalProcessed} parcels processed
        </Badge>
      </div>

      <Separator />

      {/* Department breakdown */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(byDept).map(([dept, count]) => (
          <div
            key={dept}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${DEPT_COLORS[dept] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}
          >
            <span>{dept}</span>
            <span className="font-bold">{count}</span>
          </div>
        ))}

        {insuranceCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium bg-amber-100 text-amber-800 border-amber-200">
            <ShieldCheck className="h-3 w-3" />
            <span>Insurance required</span>
            <span className="font-bold">{insuranceCount}</span>
          </div>
        )}
      </div>

      {/* Parse errors */}
      {response.parseErrors.length > 0 && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-3.5 w-3.5" />
          <AlertDescription className="text-xs">
            <span className="font-semibold">{response.parseErrors.length} parse warning(s):</span>{" "}
            {response.parseErrors.slice(0, 2).join(" · ")}
            {response.parseErrors.length > 2 && ` · +${response.parseErrors.length - 2} more`}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BatchUpload() {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [response, setResponse] = useState<BatchResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File selection logic ──

  const handleFileSelect = useCallback((file: File) => {
    const validationError = isValidFile(file);
    if (validationError) {
      setFileError(validationError);
      setSelectedFile(null);
      return;
    }
    setFileError(null);
    setSelectedFile(file);
    setResponse(null);
    setUploadError(null);
    setUploadState("idle");
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setFileError(null);
    setUploadError(null);
    setResponse(null);
    setUploadState("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Drag and drop ──

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setUploadState("dragging");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setUploadState("idle");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setUploadState("idle");
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  // ── Upload ──

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadState("uploading");
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/batch", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? `Server error (${res.status})`);
      }

      setResponse(data);
      setUploadState("success");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      setUploadState("error");
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Drop zone ── */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload batch file — click or drag and drop"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && !selectedFile && fileInputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center gap-3
          rounded-xl border-2 border-dashed px-6 py-10
          transition-colors duration-150 cursor-pointer
          ${uploadState === "dragging"
            ? "border-blue-400 bg-blue-50"
            : selectedFile
            ? "border-gray-300 bg-gray-50 cursor-default"
            : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xml,.json"
          onChange={handleInputChange}
          className="sr-only"
          aria-hidden="true"
        />

        {selectedFile ? (
          // ── File selected state ──
          <div className="flex items-start gap-3 w-full max-w-sm">
            <FileText className="h-9 w-9 text-gray-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatFileSize(selectedFile.size)} ·{" "}
                {selectedFile.name.split(".").pop()?.toUpperCase()}
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleClearFile(); }}
              className="shrink-0 rounded-full p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
              aria-label="Remove selected file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          // ── Empty / dragging state ──
          <>
            <div className={`rounded-full p-3 ${uploadState === "dragging" ? "bg-blue-100" : "bg-gray-100"}`}>
              <UploadCloud className={`h-6 w-6 ${uploadState === "dragging" ? "text-blue-500" : "text-gray-400"}`} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">
                {uploadState === "dragging"
                  ? "Drop your file here"
                  : "Drag & drop or click to upload"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Supports .xml and .json · Max {MAX_FILE_SIZE_MB}MB
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── File validation error ── */}
      {fileError && (
        <Alert variant="destructive" className="py-2.5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{fileError}</AlertDescription>
        </Alert>
      )}

      {/* ── Upload error ── */}
      {uploadError && (
        <Alert variant="destructive" className="py-2.5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{uploadError}</AlertDescription>
        </Alert>
      )}

      {/* ── Upload button ── */}
      {selectedFile && uploadState !== "success" && (
        <Button
          onClick={handleUpload}
          disabled={uploadState === "uploading"}
          className="w-full gap-2"
        >
          {uploadState === "uploading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing batch…
            </>
          ) : (
            <>
              <UploadCloud className="h-4 w-4" />
              Route {selectedFile.name}
            </>
          )}
        </Button>
      )}

      {/* ── Success results ── */}
      {uploadState === "success" && response && (
        <div className="space-y-4">

          {/* Success banner */}
          <Alert className="border-green-200 bg-green-50 text-green-800 py-2.5">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-sm font-medium">
              Batch processed successfully — {response.totalProcessed} parcels routed.
            </AlertDescription>
          </Alert>

          {/* Summary stats */}
          <SummaryStats response={response} />

          {/* Export + process another */}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => exportToCsv(response.results, response.batchId)}
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFile}
              className="text-gray-500"
            >
              Process another file
            </Button>
          </div>

          {/* Results table */}
          <ResultsTable results={response.results} />
        </div>
      )}
    </div>
  );
}