import { Request, Response, text } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler';
import { ApiError } from '../../utils/api/ApiError';
import {
  fulfillClaimHandler,
  listAllClaimsHandler,
  rejectClaimHandler,
} from '../../helpers/admin.helper';
import { ApiResponse } from '../../utils/api/ApiResponse';
import prisma from '../../prisma';

export const listAllClaims = asyncHandler(
  async (req: Request, res: Response) => {
    const { id: userId } = req.userData;
    if (!userId) {
      throw new ApiError({
        statusCode: 400,
        message: 'Received invalid user id from auth handler',
      });
    }

    let { claimStatus } = req.body;
    if (!claimStatus) {
      claimStatus = 'PENDING';
    }

    const claims = await listAllClaimsHandler(claimStatus);

    return res.status(200).json(new ApiResponse(200, claims));
  }
);

export const rejectClaim = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = req.userData;
  if (!userId) {
    throw new ApiError({
      statusCode: 400,
      message: 'Received invalid user id from auth handler',
    });
  }

  const { claimId, reason, notes } = req.body;
  if (!claimId) {
    throw new ApiError({ statusCode: 400, message: 'missing fields: claimId' });
  }

  const result = await prisma.$transaction(async (tx) => {
    const rejectClaimData = await rejectClaimHandler(
      tx,
      userId,
      claimId,
      reason,
      notes
    );
    return rejectClaimData;
  });

  return res.status(200).json(new ApiResponse(200, result, 'claim rejected'));
});

export const fulfillClaim = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req.userData;
    if (!userId) {
      throw new ApiError({
        statusCode: 400,
        message: 'Received invalid user id from auth handler',
      });
    }

    const { claimId, voucherCode, reason, notes } = req.body;
    if (!claimId || !voucherCode) {
      throw new ApiError({
        statusCode: 400,
        message: 'missing fields: claimId, voucherCode',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const fulfillClaimData = await fulfillClaimHandler(
        tx,
        claimId,
        userId,
        voucherCode,
        reason,
        notes
      );
      return fulfillClaimData;
    });

    return res
      .status(200)
      .json(new ApiResponse(200, result, 'claim fulfilled'));
  }
);
