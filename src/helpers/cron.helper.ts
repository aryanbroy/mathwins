import { Prisma } from '../generated/prisma';
import prisma from '../prisma';
import { ApiError } from '../utils/api/ApiError';

export const assigndailyCoinPoints = async (tournamentStartDate: Date) => {
  // assign ranks
  await prisma.$executeRaw`
    WITH ranked AS (
        SELECT id,
              ROW_NUMBER() OVER (ORDER BY "bestScore" DESC) AS rn
        FROM "DailyLeaderboard"
        WHERE "date" = ${tournamentStartDate}
      )
      UPDATE "DailyLeaderboard" d
      SET "rank" = r.rn
      FROM ranked r
      WHERE d.id = r.id;
  `;

  // initial coin points assign
  await prisma.$executeRaw`
    WITH ranked AS (
      SELECT 
        id,
        PERCENT_RANK() OVER (ORDER BY "bestScore" DESC) AS pct
      FROM "DailyLeaderboard"
      WHERE "date" = ${tournamentStartDate}
    )
    UPDATE "DailyLeaderboard" d
    SET "coinPoints" =
      CASE
        WHEN r.pct <= 0.01 THEN 30
        WHEN r.pct <= 0.02 THEN 20
        WHEN r.pct <= 0.03 THEN 15
        WHEN r.pct <= 0.10 THEN 10
        WHEN r.pct <= 0.20 THEN 9
        WHEN r.pct <= 0.50 THEN 9
        WHEN r.pct <= 0.80 THEN 8
        ELSE 0
      END
    FROM ranked r
    WHERE d.id = r.id;
  `;

  // recalculate for users >= 5 coin points
  await prisma.$executeRaw`
    WITH eligible AS (
      SELECT id, "bestScore"
      FROM "DailyLeaderboard"
      WHERE "date" = ${tournamentStartDate} AND "coinPoints" >= 5
    ),
    ranked AS (
      SELECT 
        id,
        PERCENT_RANK() OVER (ORDER BY "bestScore" DESC) AS pct
      FROM eligible
    )
    UPDATE "DailyLeaderboard" d
    SET "coinPoints" =
      CASE
        WHEN r.pct <= 0.01 THEN 30
        WHEN r.pct <= 0.02 THEN 20
        WHEN r.pct <= 0.03 THEN 15
        WHEN r.pct <= 0.10 THEN 10
        WHEN r.pct <= 0.20 THEN 9
        WHEN r.pct <= 0.50 THEN 9
        WHEN r.pct <= 0.80 THEN 8
        ELSE 0
      END
    FROM ranked r
    WHERE d.id = r.id;
  `;

  // ensure users with < 5 coin points don't receive any coin points
  await prisma.$executeRaw`
    UPDATE "DailyLeaderboard"
    SET "coinPoints" = 0
    WHERE "date" = ${tournamentStartDate} AND "coinPoints" < 5;
  `;
};

// this will run after each instant tournament ends (i.e, after 20 mins)
export const assignInstantCoinPointsHandler = async (tournamentId: string) => {
  const now = new Date();
  const tournament = await prisma.instantTournament.findUnique({
    where: {
      id: tournamentId,
      // expiresAt: {
      //   lt: now,
      // },
    },
    select: { status: true },
  });
  if (!tournament || tournament.status !== 'CLOSED') {
    throw new ApiError({ statusCode: 400, message: 'invalid instant room' });
  }

  const results = await prisma.$queryRaw<
    { userId: string; rank: number; coinPoints: string }[]
  >`
  WITH room AS (
    SELECT 
      id,
      "userId",
      "bestScore",
      "submittedAt",
      ROW_NUMBER() OVER (
        ORDER BY "bestScore" DESC, "submittedAt" ASC
      ) AS rn,
      COUNT(*) OVER() AS total
    FROM "InstantLeaderboard"
    WHERE "tournamentId" = ${tournamentId}
  ),
  ranked AS (
    SELECT 
      id,
      "userId",
      rn,
      total,
      CASE
        WHEN total >= 50 AND (rn::float / total) <= 0.01 THEN 5.0
        WHEN total >= 50 AND (rn::float / total) <= 0.03 THEN 3.0
        WHEN total >= 50 AND (rn::float / total) <= 0.05 THEN 2.0
        WHEN total >= 50 AND (rn::float / total) <= 0.10 THEN 1.5
        WHEN total >= 50 AND (rn::float / total) <= 0.45 THEN 1.0
        WHEN total >= 50 THEN 0.0
        
        WHEN total < 50 AND rn = 1 THEN 5.0
        WHEN total < 50 AND rn = 2 THEN 3.0
        WHEN total < 50 AND rn = 3 THEN 2.0
        WHEN total < 50 AND rn BETWEEN 4 AND 10 THEN 1.0
        ELSE 0.0
      END AS cp
    FROM room
  )
  UPDATE "InstantLeaderboard" d
  SET 
    "rank" = r.rn,
    "coinPoints" = r.cp
  FROM ranked r
  WHERE d.id = r.id
  RETURNING d."userId", d."rank", d."coinPoints";
  `;

  console.table(results);
  return results;
};

const aggregateCoinPoints = async (tournamentStartDate: Date) => {
  const [dailyPlayers, instantPlayers] = await Promise.all([
    prisma.dailyLeaderboard.findMany({
      where: { date: tournamentStartDate },
      select: { userId: true, coinPoints: true },
    }),

    prisma.instantLeaderboard.findMany({
      where: { date: tournamentStartDate },
      select: { userId: true, coinPoints: true },
    }),
  ]);

  const allUserIds = new Set([
    ...dailyPlayers.map((player) => player.userId),
    ...instantPlayers.map((player) => player.userId),
  ]);

  console.log(`Processing ${allUserIds.size} users`);

  const userAggregations = await Promise.all([
    Array.from(allUserIds).map(async (userId) => {
      const dailyPoints =
        dailyPlayers.find((p) => p.userId === userId)?.coinPoints || 0;

      const instantEntries = instantPlayers
        .filter((p) => p.userId === userId)
        .sort((a, b) => Number(b.coinPoints) - Number(a.coinPoints))
        .slice(0, 10);
      const instantPoints = instantEntries.reduce(
        (sum, e) => sum.plus(e.coinPoints),
        new Prisma.Decimal(0)
      );

      const totalPoints = dailyPoints + instantPoints.toNumber();

      return {
        userId: userId,
        dailyPoints: dailyPoints,
        instantPoints: instantPoints,
        totalPoints: totalPoints,
        isEligible: totalPoints >= 5,
      };
    }),
  ]);

  // tomorrow: add dailyUserLeaderboard
};

// export const assignSoloCoinPoints = async (tournamentStartDate: Date) => {};
