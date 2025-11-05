import { Request, Response } from 'express';
import prisma from '../prisma';
import gameConfig from '../utils/game.config';
import { ApiResponse } from '../utils/api/ApiResponse';
import { generateQuestion, generateQuestions } from '../utils/question.utils';
import { generateSeed } from '../utils/seed.utils';
import { ApiError } from '../utils/api/ApiError';

type QuestionData = {
  expression: string;
  result: string;
  side: string;
  kthDigit: number;
  correctDigit: number;
  level: number;
};

export const startSolo = async (req: Request, res: Response) => {
    // check attempt available for this user or not
    // create question-set
    // Remove answer (correctDigit)
    // send Qs-set to Frontend
    // 
    
    const { userId } = req.body;
    const totalQuestionsInRun = gameConfig.single_player.round_size;
    const freeAttemptsAllowed = gameConfig.single_player.daily_free_attempts;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attemptsCount = await prisma.soloSession.count({
      where: {
        userId: userId,
        date: {
          gte: today,
        },
      },
    });
    if (attemptsCount >= freeAttemptsAllowed) {
      res
        .status(501)
        .send(new ApiResponse(501, 'No Free Attempt Available for Today'));
    }
    const attemptsLeft = freeAttemptsAllowed - attemptsCount;
    let questions: QuestionData[];
    questions = await generateQuestions(1,5);

    // } catch (err) {
    //   throw new ApiError({statusCode: 501, message: 'Failed to generate questions'});
    // }
    const seed = generateSeed();
    const newAttempt = await prisma.soloSession.create({
      data: {
        userId: userId,
        date: today,
        sessionSeed: seed,
        attemptNumber: attemptsCount+1,
        questions: {
        create: questions.map((q, index) => ({
          questionIndex: index + 1,
          level: q.level,
          expression: q.expression,
          result: q.result,
          side: q.side,
          kthDigit: q.kthDigit,
          correctDigit: q.correctDigit,
        })),
      },
    },
    });

    const sanitizedQuestions = questions.map((q) => {
      const { correctDigit, ...clientSafeQuestion } = q;
      return clientSafeQuestion;
    });

    return res.status(201).json({sanitizedQuestions, newAttempt});
}