import { Request, Response } from 'express';
import prisma from '../prisma';
import { ApiError } from '../utils/api/ApiError';
import { ApiResponse } from '../utils/api/ApiResponse';

export const getAllUsers = async (req: Request, res: Response) => {
  return res.send('Done');
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, username, email, password } = req.body;
    const usernameExists = await prisma.user.findFirst({
      where: {
        username: username,
      },
    });

    if (usernameExists) {
      throw new ApiError(400, 'Username already exists');
    }

    const user = await prisma.user.create({
      data: {
        name,
        username,
        email,
        password,
      },
    });

    res
      .status(201)
      .json(new ApiResponse(201, user, 'Created new user succussfuly'));
  } catch (err) {
    console.log('Error occurred: ', err);
    throw new ApiError(500, 'Error creating new user');
  }
};
