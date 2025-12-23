import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { ApiError } from '../utils/api/ApiError';
import { postClaimRequestHandler } from '../helpers/reward.helper';
import prisma from '../prisma';
import { ApiResponse } from '../utils/api/ApiResponse';

export const postClaimRequest = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req;
    if (!userId) {
      throw new ApiError({
        statusCode: 400,
        message: 'Received invalid user id from auth handler',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const { claim } = await postClaimRequestHandler(tx, userId);
      return claim;
    });

    res
      .status(200)
      .json(new ApiResponse(200, result, 'sent a claim request to the admins'));
  }
);
