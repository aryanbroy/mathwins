import { sourceMapsEnabled } from 'process';
import { Prisma } from '../generated/prisma';
import prisma from '../prisma';
import { ApiError } from '../utils/api/ApiError';
import { CLAIM_STATUS_MAP, SOURCE_LABEL_MAP } from '../utils/user.util';

export type TransactionHistory = {
  occurredAt: Date;
  amount: number;
  delta: number;
  // direction: 'CREDIT' | 'DEBIT' | 'NEUTRAL';
  label: string;
};

export const coinsSummaryHandler = async (
  tx: Prisma.TransactionClient,
  userId: string
) => {
  const ledgerSum = await tx.coinLedger.aggregate({
    where: { userId },
    _sum: { delta: true },
  });

  const user = await tx.user.findUnique({
    where: { id: userId },
    select: {
      coins: true,
      lifetimeCoinPoints: true,
      lifetimeCoins: true,
      level: true,
    },
  });
  if (!user) {
    throw new ApiError({ statusCode: 404, message: 'User not authorized' });
  }

  const calculatedCoins = ledgerSum._sum.delta ?? 0;
  if (user.coins !== calculatedCoins) {
    console.log(
      `Coins mismatch, db coins: ${user.coins}, ledger: ${calculatedCoins}`
    );
    console.log('updating user coins...');

    await tx.user.update({
      where: { id: userId },
      data: {
        coins: calculatedCoins,
      },
    });

    return { ...user, coins: calculatedCoins, verified: false };
  }

  return { ...user, verified: true };
};

export const getUserTransactionsHandler = async (
  userId: string
): Promise<TransactionHistory[]> => {
  const transactions = await prisma.coinLedger.findMany({
    where: { userId },
    orderBy: {
      createdAt: 'desc',
    },
    take: 50,
    select: {
      date: true,
      delta: true,
      source: true,
    },
  });

  const history: TransactionHistory[] = transactions.map((transaction) => {
    return {
      label: SOURCE_LABEL_MAP[transaction.source],
      occurredAt: transaction.date,
      delta: transaction.delta,
      amount: Math.abs(transaction.delta),
    };
  });

  return history;
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

export const userClaimHandler = async (
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
