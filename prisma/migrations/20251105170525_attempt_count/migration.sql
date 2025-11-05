/*
  Warnings:

  - You are about to drop the column `attemptNumber` on the `DailyTournamentSession` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[date]` on the table `DailyTournament` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "DailyTournamentSession" DROP COLUMN "attemptNumber";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dailyAttemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "instantAttemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "soloAttemptCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "DailyTournament_date_key" ON "DailyTournament"("date");
