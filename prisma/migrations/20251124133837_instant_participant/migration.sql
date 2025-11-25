-- CreateTable
CREATE TABLE "InstantParticipant" (
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joinOrder" INTEGER NOT NULL,
    "sessionStarted" BOOLEAN NOT NULL DEFAULT false,
    "finalScore" INTEGER,
    "submittedAt" TIMESTAMP(3),
    "finalRank" INTEGER,

    CONSTRAINT "InstantParticipant_pkey" PRIMARY KEY ("tournamentId","userId")
);

-- CreateIndex
CREATE INDEX "InstantParticipant_userId_joinedAt_idx" ON "InstantParticipant"("userId", "joinedAt");

-- CreateIndex
CREATE UNIQUE INDEX "InstantParticipant_tournamentId_userId_key" ON "InstantParticipant"("tournamentId", "userId");

-- AddForeignKey
ALTER TABLE "InstantParticipant" ADD CONSTRAINT "InstantParticipant_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "InstantTournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstantParticipant" ADD CONSTRAINT "InstantParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
