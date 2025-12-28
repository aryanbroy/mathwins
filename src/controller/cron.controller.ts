import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import {
  assigndailyCoinPoints,
  assignInstantCoinPoints,
  assignSoloCoinPoints,
} from '../helpers/cron.helper';
import { ApiResponse } from '../utils/api/ApiResponse';

export const assignCoinPoints = asyncHandler(
  async (req: Request, res: Response) => {
    const now = new Date();
    const tournamentStartDate = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
    );

    await assigndailyCoinPoints(tournamentStartDate);
    await assignInstantCoinPoints(tournamentStartDate);
    await assignSoloCoinPoints(tournamentStartDate);

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
