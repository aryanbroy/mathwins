-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AvatarType" AS ENUM ('DEFAULT', 'UPLOADED');

-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCREMENT', 'DECREMENT');

-- CreateEnum
CREATE TYPE "TransactionDescription" AS ENUM ('SINGLE_PLAYER', 'DAILY_TOURNAMENT', 'INSTANT_TOURNAMENT', 'REFERAL_POINT', 'REWARD_CLAIM');

-- CreateEnum
CREATE TYPE "UserTournamentStatus" AS ENUM ('NOT_OPENED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('NOT_OPENED', 'OPEN', 'CLOSED', 'FULL', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "phoneNumber" TEXT,
    "googleId" TEXT,
    "email" TEXT,
    "deviceHash" TEXT,
    "username" TEXT NOT NULL,
    "usernameReservedAt" TIMESTAMP(3),
    "avatarType" "AvatarType" NOT NULL DEFAULT 'DEFAULT',
    "profilePictureUrl" TEXT,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "lifetimeCoins" INTEGER NOT NULL DEFAULT 0,
    "lifetimeCoinPoints" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "theme" "Theme" NOT NULL DEFAULT 'SYSTEM',
    "soundEnabled" BOOLEAN NOT NULL DEFAULT true,
    "hapticsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "language" TEXT NOT NULL DEFAULT 'en',
    "referralCode" TEXT,
    "referredById" TEXT,
    "referralRewarded" BOOLEAN NOT NULL DEFAULT false,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "soloAttemptCount" INTEGER NOT NULL DEFAULT 0,
    "instantAttemptCount" INTEGER NOT NULL DEFAULT 0,
    "dailyAttemptCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyTournament" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "TournamentStatus" NOT NULL DEFAULT 'OPEN',
    "configVersion" TEXT,
    "minute1" JSONB NOT NULL DEFAULT '[]',
    "minute2" JSONB NOT NULL DEFAULT '[]',
    "minute3" JSONB NOT NULL DEFAULT '[]',
    "minute4" JSONB NOT NULL DEFAULT '[]',
    "final" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "DailyTournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyTournamentSession" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "sessionSeed" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "status" "UserTournamentStatus" NOT NULL DEFAULT 'NOT_OPENED',
    "currentScore" INTEGER NOT NULL DEFAULT 0,
    "finalScore" INTEGER,
    "bestScore" INTEGER NOT NULL DEFAULT 0,
    "minute1Score" INTEGER,
    "minute2Score" INTEGER,
    "minute3Score" INTEGER,
    "minute4Score" INTEGER,
    "isFreeAttempt" BOOLEAN NOT NULL DEFAULT true,
    "isRewardedAttempt" BOOLEAN NOT NULL DEFAULT false,
    "currentLevel" INTEGER NOT NULL DEFAULT 1,
    "questionsAnswered" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailyTournamentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoloSession" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "sessionSeed" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "status" "UserTournamentStatus" NOT NULL DEFAULT 'NOT_OPENED',
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "bankedPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalScore" DOUBLE PRECISION,
    "coinPointsEarned" INTEGER NOT NULL DEFAULT 0,
    "isFreeAttempt" BOOLEAN NOT NULL DEFAULT true,
    "currentLevel" INTEGER NOT NULL DEFAULT 1,
    "questionsAnswered" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "madeMistake" BOOLEAN NOT NULL DEFAULT false,
    "quitEarly" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SoloSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionAttempt" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "questionIndex" SERIAL NOT NULL,
    "level" INTEGER NOT NULL,
    "expression" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "kthDigit" INTEGER NOT NULL,
    "correctDigit" INTEGER NOT NULL,
    "dailySessionId" TEXT,
    "soloSessionId" TEXT,

    CONSTRAINT "QuestionAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_phoneNumber_idx" ON "User"("phoneNumber");

-- CreateIndex
CREATE INDEX "User_googleId_idx" ON "User"("googleId");

-- CreateIndex
CREATE INDEX "User_referralCode_idx" ON "User"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "DailyTournament_date_key" ON "DailyTournament"("date");

-- CreateIndex
CREATE INDEX "DailyTournament_date_idx" ON "DailyTournament"("date");

-- CreateIndex
CREATE INDEX "DailyTournament_status_idx" ON "DailyTournament"("status");

-- CreateIndex
CREATE INDEX "DailyTournamentSession_userId_tournamentId_idx" ON "DailyTournamentSession"("userId", "tournamentId");

-- CreateIndex
CREATE INDEX "DailyTournamentSession_userId_idx" ON "DailyTournamentSession"("userId");

-- CreateIndex
CREATE INDEX "DailyTournamentSession_tournamentId_idx" ON "DailyTournamentSession"("tournamentId");

-- CreateIndex
CREATE INDEX "SoloSession_userId_date_idx" ON "SoloSession"("userId", "date");

-- CreateIndex
CREATE INDEX "SoloSession_userId_idx" ON "SoloSession"("userId");

-- CreateIndex
CREATE INDEX "QuestionAttempt_dailySessionId_idx" ON "QuestionAttempt"("dailySessionId");

-- CreateIndex
CREATE INDEX "QuestionAttempt_soloSessionId_idx" ON "QuestionAttempt"("soloSessionId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTournamentSession" ADD CONSTRAINT "DailyTournamentSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTournamentSession" ADD CONSTRAINT "DailyTournamentSession_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "DailyTournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoloSession" ADD CONSTRAINT "SoloSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionAttempt" ADD CONSTRAINT "QuestionAttempt_dailySessionId_fkey" FOREIGN KEY ("dailySessionId") REFERENCES "DailyTournamentSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionAttempt" ADD CONSTRAINT "QuestionAttempt_soloSessionId_fkey" FOREIGN KEY ("soloSessionId") REFERENCES "SoloSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
