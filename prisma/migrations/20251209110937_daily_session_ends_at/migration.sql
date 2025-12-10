/*
  Warnings:

  - Added the required column `endsAt` to the `DailyTournamentSession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DailyTournamentSession" ADD COLUMN     "endsAt" TIMESTAMP(3) NOT NULL;
