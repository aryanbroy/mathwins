import { Request, Response } from 'express';
import prisma from '../prisma';

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany();
    res.status(200).json(users);
  } catch (err) {
    console.log('Error occurred: ', err);
    res.status(400).json(err);
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password,
      },
    });

    // const users = await prisma.user.findMany();

    res.status(201).json({ user });
  } catch (err) {
    console.log('Error occurred: ', err);
    res.status(400).json(err);
  }
};
