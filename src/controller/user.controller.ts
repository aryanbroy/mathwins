import { Request, Response } from 'express';
import prisma from '../prisma';
import { ApiError } from '../utils/api/ApiError';
import { ApiResponse } from '../utils/api/ApiResponse';
import { asyncHandler } from '../middlewares/asyncHandler';
import {
  coinsSummaryHandler,
  getUserTransactionsHandler,
  userClaimHandler,
} from '../helpers/user.helper';

export const getAllUsers = async (req: Request, res: Response) => {
  return res.send('Done');
};

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { username, email } = req.body;

  if (!username || !email) {
    throw new ApiError({
      statusCode: 400,
      message: 'Received empty fields: username or email',
    });
  }

  const usernameExists = await prisma.user.findFirst({
    where: {
      username: username,
    },
  });

  if (usernameExists) {
    console.log('username already exists');
    throw new ApiError({
      statusCode: 400,
      message: 'Username already exists',
    });
  }

  const user = await prisma.user.create({
    data: {
      username,
      email,
    },
  });

  res
    .status(201)
    .json(new ApiResponse(201, user, 'Created new user succussfuly'));
});

export const getCoinsSummary = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req;
    if (!userId) {
      throw new ApiError({
        statusCode: 400,
        message: 'Received invalid user id from auth handler',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const summary = await coinsSummaryHandler(tx, userId);
      return summary;
    });

    res
      .status(200)
      .json(new ApiResponse(200, result, 'Fetched user coins summary'));
  }
);

export const getTransactionHistory = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req;
    if (!userId) {
      throw new ApiError({
        statusCode: 400,
        message: 'Received invalid user id from auth handler',
      });
    }

    const history = await getUserTransactionsHandler(userId);

    res
      .status(200)
      .json(new ApiResponse(200, history, 'Fetched transaction history'));
  }
);

export const userClaimHistory = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req;
    if (!userId) {
      throw new ApiError({
        statusCode: 400,
        message: 'Received invalid user id from auth handler',
      });
    }

    const history = await userClaimHandler(userId);

    res
      .status(200)
      .json(new ApiResponse(200, history, 'fetched user claims histroy'));
  }
);
