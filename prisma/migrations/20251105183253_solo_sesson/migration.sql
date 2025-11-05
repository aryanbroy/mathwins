/*
  Warnings:

  - The `status` column on the `SoloSession` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterEnum
ALTER TYPE "LifelineType" ADD VALUE 'LEVEL_DOWN';

-- AlterTable
ALTER TABLE "SoloSession" DROP COLUMN "status",
ADD COLUMN     "status" "UserTournamentStatus" NOT NULL DEFAULT 'NOT_OPENED';
