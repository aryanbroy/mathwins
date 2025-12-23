import { Prisma } from '../generated/prisma';
import prisma from '../prisma';
import { ApiError } from '../utils/api/ApiError';
import { CLAIM_STATUS_MAP } from '../utils/user.util';

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

  // this should come from config: later
  if (user.coins < 5000) {
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
        coinsLocked: 5000, // make coins locked variable later
      },
    });

    tx.user.update({
      where: { id: userId },
      data: { coins: { decrement: 5000 } }, // make this variable later
    });

    await tx.coinLedger.create({
      data: {
        userId,
        date: new Date(),
        delta: -5000, // make this variable too: later
        source: 'REWARD_LOCK',
        referenceId: claim.id,
      },
    });

    return { claim };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      console.log('unique constraint error while claiming reward');
      if (e.code === 'P2002') {
        throw new ApiError({
          statusCode: 409,
          message: 'Claim already exists',
        });
      }
    }
    throw e;
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
};

type RejectedHistory = {
  id: string;
  status: string;
  coinsLocked: number;
  createdAt: Date;
  rejectionReason: string;
};

type ClaimHistory = BaseHistory | FulfilledHistory | RejectedHistory;

export const listRewardClaimsHandler = async (userId: string) => {
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
      };
    } else if (claim.status === 'REJECTED') {
      return {
        id: claim.id,
        status: CLAIM_STATUS_MAP[claim.status],
        coinsLocked: claim.coinsLocked,
        createdAt: claim.createdAt,
        rejectionReason: claim.rejectionReason!,
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
