import prisma from '../prisma';

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

export const assignInstantCoinPoints = async (tournamentStartDate: Date) => {};

export const assignSoloCoinPoints = async (tournamentStartDate: Date) => {};
