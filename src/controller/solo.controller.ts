import { Request, Response } from 'express';
import prisma from '../prisma';
import gameConfig from '../utils/game.config';
import { ApiResponse } from '../utils/api/ApiResponse';
import { generateQuestion } from '../utils/question.utils';
import { generateSeed } from '../utils/seed.utils';
import { ApiError } from '../utils/api/ApiError';
import { calculateSoloCoinPoint } from '../utils/score.utils';

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
      let question: QuestionData;
      question = await generateQuestion(1);
      console.log("qs : ",question);
      
      const seed = generateSeed();
      const newAttempt = await prisma.soloSession.create({
        data: {
          userId: userId,
          date: today,
          sessionSeed: seed,
          status: 'IN_PROGRESS',
          questions: {
            create: {
              level: question.level,
              expression: question.expression,
              result: question.result,
              side: question.side,
              kthDigit: question.kthDigit,
              correctDigit: question.correctDigit,
            },
          },
        },
      });
  
      const { correctDigit, result, ...clientSafeQuestion } = question;
      const sanitizedQuestion = clientSafeQuestion;
  
      return res.status(201).json({sanitizedQuestion, newAttempt});
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
    
    const question = await generateQuestion(newLevel);
    const updatedSession = await prisma.soloSession.update({
      where: { id: soloId },
      data: {
        bankedPoints: {
          increment: session.currentRound * gameConfig.single_player.points_per_round_factor,
        },
        questions: {
          create: {
            level: question.level,
            expression: question.expression,
            result: question.result,
            side: question.side,
            kthDigit: question.kthDigit,
            correctDigit: question.correctDigit,
          },
        },
        currentRound: session.currentRound + 1,
        currentLevel: newLevel,
        updatedAt: new Date(),
      },
    });
    const { correctDigit, result, ...clientSafeQuestion } = question;
    const sanitizedQuestion = clientSafeQuestion;
    return res.status(200).json({
      message: 'Next round started successfully',
      round: updatedSession.currentRound,
      level: updatedSession.currentLevel,
      questions: sanitizedQuestion,
    });
  } catch (error) {
    console.error('continueSolo error:', error);
    return res
        .status(500)
        .json(new ApiResponse(500, 'Failed to continue solo session'));
  }
}

export const quitSolo  = async (req: Request, res: Response) => {
  try {
    const {soloSessionId, userId} = req.body;
    if(!soloSessionId || !userId){
      throw new ApiError({
          statusCode: 400,
          message: 'error in fetching userId, soloSessionId',
      });
    }
    const today = new Date();
  
    const session = await prisma.soloSession.findFirst({
      where: {
        id: soloSessionId
      }
    })
    if(!session){
      throw new ApiError({
          statusCode: 400,
          message: 'error in fetching soloSession',
      });
    }
    if(session.userId !== userId){
      throw new ApiError({
          statusCode: 400,
          message: 'Session does not belong to this user',
      });
    }
    if(session.status !== 'IN_PROGRESS'){
      throw new ApiError({
          statusCode: 400,
          message: 'start a session first',
      });
    }
  
    if(session.questionsAnswered % 5 !== 0){
      throw new ApiError({
          statusCode: 400,
          message: 'You can only quit solo-tournament at the end of a round',
      });
    }
  
    // - Calculate final score (no penalty for quitting after round)
    // - finalScore = session.bankedPoints
    const roundsCompleted = session.questionsAnswered / gameConfig.single_player.round_size;
    const finalPoint = session.bankedPoints + (roundsCompleted * gameConfig.single_player.points_per_round_factor);

    const updatedSoloSession = await prisma.soloSession.update({
      where: {
        id: soloSessionId
      },
      data: {
        updatedAt: today,
        endedAt: today,
        status: 'COMPLETED',
        finalScore: finalPoint,
        quitEarly: true,
      }
    })
    if(!updatedSoloSession){
      throw new ApiError({
        statusCode: 400,
        message: 'Error in Ending your Session. Try Again ! !',
      });
    }
  
    return res.status(200).json({
      message: 'You can leave this window.',
      sessionEnded: true,
      finalPoint: finalPoint,
      roundsCompleted: session.currentRound,
    });
  } catch (error) {
    console.error('quitSolo error:', error);
    return res
        .status(500)
        .json(new ApiResponse(500, 'Failed to quit solo session, Try Again ! !'));
  }

}

