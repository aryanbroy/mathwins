import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/api/ApiError';
import prisma from '../prisma';
import jwt from 'jsonwebtoken';

export const verifyUser = async (
  req: Request,
  _: Response,
  next: NextFunction
) => {
  try {
    // instead of fetching the direct authorization, update this to get the token from cookies or headers (use jwt for verification)
    // const incomingUserId = req.header('Authorization');
    // const incomingUserId = 'cmiyq868400009hg4h1wlewx0';
    // const incomingUserId = 'cmj15yijg0003pwg4og4gmcly';
    const incomingUserId = 'cmj15yth40004pwg43pvf7b85';
    // const incomingUserId = 'cmj15yxly0005pwg4d5jhda2q';
    // const incomingUserId = 'cmj15y8pu0001pwg440rujz6m';
    // const incomingUserId = '';
    const userId = String(incomingUserId);
    if (!userId)
      throw new ApiError({ statusCode: 400, message: 'Empty user id field' });
    
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
      },
    });
    if (!user)
      throw new ApiError({ statusCode: 404, message: 'User not authorized' });
    
    req.userId = userId;
    req.soloAttemptCount = user.soloAttemptCount;
    req.instantAttempCount = user.instantAttemptCount;
    req.dailyAttemptCount = user.dailyAttemptCount; 
    
    next();
  } catch (err: unknown) {
    console.log(err);
    throw new ApiError({
      statusCode: 500,
      message: 'error verifying user',
    });
  }
};

export const verifyUser2 = async (
  req: Request,
  _: Response,
  next: NextFunction
) => {
  try {
    // 
    // store JWT in localStore
    // send token as header
    // verify in middleWare -> next()
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      throw new ApiError({
        statusCode: 401,
        message: "Authorization header missing",
      });
    }
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    if (!token) {
      throw new ApiError({
        statusCode: 401,
        message: "JWT token missing",
      });
    }
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    } catch {
      throw new ApiError({
        statusCode: 401,
        message: "Invalid or expired token",
      });
    }
    const userId = decoded.userId;
    if (!userId) {
      throw new ApiError({
        statusCode: 401,
        message: "Invalid token payload",
      });
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        soloAttemptCount: true,
        instantAttemptCount: true,
        dailyAttemptCount: true,
      },
    });

    if (!user) {
      throw new ApiError({
        statusCode: 401,
        message: "User not found",
      });
    }
    req.userId = user.id;
    req.soloAttemptCount = user.soloAttemptCount;
    req.instantAttempCount = user.instantAttemptCount;
    req.dailyAttemptCount = user.dailyAttemptCount;

    next();
  } catch (err: unknown) {
    console.log(err);
    throw new ApiError({
      statusCode: 500,
      message: 'error verifying user',
    });
  }
};
