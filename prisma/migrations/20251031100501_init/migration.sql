/*
  Warnings:

  - You are about to drop the column `extraTime` on the `Lifeline` table. All the data in the column will be lost.
  - You are about to drop the column `fifty` on the `Lifeline` table. All the data in the column will be lost.
  - You are about to drop the column `levelDown` on the `Lifeline` table. All the data in the column will be lost.
  - You are about to drop the column `dailytournamentId` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `instanttournamentId` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `soloId` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the `Dailytournament` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Instanttournament` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Leaderboard` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Solo` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "TournamentStatus" ADD VALUE 'CANCELLED';

-- AlterEnum
ALTER TYPE "TransactionDesciption" ADD VALUE 'REWARD_CLAIM';

-- DropForeignKey
ALTER TABLE "public"."Leaderboard" DROP CONSTRAINT "Leaderboard_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Question" DROP CONSTRAINT "Question_dailytournamentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Question" DROP CONSTRAINT "Question_instanttournamentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Question" DROP CONSTRAINT "Question_soloId_fkey";

-- AlterTable
ALTER TABLE "Lifeline" DROP COLUMN "extraTime",
DROP COLUMN "fifty",
DROP COLUMN "levelDown",
ADD COLUMN     "extraTimeUses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "fiftyUses" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "lastReset" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "levelDownUses" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "dailytournamentId",
DROP COLUMN "instanttournamentId",
DROP COLUMN "soloId";

-- DropTable
DROP TABLE "public"."Dailytournament";

-- DropTable
DROP TABLE "public"."Instanttournament";

-- DropTable
DROP TABLE "public"."Leaderboard";

-- DropTable
DROP TABLE "public"."Solo";

-- CreateTable
CREATE TABLE "SoloAttempt" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "score" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SoloAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyTournamentAttempt" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "score" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyTournamentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstantTournamentSubmission" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "score" BIGINT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstantTournamentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveDailyLeaderboard" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "soloPoints" BIGINT NOT NULL DEFAULT 0,
    "dailyPoints" BIGINT NOT NULL DEFAULT 0,
    "instantPoints" BIGINT NOT NULL DEFAULT 0,
    "totalPoints" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveDailyLeaderboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyUserLeaderboardFinal" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "totalCoinPoints" BIGINT NOT NULL DEFAULT 0,
    "finalRank" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "coinPointsBreakdown" JSONB,

    CONSTRAINT "DailyUserLeaderboardFinal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SoloAttempt_userId_createdAt_idx" ON "SoloAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DailyTournamentAttempt_userId_createdAt_idx" ON "DailyTournamentAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "InstantTournamentSubmission_userId_submittedAt_idx" ON "InstantTournamentSubmission"("userId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LiveDailyLeaderboard_userId_key" ON "LiveDailyLeaderboard"("userId");

-- CreateIndex
CREATE INDEX "LiveDailyLeaderboard_totalPoints_idx" ON "LiveDailyLeaderboard"("totalPoints" DESC);

-- CreateIndex
CREATE INDEX "DailyUserLeaderboardFinal_date_finalRank_idx" ON "DailyUserLeaderboardFinal"("date", "finalRank" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "DailyUserLeaderboardFinal_userId_date_key" ON "DailyUserLeaderboardFinal"("userId", "date");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- AddForeignKey
ALTER TABLE "SoloAttempt" ADD CONSTRAINT "SoloAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTournamentAttempt" ADD CONSTRAINT "DailyTournamentAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstantTournamentSubmission" ADD CONSTRAINT "InstantTournamentSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveDailyLeaderboard" ADD CONSTRAINT "LiveDailyLeaderboard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyUserLeaderboardFinal" ADD CONSTRAINT "DailyUserLeaderboardFinal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
