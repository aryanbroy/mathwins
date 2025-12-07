-- CreateTable
CREATE TABLE "SoloLeaderboard" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "userId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "rank" INTEGER NOT NULL,
    "percentile" DOUBLE PRECISION NOT NULL,
    "coinPoints" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SoloLeaderboard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SoloLeaderboard_date_idx" ON "SoloLeaderboard"("date");

-- CreateIndex
CREATE UNIQUE INDEX "SoloLeaderboard_userId_date_key" ON "SoloLeaderboard"("userId", "date");
