import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import {
  assigndailyCoinPoints,
  assignInstantCoinPointsHandler,
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
