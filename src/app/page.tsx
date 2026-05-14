// src/app/page.tsx

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ParcelForm } from "@/components/ParcelForm";
import { BatchUpload } from "@/components/BatchUpload";
import { AuditLog } from "@/components/AuditLog";
import { Package, UploadCloud, ClipboardList } from "lucide-react";

// ─── Static stat cards ────────────────────────────────────────────────────────

const DEPARTMENTS = [
  {
    label: "Mail Department",
    rule: "Up to 1 kg",
    color: "border-blue-200 bg-blue-50",
    dot: "bg-blue-400",
    textColor: "text-blue-800",
  },
  {
    label: "Regular Department",
    rule: "1 kg – 10 kg",
    color: "border-green-200 bg-green-50",
    dot: "bg-green-400",
    textColor: "text-green-800",
  },
  {
    label: "Heavy Department",
    rule: "Over 10 kg",
    color: "border-orange-200 bg-orange-50",
    dot: "bg-orange-400",
    textColor: "text-orange-800",
  },
  {
    label: "Insurance Required",
    rule: "Value over €1,000",
    color: "border-amber-200 bg-amber-50",
    dot: "bg-amber-400",
    textColor: "text-amber-800",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="space-y-8">

      {/* ── Page header ── */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">
          Parcel Routing
        </h1>
        <p className="text-sm text-gray-500">
          Route individual parcels or upload a batch file to assign parcels
          to the correct department automatically.
        </p>
      </div>

      {/* ── Routing rules reference ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
          Active Routing Rules
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {DEPARTMENTS.map((dept) => (
            <div
              key={dept.label}
              className={`rounded-lg border px-3 py-2.5 ${dept.color}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`h-2 w-2 rounded-full shrink-0 ${dept.dot}`} />
                <p className={`text-xs font-semibold ${dept.textColor}`}>
                  {dept.label}
                </p>
              </div>
              <p className="text-xs text-gray-500 pl-3.5">{dept.rule}</p>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* ── Main tabs ── */}
      <Tabs defaultValue="single" className="space-y-6">

        <TabsList className="grid grid-cols-3 w-full sm:w-auto sm:inline-grid sm:grid-cols-3 h-9">
          <TabsTrigger value="single" className="gap-1.5 text-sm">
            <Package className="h-3.5 w-3.5" />
            <span>Single Parcel</span>
          </TabsTrigger>
          <TabsTrigger value="batch" className="gap-1.5 text-sm">
            <UploadCloud className="h-3.5 w-3.5" />
            <span>Batch Upload</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5 text-sm">
            <ClipboardList className="h-3.5 w-3.5" />
            <span>Audit Log</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Single parcel tab ── */}
        <TabsContent value="single">
          <div className="max-w-xl space-y-2">
            <div className="space-y-0.5">
              <h2 className="text-sm font-semibold text-gray-800">
                Route a Single Parcel
              </h2>
              <p className="text-xs text-gray-400">
                Enter the parcel details below. The system will instantly
                assign it to the correct department.
              </p>
            </div>
            <div className="pt-2">
              <ParcelForm />
            </div>
          </div>
        </TabsContent>

        {/* ── Batch upload tab ── */}
        <TabsContent value="batch">
          <div className="space-y-2">
            <div className="space-y-0.5">
              <h2 className="text-sm font-semibold text-gray-800">
                Upload Batch File
              </h2>
              <p className="text-xs text-gray-400">
                Upload an <code className="font-mono bg-gray-100 px-1 rounded">.xml</code> or{" "}
                <code className="font-mono bg-gray-100 px-1 rounded">.json</code> file
                containing multiple parcels. All parcels will be routed and
                results shown in a sortable table. Maximum file size: 10 MB.
              </p>
            </div>
            <div className="pt-2">
              <BatchUpload />
            </div>
          </div>
        </TabsContent>

        {/* ── Audit log tab ── */}
        <TabsContent value="audit">
          <AuditLog />
        </TabsContent>

      </Tabs>
    </div>
  );
}