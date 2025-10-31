import { Request, Response } from 'express';
import prisma from '../prisma';

export const addQuestion = async (req: Request, res: Response) => {
    try {
      console.log(req.body);
      const { question, option, answer, difficulty} = req.body;
      const qs = await prisma.question.create({
        data: {
          question,       
          option,
          answer,             
          difficulty,
        },
      });
      res.status(201).json({ qs });
  } catch (err) {
    console.log('Error occurred: ', err);
    res.status(400).json(err);
  }
};