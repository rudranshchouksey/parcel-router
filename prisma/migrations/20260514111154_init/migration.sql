-- CreateTable
CREATE TABLE "RoutingRecord" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weight" DOUBLE PRECISION NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "destinationCountry" TEXT,
    "recipientName" TEXT,
    "batchId" TEXT,
    "department" TEXT NOT NULL,
    "requiresInsurance" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT NOT NULL,
    "appliedRuleLabel" TEXT NOT NULL,
    "flags" TEXT[],
    "source" TEXT NOT NULL,
    "processingMs" INTEGER,

    CONSTRAINT "RoutingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchJob" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filename" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "successCount" INTEGER NOT NULL,
    "errorCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "BatchJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoutingRecord_createdAt_idx" ON "RoutingRecord"("createdAt");

-- CreateIndex
CREATE INDEX "RoutingRecord_department_idx" ON "RoutingRecord"("department");

-- CreateIndex
CREATE INDEX "RoutingRecord_batchId_idx" ON "RoutingRecord"("batchId");

-- CreateIndex
CREATE INDEX "BatchJob_createdAt_idx" ON "BatchJob"("createdAt");
