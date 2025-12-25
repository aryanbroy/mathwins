import { ClaimStatus, Prisma } from '../../generated/prisma';
import { ApiError } from '../api/ApiError';

export const verifyClaim = async (
  tx: Prisma.TransactionClient,
  claimId: string,
  adminId: string,
  updateStatus: ClaimStatus,
  reason?: string,
  notes?: string
) => {
  const claim = await tx.rewardClaim.update({
    where: {
      id: claimId,
      status: 'PENDING',
    },
    data: {
      status: updateStatus,
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

  return claim;
};
