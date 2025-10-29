import { Request, Response } from 'express';
import prisma from '../prisma';

export const getAllUsers = (req: Request, res: Response) => {
  res.status(200).json({ failure: false });
};

export const createUser = async (req: Request, res: Response) => {
  try {
    await prisma.user.create({
      data: {
        name: 'Aryan',
        email: 'aryan@broy.com',
        password: 'aryan1234',
      },
    });

    const users = await prisma.user.findMany();

    res.status(201).json({ users });
  } catch (err) {
    console.log('Error occurred: ', err);
    res.status(400).json(err);
  }
};
