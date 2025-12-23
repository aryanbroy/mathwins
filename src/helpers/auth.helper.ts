import { ClaimStatus } from '../generated/prisma';
import prisma from '../prisma';
import { CLAIM_STATUS_MAP } from '../utils/user.util';

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
