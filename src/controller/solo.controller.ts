import { Request, Response } from 'express';
import prisma from '../prisma';
import { createQuestions } from '../utils/question.utils';
import gameConfig from '../utils/game.config';

export const startSolo = async (req: Request, res: Response) => {
    // check attempt available for this user or not
    // create question-set
    // send Qs-set to Frontend
    // 
    
    const { userId } = req.body;
    const totalQuestionsInRun = gameConfig.single_player.round_size;
    const freeAttemptsAllowed = gameConfig.single_player.daily_free_attempts;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attemptsCount = await prisma.soloAttempt.count({
      where: {
        userId: userId,
        createdAt: {
          gte: today,
        },
      },
    });
    if (attemptsCount >= freeAttemptsAllowed) {
      res.status(501).send("No Free Attempt Available for Today");
    }
    const attemptsLeft = freeAttemptsAllowed - attemptsCount;
    const questions = await createQuestions(5); 
    if (!questions || questions.length !== totalQuestionsInRun) {
      res.status(501).send("Could not generate a full set of ${totalQuestionsInRun} questions. Please try again.");
    }
    
      const newAttempt = await prisma.soloAttempt.create({
        data: {
          userId: userId,
          score: 0,
          submitedAt: new Date(),
          question: {
            create: questions.map((q) => ({
              question: q.question,
              option: q.option,
              answer: q.answer,
              difficulty: q.difficulty,
            })),
          },
        },
      });
    const sanitizedQuestions = questions.map((q) => {
      const { answer, ...clientSafeQuestion } = q;
      return clientSafeQuestion;
    });

    return res.status(201).json({
      message: 'Solo run started. Good luck!',
      attemptId: newAttempt.id,
      questions: sanitizedQuestions,
      attemptsLeft: attemptsLeft - 1,
    });
}