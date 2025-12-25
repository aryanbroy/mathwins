import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ClaimStatus, Prisma } from '../generated/prisma';
import prisma from '../prisma';
import { CLAIM_STATUS_MAP } from '../utils/user.util';
import { ApiError } from '../utils/api/ApiError';
import { verifyClaim } from '../utils/helper_handler/admin';

type PendingHistory = {
  id: string;
  userId: string;
  status: string;
  coinsLocked: number;
  createdAt: Date;
};

type FulfilledHistory = {
  id: string;
  userId: string;
  status: string;
  coinsLocked: number;
  createdAt: Date;
  voucherCode: string;
  adminNotes: string;
};

type RejectedHistory = {
  id: string;
  userId: string;
  status: string;
  coinsLocked: number;
  createdAt: Date;
  rejectionReason: string;
  adminNotes: string;
};

export type ClaimHistory = PendingHistory | FulfilledHistory | RejectedHistory;

export const listAllClaimsHandler = async (
  status: ClaimStatus
): Promise<ClaimHistory[]> => {
  const claims = await prisma.rewardClaim.findMany({
    where: { status },
    select: {
      status: true,
      coinsLocked: true,
      voucherCode: true,
      rejectionReason: true,
      adminNotes: true,
      createdAt: true,
      id: true,
      userId: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  const history: ClaimHistory[] = claims.map((claim) => {
    const base: ClaimHistory = {
      id: claim.id,
      userId: claim.userId,
      status: CLAIM_STATUS_MAP[claim.status] || claim.status,
      coinsLocked: claim.coinsLocked,
      createdAt: claim.createdAt,
    };

    switch (claim.status) {
      case 'FULFILLED':
        return { ...base, voucherCode: claim.voucherCode! };
      case 'REJECTED':
        return {
          ...base,
          rejectionReason: claim.rejectionReason!,
        };
      case 'PENDING':
      default:
        return base;
    }
  });

  return history;
};

export const rejectClaimHandler = async (
  tx: Prisma.TransactionClient,
  adminId: string,
  claimId: string,
  reason?: string,
  notes?: string
) => {
  const claim = await tx.rewardClaim.update({
    where: {
      id: claimId,
      status: 'PENDING',
    },
    data: {
      status: 'REJECTED',
      rejectionReason: reason ? reason : null,
      adminNotes: notes ? notes : null,
      fulfilledBy: adminId,
      fulfilledAt: new Date(),
    },
  });

  if (!claim) {
    throw new ApiError({
      statusCode: 404,
      message: 'invalid claim id provided',
    });
  }

  if (claim.status !== 'PENDING') {
    throw new ApiError({
      statusCode: 400,
      message: 'requested claim is not pending',
    });
  }

  const claimRequestUserId = claim.userId;

  try {
    await tx.coinLedger.create({
      data: {
        userId: claimRequestUserId,
        date: new Date(),
        source: 'REWARD_UNLOCK',
        delta: claim.coinsLocked,
        referenceId: claim.id,
      },
    });

    await tx.user.update({
      where: {
        id: claimRequestUserId,
      },
      data: {
        coins: { increment: claim.coinsLocked },
      },
    });
  } catch (e: any) {
    if (e instanceof PrismaClientKnownRequestError) {
      if (e.code === 'P2002') {
        throw new ApiError({
          statusCode: 409,
          message: 'ledger already created',
        });
      }
    }
    throw e;
  }

  return { claimId, status: 'Rejected', refunded: claim.coinsLocked };
};

export const fulfillClaimHandler = async (
  tx: Prisma.TransactionClient,
  claimId: string,
  adminId: string,
  voucherCode: string,
  reason?: string,
  notes?: string
) => {
  const claim = await tx.rewardClaim.update({
    where: {
      id: claimId,
      status: 'PENDING',
    },
    data: {
      status: 'FULFILLED',
      voucherCode: voucherCode,
      rejectionReason: reason ? reason : null,
      adminNotes: notes ? notes : null,
      fulfilledBy: adminId,
      fulfilledAt: new Date(),
    },
  });

  if (!claim) {
    throw new ApiError({
      statusCode: 404,
      message: 'invalid claim id provided',
    });
  }

  if (claim.status !== 'PENDING') {
    throw new ApiError({
      statusCode: 400,
      message: 'requested claim is not pending',
    });
  }

  const claimRequestUserId = claim.userId;

  try {
    await tx.coinLedger.create({
      data: {
        source: 'REDEMPTION',
        userId: claimRequestUserId,
        date: new Date(),
        delta: 0,
        referenceId: claim.id,
        metadata: {
          voucherCode: claim.voucherCode,
          message: 'balance already adjusted while REWARD_LOCK',
        },
      },
    });

    return { claimId, voucherCode: claim.voucherCode };
  } catch (e: any) {
    if (e instanceof PrismaClientKnownRequestError) {
      if (e.code === 'P2002') {
        throw new ApiError({
          statusCode: 409,
          message: 'ledger already created',
        });
      }
    }
    throw e;
  }
};
