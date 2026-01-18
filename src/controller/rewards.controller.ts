import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { ApiError } from '../utils/api/ApiError';
import {
  dailyClaimHandler,
  listRewardClaimsHandler,
  postClaimRequestHandler,
} from '../helpers/reward.helper';
import prisma from '../prisma';
import { ApiResponse } from '../utils/api/ApiResponse';

export const postClaimRequest = asyncHandler(
  async (req: Request, res: Response) => {
    const { id: userId } = req.body.userData;
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

export const listClaims = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = req.body.userData;
  if (!userId) {
    throw new ApiError({
      statusCode: 400,
      message: 'Received invalid user id from auth handler',
    });
  }

  const claims = await listRewardClaimsHandler(userId);

  res.status(200).json(new ApiResponse(200, claims, 'fetched user claims'));
});

export const claimDailyReward = asyncHandler(
  async (req: Request, res: Response) => {
    const { id: userId } = req.userData;
    if (!userId) {
      throw new ApiError({
        statusCode: 400,
        message: 'Received invalid user id from auth handler',
      });
    }

    const { leaderboardEntry, rewardInfo } = await dailyClaimHandler(userId);

    console.log(leaderboardEntry);

    const data = {
      pointsAwarded: rewardInfo.pointsToAward,
      currentStreak: rewardInfo.newStreak,
      longestStreak: rewardInfo.longestStreak,
      streakBroken: rewardInfo.streakBroken,
      totalCoinPointsToday: Number(leaderboardEntry.totalCoinPoints),
    };

    res.status(200).json(new ApiResponse(200, data, 'daily reward claimed'));
  }
);

export const fetchUserCoinPoints = asyncHandler(
  async (req: Request, res: Response) => {
    const { id: userId } = req.userData;
    if (!userId) {
      throw new ApiError({
        statusCode: 400,
        message: 'Received invalid user id from auth handler',
      });
    }

    const coinPoints = req.userData.lifetimeCoinPoints;

    const data = {
      coinPoints,
    };

    res.status(200).json(new ApiResponse(200, data, 'fetch coin points'));
  }
);

export const fetchStreak = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = req.userData;
  if (!userId) {
    throw new ApiError({
      statusCode: 400,
      message: 'Received invalid user id from auth handler',
    });
  }

  const { currentLoginStreak } = req.userData;
  const data = {
    streak: currentLoginStreak,
  };

  res.status(200).json(new ApiResponse(200, data, 'current streak'));
});
