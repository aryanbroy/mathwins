import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/api/ApiError';
import prisma from '../prisma';

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
