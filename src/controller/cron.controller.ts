import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import {
  aggregateCoinPointsHandler,
  assigndailyCoinPoints,
  assignInstantCoinPointsHandler,
  getDailyUserLeaderboardHandler,
} from '../helpers/cron.helper';
import { ApiResponse } from '../utils/api/ApiResponse';
import { ApiError } from '../utils/api/ApiError';

export const assignCoinPoints = asyncHandler(
  async (req: Request, res: Response) => {
    const now = new Date();
    const tournamentStartDate = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
    );

    await assigndailyCoinPoints(tournamentStartDate);
    // await assignSoloCoinPoints(tournamentStartDate);

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { points: 'random ass points' },
          'points and rank have been assigned'
        )
      );
  }
);

export const assignInstantCoinPoints = asyncHandler(
  async (req: Request, res: Response) => {
    const { tournamentId } = req.body;
    if (!tournamentId) {
      console.log('tournament id not provided');
      throw new ApiError({
        statusCode: 400,
        message: 'tournament id not provided',
      });
    }

    await assignInstantCoinPointsHandler(tournamentId);

    res
      .status(200)
      .json(new ApiResponse(200, { points: 'instant points here' }));
  }
);

export const assignTotalPoints = asyncHandler(
  async (req: Request, res: Response) => {
    const now = new Date();
    const startDate = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
    );

    const endDate = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    );

    const result = await aggregateCoinPointsHandler(startDate, endDate);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Aggregation Complete`);
    console.log(`   Date: ${result.date}`);
    console.log(`   Total Users: ${result.totalUsers}`);
    console.log(`   Eligible Users: ${result.eligibleUsers}`);
    console.log(`   Deleted Old Entries: ${result.deletedOldEntries}`);
    console.log(`${'='.repeat(60)}\n`);

    res.status(200).json(new ApiResponse(200, { result }));
  }
);

export const getDailyUserLeaderboard = asyncHandler(
  async (req: Request, res: Response) => {
    const now = new Date();
    const today = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
    );

    const result = await getDailyUserLeaderboardHandler(today);

    res.status(200).json(new ApiResponse(200, { result }));
  }
);
