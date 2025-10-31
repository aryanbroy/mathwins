/*
  Warnings:

  - Added the required column `submitedAt` to the `DailyTournamentAttempt` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `difficulty` on the `Question` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "DailyTournamentAttempt" ADD COLUMN     "submitedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "score" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "difficulty",
ADD COLUMN     "difficulty" INTEGER NOT NULL;

-- DropEnum
DROP TYPE "public"."Difficulty";
