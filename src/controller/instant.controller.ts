import { Request, Response } from 'express';
import { ApiError } from '../utils/api/ApiError';
import prisma from '../prisma';
import { ApiResponse } from '../utils/api/ApiResponse';
import { asyncHandler } from '../middlewares/asyncHandler';
import { joinOrCreateRoomHandler } from '../utils/helper_handler/instant';

export const testInstant = async (req: Request, res: Response) => {
  console.log('working');
  res.status(200).json({ success: true });
};

export const joinOrCreateTournament = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.userId;
    if (!userId) {
      throw new ApiError({
        statusCode: 400,
        message: 'Received invalid user id from auth handler',
      });
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const room = await joinOrCreateRoomHandler(tx, userId, now);
      return room;
    });

    res.status(200).json(new ApiResponse(200, result));
  }
);
