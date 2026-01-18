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

-- CreateIndex
CREATE INDEX "DailyUserLeaderboard_date_rank_idx" ON "DailyUserLeaderboard"("date", "rank");

-- CreateIndex
CREATE INDEX "DailyUserLeaderboard_date_isEligible_rank_idx" ON "DailyUserLeaderboard"("date", "isEligible", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "DailyUserLeaderboard_userId_date_key" ON "DailyUserLeaderboard"("userId", "date");

-- AddForeignKey
ALTER TABLE "DailyUserLeaderboard" ADD CONSTRAINT "DailyUserLeaderboard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
