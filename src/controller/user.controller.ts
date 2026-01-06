import { Request, Response } from 'express';
import prisma from '../prisma';
import { ApiError } from '../utils/api/ApiError';
import { ApiResponse } from '../utils/api/ApiResponse';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../middlewares/asyncHandler';
import {
  coinsSummaryHandler,
  getUserTransactionsHandler,
} from '../helpers/user.helper';

function generateReferralCode(email?: string, phone?: string): string {
  const source = (email || phone || '').toLowerCase().trim();

  const hash = crypto.createHash('sha256').update(source).digest('base64url'); // URL-safe

  return hash.slice(0, 8).toUpperCase();
}

export const getAllUsers = async (req: Request, res: Response) => {
  return res.send('Done');
};

export const createUser = async (req: Request, res: Response) => {
  const { username, email, picture } = req.body;
  console.log(req.body);
  
  if (!username || !email) {
    throw new ApiError({
      statusCode: 400,
      message: 'Received empty fields: username or email',
    });
  }
  console.log("name : ",username," email : ",email);
  

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
  
  const generateNewReferralCode = generateReferralCode(email);
  const user = await prisma.user.create({
    data: {
      username,
      email,
      profilePictureUrl: picture,
      referralCode: generateNewReferralCode,
    },
  });
  const userId = user.id;
  const JWT_SECRET = process.env.JWT_SECRET as string;
  const jwtSting = jwt.sign({ userId, username, email, picture }, JWT_SECRET, {
    expiresIn: '7d',
  });
  res
    .status(201)
    .json(new ApiResponse(201, jwtSting, 'Created new user succussfuly'));
};

export const getUser = async (req: Request, res: Response) => {
  try {
    const {token} = req.body;
    console.log(token);
    
    const JWT_SECRET = process.env.JWT_SECRET as string;
    const user = jwt.verify(token, JWT_SECRET);
    console.log(user);
    return res.status(200).json(new ApiResponse(
      200,
      user,
      'user created'
    ));
  } catch (error) {
    console.log(error);
    throw new ApiError({ statusCode: 500, message: 'Internal server error' });
  }
};

export const getCoinsSummary = asyncHandler(
  async (req: Request, res: Response) => {
    const {userData} = req.body;
    const userId = userData.id;
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
    const {userData} = req.body;
    const userId = userData.id;
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