export const nextQuestion  = async (req: Request, res: Response) => {
  try {
    const {soloSessionId, userId, questionId, userAnswer, time} = req.body;
    const today = new Date();
    if(!soloSessionId || !userId || !questionId || (userAnswer === null || userAnswer === undefined) || !time){
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, soloSessionId, questionId, userAnswer, time',
      });
    }
    if (typeof userAnswer !== 'number' || userAnswer < 0 || userAnswer > 9) {
      return res.status(400).json({
        success: false,
        message: 'userAnswer must be a number between 0 and 9',
      });
    }

    const session = await prisma.soloSession.findUnique({
      where: { id: soloSessionId },
      include: {
        questions: {
          orderBy: { questionIndex: 'asc' },
        },
      },
    });
    if(!session){
      throw new ApiError({
          statusCode: 400,
          message: 'error in fetching soloSession',
      });
    }
    if(session.userId !== userId){
      throw new ApiError({
          statusCode: 400,
          message: 'Session does not belong to this user',
      });
    }
    if(session.status !== 'IN_PROGRESS'){
      throw new ApiError({
          statusCode: 400,
          message: `Cannot submit answer: Session is ${session.status}`,
      });
    }
    
    const question = session.questions.find((q) => q.id === questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found in this session',
      });
    }
    if (question.soloSessionId !== soloSessionId) {
      return res.status(400).json({
        success: false,
        message: 'Question does not belong to this session',
      });
    }

    const isCorrect = userAnswer === question.correctDigit;
    if (isCorrect) {
      const updatedBankedPoint = session.bankedPoints + gameConfig.single_player.point_for_correct_answer;
      const updatedQuestionsAnswered = session.questionsAnswered + 1;
      const updatedCorrectAnswers = isCorrect ? session.correctAnswers + 1 : session.correctAnswers;
      const newNextLevel = Math.floor(updatedQuestionsAnswered / 2) + 1;
      const updatedSession  = await prisma.soloSession.update({
        where: { id: soloSessionId },
        data: {
          bankedPoints: updatedBankedPoint,
          questionsAnswered: updatedQuestionsAnswered,
          correctAnswers: updatedCorrectAnswers,
          currentLevel: newNextLevel,
        },
      })
      // add check for round_complete : session.questionsANswered % gameConfig.roundSize == 0
      // if currentRound > gameConfig.free_round - show an add
      // if yes, dont generate new Question, show option - QUIT / CONTINUE 
      const roundCompleted = (updatedSession.questionsAnswered % gameConfig.single_player.round_size) === 0;
      if(roundCompleted){
        // SHOW an ADD
        res.status(201).json({
          success: true,
          isCorrect: true,
          roundNumber: updatedSession.currentRound,
          correctAnswer: question.correctDigit,
          message: `${session.currentRound} completed. Select CONTINUE to move ahead.`
        })
      } else {
        const nextGeneratedSeed = generateSeed();
        let nextGeneratedQuestion: QuestionData;
        nextGeneratedQuestion = await generateQuestion(newNextLevel);
        const newNextQuestion = await prisma.questionAttempt.create({
          data: {
            soloSessionId: soloSessionId,
            questionIndex: updatedQuestionsAnswered + 1,
            level: nextGeneratedQuestion.level,
            expression: nextGeneratedQuestion.expression,
            result: nextGeneratedQuestion.result,
            side: nextGeneratedQuestion.side,
            kthDigit: nextGeneratedQuestion.kthDigit,
            correctDigit: nextGeneratedQuestion.correctDigit,
          },
        })
  
        const { correctDigit, result, ...clientSafeQuestion } = newNextQuestion;
        const sanitizedQuestion = clientSafeQuestion;
      
        return res.json({
          success: true,
          isCorrect: true,
          roundNumber: updatedSession.currentRound,
          correctAnswer: question.correctDigit,
          nextQuestion: sanitizedQuestion
        });
      }
    }
    if (!isCorrect && !session.madeMistake) {
      const finalScore = Math.floor(session.bankedPoints / 2);
      await prisma.soloSession.update({
        where: { id: soloSessionId },
        data: {
          madeMistake: true,
          bankedPoints: finalScore,
          finalScore: finalScore,
          status: 'COMPLETED',
          updatedAt: today,
          endedAt: today,
        },
      });
      // implement urils.api.ApiResponse
      return res.json({
        success: true,
        correct: false,
        gameOver: true,
        reason: 'MISTAKE',
        finalScore: finalScore,
        correctAnswer: question.correctDigit,
        message: 'Wrong answer! Game over. Final score is 50% of banked points.',
      });
    }
  } catch (error) {
    console.log("Error in generating next Question",error);
    return res
        .status(500)
        .json(new ApiResponse(500, 'Failed to generate next question, Try Again ! !'));
  }
}

export const finalSessionSubmission  = async (req: Request, res: Response) => {
  try {
    const { soloSessionId, userId } = req.body;
    if (!soloSessionId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: soloSessionId, userId',
      });
    }
  
    const session = await prisma.soloSession.findUnique({
      where: { id: soloSessionId },
      include: {
        questions: {
          select: {
            id: true,
            questionIndex: true,
          },
        },
      },
    });
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }
    if (session.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Session does not belong to this user',
      });
    }
    if (session.status !== 'IN_PROGRESS') {
      return res.status(400).json({
        success: false,
        message: `Cannot finalize session: Session is already ${session.status}`,
      });
    }
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if(!user){
      return res.status(404).json({
        success: false,
        message: 'user not found',
      });
    }
  
    const isRoundComplete = session.questionsAnswered % 5 === 0;
    let finalPoint: number;
    let midRoundPenalty = false;
  
    if (!isRoundComplete && session.questionsAnswered > 0) {
      finalPoint = Math.floor(session.bankedPoints / 2);
      midRoundPenalty = true;
    } else {
      finalPoint = session.currentRound * gameConfig.single_player.points_per_round_factor;
    }
  
    const totalQuestions = session.questionsAnswered;
    const correctAnswers = session.correctAnswers;
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100 * 100) / 100 : 0;
    const roundsCompleted = Math.floor(totalQuestions / gameConfig.single_player.round_size);
  
    await prisma.soloSession.update({
      where: { id: soloSessionId },
      data: {
        status: 'COMPLETED',
        finalScore: finalPoint,
        endedAt: new Date(),
        quitEarly: false,
      },
    });
  
    return res.status(201).json({
      finalPoint: finalPoint,
      roundsCompleted: roundsCompleted,
      accuracy: accuracy,
      message: 'You can leave this window.',
      sessionEnded: true,
    })
  } catch (error) {
    console.log('Error in Submission. Try Again ! !');
    res.status(500).send('Error in Submission. Try Again ! !');
  }
}

export const leaderboard  = async (req: Request, res: Response) => {
   // 
}
