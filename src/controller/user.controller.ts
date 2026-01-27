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
import { ADMIN_EMAILS } from "../config/admin";

function generateReferralCode(email?: string, phone?: string): string {
  const source = (email || phone || '').toLowerCase().trim();

  const hash = crypto.createHash('sha256').update(source).digest('base64url'); // URL-safe

  return hash.slice(0, 8).toUpperCase();
}

export const getAllUsers = async (req: Request, res: Response) => {
  return res.send('Done');
};

export const createUser = async (req: Request, res: Response) => {
  const { username, email, picture, referralCode } = req.body;
  console.log('createUser :- ', req.body);
  // const 
  if (!username || !email) {
    throw new ApiError({
      statusCode: 400,
      message: 'Received empty fields: username or email',
    });
  }
  console.log('name : ', username, ' email : ', email);

  const existingUser = await prisma.user.findFirst({
    where: {
      email: email,
    },
  });

  if (existingUser) {
    console.log('username already exists');
    const {id: userId, username, email, profilePictureUrl: picture, referralCode} = existingUser;
    const JWT_SECRET = process.env.JWT_SECRET as string;
    const jwtSting = jwt.sign({ userId, username, email, picture, referralCode }, JWT_SECRET, {
      expiresIn: '7d',
    });
    return res
      .status(201)
      .json(new ApiResponse(201, jwtSting, 'Created new Session succussfully'));
  }
  // check if referralCode exists or active for now
  // if so then create new user accordingly and change exixsting DB
  let referrer = null;
  if (referralCode) {
    referrer = await prisma.user.findUnique({
      where: { referralCode },
    });

    if (!referrer) {
      return res.status(400).json({
        success: false,
        message: "Invalid referral code",
      });
    }
  }

  const generateNewReferralCode = generateReferralCode(email);
  const user = await prisma.user.create({
    data: {
      username,
      email,
      profilePictureUrl: picture,
      referralCode: generateNewReferralCode,
      referredById: referrer?.id,
    },
    include: {
      referredBy: true,
    },
  });

  //
  if (referrer) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: referrer.id },
        data: {
          coins: { increment: 200 }, // change - game.config
          lifetimeCoins: { increment: 200 }, // change - game.config
        },
      }),
      
      prisma.referral.create({
        data: {
          referrer: {
            connect: { id: referrer.id }
          },
          referee: {
            connect: { id: user.id }
          },
          referralCode: referralCode,
        },
      }),
    ]);
  }

  const userId = user.id;
  const JWT_SECRET = process.env.JWT_SECRET as string;
  const jwtSting = jwt.sign({ userId, username, email, picture, referralCode: generateNewReferralCode }, JWT_SECRET, {
    expiresIn: '7d',
  });
  res
    .status(201)
    .json(new ApiResponse(201, jwtSting, 'Created new user succussfully'));
};

export const getUser = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    console.log('Token: ', token);

    const JWT_SECRET = process.env.JWT_SECRET as string;
    const user:any = jwt.verify(token, JWT_SECRET);
    // console.log("getUser :- ",user);
    const existingUser:any = await prisma.user.findFirst({
      where: {
        id: user.userId,
      },
    });
    const isAdmin = ADMIN_EMAILS.includes(existingUser.email);
    return res.status(200).json(new ApiResponse(200, {...user, coins: existingUser.lifetimeCoins, isAdmin}, 'user created'));
  } catch (error) {
    console.log(error);
    throw new ApiError({ statusCode: 500, message: 'Internal server error' });
  }
};

export const getCoinsSummary = asyncHandler(
  async (req: Request, res: Response) => {
    const { userData } = req.body;
    const userId = userData.id;
    if (!userId) {
      throw new ApiError({
        statusCode: 400,
        message: 'Received invalid user id from auth handler',
      });
    }

    const result = await prisma.$transaction(async (tx : any) => {
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
    const { userData } = req.body;
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
