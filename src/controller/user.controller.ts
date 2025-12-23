import { Request, Response } from 'express';
import prisma from '../prisma';
import { ApiError } from '../utils/api/ApiError';
import { ApiResponse } from '../utils/api/ApiResponse';
import crypto from "crypto";
import Jwt from 'jsonwebtoken';

function generateReferralCode(
  email?: string,
  phone?: string
): string {
  const source = (email || phone || "").toLowerCase().trim();

  const hash = crypto
    .createHash("sha256")
    .update(source)
    .digest("base64url"); // URL-safe

  return hash.slice(0, 8).toUpperCase();
}

export const getAllUsers = async (req: Request, res: Response) => {
  return res.send('Done');
};

export const createUser = async (req: Request, res: Response) => {
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
  const generateNewReferralCode = generateReferralCode(email);
  const user = await prisma.user.create({
    data: {
      username,
      email,
      referralCode: generateNewReferralCode,
    },
  });
  const userId = user.id;
  const JWT_SECRET = process.env.JWT_SECRET as string;
  const jwtSting = Jwt.sign({userId, username, email}, JWT_SECRET, { expiresIn: '1h' });
  res
    .status(201)
    .json(new ApiResponse(201, jwtSting, 'Created new user succussfuly'));
};