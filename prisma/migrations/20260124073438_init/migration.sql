-- AlterEnum
ALTER TYPE "CoinLedgerSource" ADD VALUE 'DAILY_LOGIN';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "currentLoginStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastLoginRewardDate" TIMESTAMP(3),
ADD COLUMN     "longestLoginStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalLoginDays" INTEGER NOT NULL DEFAULT 0;
