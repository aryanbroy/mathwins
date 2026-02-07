import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/api/ApiError';
import prisma from '../prisma';
import jwt, { JwtPayload } from 'jsonwebtoken';

interface UserPayload extends JwtPayload {
  userId: string;
}

export const verifyUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // instead of fetching the direct authorization, update this to get the token from cookies or headers (use jwt for verification)
    const authHeader = req.header('Authorization');
    console.log('auth - middle : ', authHeader);

    if (!authHeader) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }
    //
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : authHeader;

    // console.log('middleWare : ', token);
    const JWT_SECRET = process.env.JWT_SECRET as string;
    const verifiedUser = jwt.verify(token, JWT_SECRET) as UserPayload;
    console.log(verifiedUser);

    // const { userId } = verifiedUser;
    const userId = verifiedUser.userId as string;

    // const userId = 'cmjog0zue0000f2g41u0ja8d8';
    // const userId = 'cmjq7xbbo0000k5g4ulu0fwnq';
    // const userId = 'cmjq7xp3c0001k5g4h2stergz';
    // const userId = 'cmjq7xp3c0001k5g4h2stergz';
    // const userId = 'cmjq7xvty0002k5g4za159b1o';
    if (!userId)
      throw new ApiError({ statusCode: 400, message: 'Empty user id field' });

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
      },
    });
    if (!user)
      throw new ApiError({ statusCode: 404, message: 'User not authorized' });

    // req.body.userData = user;
    req.userData = user;

    // req.userId = userId;
    // req.soloAttemptCount = user.soloAttemptCount;
    // req.instantAttempCount = user.instantAttemptCount;
    // req.dailyAttemptCount = user.dailyAttemptCount;

    next();
  } catch (err: unknown) {
    console.log(err);
    throw new ApiError({
      statusCode: 500,
      message: 'error verifying user',
    });
  }
};

// export const verifyUser2 = async (
//   req: Request,
//   _: Response,
//   next: NextFunction
// ) => {
//   try {
//     //
//     // store JWT in localStore
//     // send token as header
//     // verify in middleWare -> next()
//     const authHeader = req.header('Authorization');
//     if (!authHeader) {
//       throw new ApiError({
//         statusCode: 401,
//         message: 'Authorization header missing',
//       });
//     }
//     const token = authHeader.startsWith('Bearer ')
//       ? authHeader.split(' ')[1]
//       : authHeader;

//     if (!token) {
//       throw new ApiError({
//         statusCode: 401,
//         message: 'JWT token missing',
//       });
//     }
//     let decoded: any;
//     try {
//       decoded = jwt.verify(token, process.env.JWT_SECRET as string);
//     } catch {
//       throw new ApiError({
//         statusCode: 401,
//         message: 'Invalid or expired token',
//       });
//     }
//     const userId = decoded.userId;
//     if (!userId) {
//       throw new ApiError({
//         statusCode: 401,
//         message: 'Invalid token payload',
//       });
//     }
//     const user = await prisma.user.findUnique({
//       where: { id: userId },
//       select: {
//         id: true,
//         soloAttemptCount: true,
//         instantAttemptCount: true,
//         dailyAttemptCount: true,
//       },
//     });

//     if (!user) {
//       throw new ApiError({
//         statusCode: 401,
//         message: 'User not found',
//       });
//     }
//     // req.userId = user.id;
//     // req.soloAttemptCount = user.soloAttemptCount;
//     // req.instantAttempCount = user.instantAttemptCount;
//     // req.dailyAttemptCount = user.dailyAttemptCount;
//     req.userData = user;

//     next();
//   } catch (err: unknown) {
//     console.log(err);
//     throw new ApiError({
//       statusCode: 500,
//       message: 'error verifying user',
//     });
//   }
// };
