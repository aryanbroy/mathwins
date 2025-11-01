import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/api/ApiError';

export const verifyUser = async (
  req: Request,
  _: Response,
  next: NextFunction
) => {
  try {
    console.log('hello');
    const dummyUserId = 1234;
    req.userId = dummyUserId;
    next();
  } catch (err) {
    throw new ApiError(500, 'Error verifying user', err);
  }
};
