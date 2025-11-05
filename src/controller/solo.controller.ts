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
    try {
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
  
      const updatedUser = await prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          soloAttemptCount: {
            increment: 1
          },
        },
      });
      if (updatedUser.soloAttemptCount >= freeAttemptsAllowed) {
        res
          .status(501)
          .send(new ApiResponse(501, 'No Free Attempt Available for Today'));
      }
      let questions: QuestionData[];
      questions = await generateQuestions(1,5);
      const seed = generateSeed();
      const newAttempt = await prisma.soloSession.create({
        data: {
          userId: userId,
          date: today,
          sessionSeed: seed,
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
    } catch (error) {
      console.error('start Solo error:', error);
      return res
        .status(500)
        .json(new ApiResponse(500, 'Failed to start Solo'));
    }
}

export const continueSolo = async (req: Request, res: Response) => {
  try {
    const {userId, soloId} = req.body;
    if(!userId || !soloId){
      throw new ApiError({
          statusCode: 400,
          message: 'invalid userId, soloId',
      });
    }
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
      }
    });
    if (!user) {
      throw new ApiError({
          statusCode: 400,
          message: 'error in fetching user',
      });
    }
    const session = await prisma.soloSession.findFirst({
      where: {
        id: soloId,
      },
      include: { 
        questions: true 
      },
    });
    if (!session) {
      throw new ApiError({
          statusCode: 400,
          message: 'error in fetching soloSession',
      });
    }
    if (session.userId !== userId) {
      return res
        .status(403)
        .json(new ApiResponse(403, 'Not authorized for this session'));
    }
    if (session.status !== "IN_PROGRESS") {
      return res
        .status(400)
        .json(new ApiResponse(400, 'Session is not active'));
    }
  
    const roundSize = gameConfig.single_player.round_size;
    const levelIncrementEvery = gameConfig.single_player.level_increase_every_n_questions || 2;
    const currentLevel = session.currentLevel;
    const questionsAnswered = session.questionsAnswered;
    const roundsCompleted = Math.floor(questionsAnswered / roundSize); 
  
    let newLevel = currentLevel + Math.floor(roundsCompleted / levelIncrementEvery) + 1;
    newLevel = newLevel < 5 ? newLevel : 5; 
  
    const questions = await generateQuestions(newLevel, roundSize);
    await prisma.questionAttempt.createMany({
      data: questions.map((q, index) => ({
        dailySessionId: null,
        soloSessionId: soloId,
        questionIndex: session.questions.length + index + 1,
        level: q.level,
        expression: q.expression,
        result: q.result,
        side: q.side,
        kthDigit: q.kthDigit,
        correctDigit: q.correctDigit,
      })),
    });
    const updatedSession = await prisma.soloSession.update({
      where: { id: soloId },
      data: {
        currentRound: session.currentRound + 1,
        currentLevel: newLevel,
        updatedAt: new Date(),
      },
    });
    const sanitizedQuestions = questions.map(({ correctDigit, ...rest }) => rest);
    return res.status(200).json({
      message: 'Next round started successfully',
      round: updatedSession.currentRound,
      level: updatedSession.currentLevel,
      questions: sanitizedQuestions,
    });
  } catch (error) {
    console.error('continueSolo error:', error);
    return res
        .status(500)
        .json(new ApiResponse(500, 'Failed to continue solo session'));
  }
}

export const quitSolo  = async (req: Request, res: Response) => {
  
}

export const nextQuestion  = async (req: Request, res: Response) => {

}

export const finalSessionSubmission  = async (req: Request, res: Response) => {

}

export const minuiteLeaderboard  = async (req: Request, res: Response) => {

}
