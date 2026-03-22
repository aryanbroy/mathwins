/*
  Warnings:

  - Added the required column `coinPoints` to the `InstantLeaderboard` table without a default value. This is not possible if the table is not empty.
  - Added the required column `submittedAt` to the `InstantLeaderboard` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "CoinLedgerSource" ADD VALUE 'DAILY_LOGIN';

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

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "currentLoginStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastLoginRewardDate" TIMESTAMP(3),
ADD COLUMN     "longestLoginStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalLoginDays" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "DailyUserLeaderboard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dailyCoinPoints" INTEGER NOT NULL DEFAULT 0,
    "instantCoinPoints" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalCoinPoints" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "isEligible" BOOLEAN NOT NULL DEFAULT false,
    "coinsAwarded" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyUserLeaderboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameConfig" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "daily_tournament" JSONB NOT NULL,
    "instant_tournament" JSONB NOT NULL,
    "single_player" JSONB NOT NULL,
    "leveling" JSONB NOT NULL,
    "base_points_by_level" JSONB NOT NULL,
    "scoring" JSONB NOT NULL,
    "points_distribution" JSONB NOT NULL,
    "caps" JSONB NOT NULL,
    "ad_units" JSONB NOT NULL,
    "lifelines" JSONB NOT NULL,
    "top_attempts" JSONB NOT NULL,
    "feature_flags" JSONB NOT NULL,
    "safety" JSONB NOT NULL,
    "referrals" JSONB NOT NULL,
    "rewards" JSONB NOT NULL,
    "cron" JSONB NOT NULL,
    "analytics" JSONB NOT NULL,
    "leaderboard" JSONB NOT NULL,
    "qa" JSONB NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GameConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyUserLeaderboard_date_rank_idx" ON "DailyUserLeaderboard"("date", "rank");

-- CreateIndex
CREATE INDEX "DailyUserLeaderboard_date_isEligible_rank_idx" ON "DailyUserLeaderboard"("date", "isEligible", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "DailyUserLeaderboard_userId_date_key" ON "DailyUserLeaderboard"("userId", "date");

-- AddForeignKey
ALTER TABLE "DailyUserLeaderboard" ADD CONSTRAINT "DailyUserLeaderboard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
