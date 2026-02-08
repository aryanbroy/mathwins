import { getActiveGameConfig } from '../controller/admin/editconfig.controller';
import { leaderboard } from '../controller/solo.controller';
import { Prisma } from '../generated/prisma';
import prisma from '../prisma';
import { ApiError } from '../utils/api/ApiError';
import { CLAIM_STATUS_MAP } from '../utils/user.util';

function normalizeToMidnight(
  date: Date,
  timezone: string = 'Asia/Kolkata'
): Date {
  const dateStr = date.toLocaleDateString('en-CA', { timeZone: timezone });
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export const postClaimRequestHandler = async (
  tx: Prisma.TransactionClient,
  userId: string
) => {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { coins: true },
  });
  if (!user) {
    throw new ApiError({
      statusCode: 404,
      message: 'User not authorized',
    });
  }

  const activeConfig = await prisma.gameConfig.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (!activeConfig) {
    throw new ApiError({
      statusCode: 404,
      message: 'No active game config found',
    });
  }
  const redeem_threshold_coins = (activeConfig?.rewards as any)?.redeem_threshold_coins;
  if (user.coins < redeem_threshold_coins)  {
    throw new ApiError({
      statusCode: 400,
      message: 'Not eligible to claim reward',
    });
  }

  try {
    const claim = await tx.rewardClaim.create({
      data: {
        userId,
        status: 'PENDING',
        coinsLocked: redeem_threshold_coins,
      },
    });

    tx.user.update({
      where: { id: userId },
      data: { coins: { decrement: redeem_threshold_coins} },
    });

    await tx.coinLedger.create({
      data: {
        userId,
        date: new Date(),
        delta: -(redeem_threshold_coins),
        source: 'REWARD_LOCK',
        referenceId: claim.id,
      },
    });

    return { claim };
  } catch (e) {
    throw new ApiError({
      statusCode: 409,
      message: 'Claim already exists',
    });
  }
};

type BaseHistory = {
  id: string;
  status: string;
  coinsLocked: number;
  createdAt: Date;
};

type FulfilledHistory = {
  id: string;
  status: string;
  coinsLocked: number;
  createdAt: Date;
  voucherCode: string;
  adminNotes: string;
};

type RejectedHistory = {
  id: string;
  status: string;
  coinsLocked: number;
  createdAt: Date;
  rejectionReason: string;
  adminNotes: string;
};

export type ClaimHistory = BaseHistory | FulfilledHistory | RejectedHistory;

export const listRewardClaimsHandler = async (
  userId: string
): Promise<ClaimHistory[]> => {
  const claimHistory = await prisma.rewardClaim.findMany({
    where: { userId },
    select: {
      status: true,
      coinsLocked: true,
      voucherCode: true,
      rejectionReason: true,
      adminNotes: true,
      createdAt: true,
      id: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const history: ClaimHistory[] = claimHistory.map((claim) => {
    if (claim.status === 'PENDING') {
      return {
        id: claim.id,
        status: CLAIM_STATUS_MAP[claim.status],
        coinsLocked: claim.coinsLocked,
        createdAt: claim.createdAt,
      };
    } else if (claim.status === 'FULFILLED') {
      return {
        id: claim.id,
        status: CLAIM_STATUS_MAP[claim.status],
        coinsLocked: claim.coinsLocked,
        createdAt: claim.createdAt,
        voucherCode: claim.voucherCode!,
        adminNotes: claim.adminNotes,
      };
    } else if (claim.status === 'REJECTED') {
      return {
        id: claim.id,
        status: CLAIM_STATUS_MAP[claim.status],
        coinsLocked: claim.coinsLocked,
        createdAt: claim.createdAt,
        rejectionReason: claim.rejectionReason!,
        adminNotes: claim.adminNotes,
      };
    }

    return {
      id: claim.id,
      status: CLAIM_STATUS_MAP[claim.status] || claim.status,
      coinsLocked: claim.coinsLocked,
      createdAt: claim.createdAt,
    };
  });

  return history;
};

const hasClaimedToday = async (
  userId: string,
  today: Date
): Promise<boolean> => {
  // const now = new Date();
  // const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  // const todayStart = new Date(today);
  //
  // const todayEnd = new Date(todayStart);
  // todayEnd.setHours(23, 59, 59, 999);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastLoginRewardDate: true },
  });

  if (!user?.lastLoginRewardDate) return false;

  const lastClaim = normalizeToMidnight(user.lastLoginRewardDate);
  return lastClaim.getTime() === today.getTime();
};

const calculateRewardInfo = async (userId: string, today: Date) => {
  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: {
      currentLoginStreak: true,
      lastLoginRewardDate: true,
      longestLoginStreak: true,
    },
  });
  if (!user) {
    throw new ApiError({ statusCode: 400, message: 'User not found' });
  }

  let newStreak = 1;
  let streakBroken = false;

  if (user.lastLoginRewardDate) {
    const lastClaim = normalizeToMidnight(user.lastLoginRewardDate);
    const daySince = daysBetween(lastClaim, today);
    console.log('Days since: ', daySince);

    if (daySince === 1) {
      newStreak = user.currentLoginStreak + 1;
    } else if (daySince > 1) {
      newStreak = 1;
      streakBroken = true;
    } else if (daySince === 0) {
      throw new ApiError({
        statusCode: 409,
        message: 'reward already claimed',
      });
    }
  }

  const pointsToAward = 10; // import this from game config later

  return {
    newStreak,
    streakBroken,
    longestStreak: Math.max(user.longestLoginStreak, newStreak),
    pointsToAward,
  };
};

export const dailyClaimHandler = async (userId: string) => {
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  );
  const alreadyClaimed = await hasClaimedToday(userId, today);
  if (alreadyClaimed) {
    throw new ApiError({
      statusCode: 409,
      message: 'daily reward already claimed',
    });
  }

  const rewardInfo = await calculateRewardInfo(userId, today);

  const result = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        currentLoginStreak: rewardInfo.newStreak,
        longestLoginStreak: rewardInfo.longestStreak,
        lastLoginRewardDate: today,
        totalLoginDays: { increment: 1 },
      },
    });

    const leaderboardEntry = await tx.dailyUserLeaderboard.upsert({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      update: {
        // Add daily login coin points to existing total
        totalCoinPoints: {
          increment: rewardInfo.pointsToAward,
        },
        isEligible: true,
      },
      create: {
        userId,
        date: today,
        dailyCoinPoints: 0,
        instantCoinPoints: new Prisma.Decimal(0),
        totalCoinPoints: new Prisma.Decimal(rewardInfo.pointsToAward),
        isEligible: true,
        rank: 0,
      },
    });

    return {
      leaderboardEntry,
      rewardInfo,
    };
  });

  return result;
};
