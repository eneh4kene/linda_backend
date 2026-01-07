-- AlterTable: Add enhanced scheduling fields to Resident table
ALTER TABLE "Resident" ADD COLUMN "targetCallsPerWeek" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "Resident" ADD COLUMN "minDaysBetweenCalls" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "Resident" ADD COLUMN "maxDaysBetweenCalls" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "Resident" ADD COLUMN "callStatus" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "Resident" ADD COLUMN "callPauseReason" TEXT;
ALTER TABLE "Resident" ADD COLUMN "callPausedAt" TIMESTAMP(3);
ALTER TABLE "Resident" ADD COLUMN "callPausedUntil" TIMESTAMP(3);
ALTER TABLE "Resident" ADD COLUMN "lastOutboundCallDate" TIMESTAMP(3);
ALTER TABLE "Resident" ADD COLUMN "lastInboundCallDate" TIMESTAMP(3);
ALTER TABLE "Resident" ADD COLUMN "nextSuggestedCallDate" TIMESTAMP(3);
ALTER TABLE "Resident" ADD COLUMN "unavailableUntil" TIMESTAMP(3);
ALTER TABLE "Resident" ADD COLUMN "unavailabilityReason" TEXT;

-- CreateIndex: Add index for callStatus and nextSuggestedCallDate
CREATE INDEX "Resident_callStatus_nextSuggestedCallDate_idx" ON "Resident"("callStatus", "nextSuggestedCallDate");
