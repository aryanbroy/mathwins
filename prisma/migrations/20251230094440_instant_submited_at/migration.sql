/*
  Warnings:

  - Added the required column `coinPoints` to the `InstantLeaderboard` table without a default value. This is not possible if the table is not empty.
  - Added the required column `submittedAt` to the `InstantLeaderboard` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CoinLedger" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "DailyLeaderboard" ADD COLUMN     "coinPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rank" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "InstantLeaderboard" ADD COLUMN     "coinPoints" DECIMAL(4,2) NOT NULL,
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "rank" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "submittedAt" TIMESTAMP(3) NOT NULL;
