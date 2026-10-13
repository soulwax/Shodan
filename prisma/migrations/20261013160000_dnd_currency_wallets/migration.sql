CREATE TYPE "DndCurrency" AS ENUM ('CP', 'SP', 'GP', 'EL', 'PC');

ALTER TABLE "DndWallet"
  ADD COLUMN "copperCp" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "silverSp" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "electrumEl" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "platinumPc" BIGINT NOT NULL DEFAULT 0;

ALTER TABLE "DndTransaction"
  RENAME COLUMN "amountGp" TO "amount";
ALTER TABLE "DndTransaction"
  RENAME COLUMN "balanceAfterGp" TO "balanceAfter";
ALTER TABLE "DndTransaction"
  ADD COLUMN "currency" "DndCurrency" NOT NULL DEFAULT 'GP';
