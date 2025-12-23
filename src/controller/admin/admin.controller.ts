import { Request, Response } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler';
import { ApiError } from '../../utils/api/ApiError';
import { listAllClaimsHandler } from '../../helpers/auth.helper';

export const listAllClaims = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req;
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

    await listAllClaimsHandler(claimStatus);
  }
);
