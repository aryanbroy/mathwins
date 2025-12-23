import { Request, Response } from 'express';
import prisma from '../prisma';
import gameConfig from '../config/game.config';
import { generateQuestion } from '../utils/question.utils';

export const demoQuestion = async (req: Request, res: Response) => {
  try {
    console.log(req.body);
    
    const {level} = req.body;
    generateQuestion(level)
    .then(question => {
      console.log("Promise finished!");
      console.log(question.expression);
      return res.status(201).json(question);
    }).catch(err => {
      console.error("Error while getting question:", err);
    });
  } catch (error) {
    console.log(error);
  }
};
