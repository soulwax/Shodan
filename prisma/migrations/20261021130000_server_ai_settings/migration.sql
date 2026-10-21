ALTER TABLE "DndServer"
  ADD COLUMN "aiTemperature" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  ADD COLUMN "aiMaxTokens" INTEGER,
  ADD COLUMN "aiReasoningEffort" TEXT NOT NULL DEFAULT 'low';

ALTER TABLE "DndServer"
  ADD CONSTRAINT "DndServer_aiTemperature_range"
    CHECK ("aiTemperature" >= 0 AND "aiTemperature" <= 2),
  ADD CONSTRAINT "DndServer_aiMaxTokens_range"
    CHECK ("aiMaxTokens" IS NULL OR ("aiMaxTokens" >= 64 AND "aiMaxTokens" <= 16384)),
  ADD CONSTRAINT "DndServer_aiReasoningEffort_value"
    CHECK ("aiReasoningEffort" IN ('none', 'low', 'medium', 'high', 'xhigh', 'max'));
