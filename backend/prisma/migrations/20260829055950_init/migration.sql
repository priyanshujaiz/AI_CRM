-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "country_code" TEXT NOT NULL DEFAULT '',
    "mobile_without_country_code" TEXT NOT NULL DEFAULT '',
    "company" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT '',
    "lead_owner" TEXT NOT NULL DEFAULT '',
    "crm_status" TEXT NOT NULL DEFAULT 'EMPTY_STRING',
    "crm_note" TEXT NOT NULL DEFAULT '',
    "data_source" TEXT NOT NULL DEFAULT 'EMPTY_STRING',
    "possession_time" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ImportJob" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "total_imported" INTEGER NOT NULL DEFAULT 0,
    "total_skipped" INTEGER NOT NULL DEFAULT 0,
    "skipped" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Lead_jobId_idx" ON "Lead"("jobId");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "Lead_crm_status_idx" ON "Lead"("crm_status");

-- CreateIndex
CREATE INDEX "Lead_data_source_idx" ON "Lead"("data_source");
