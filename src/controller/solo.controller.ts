import { Request, Response } from 'express';
import prisma from '../prisma';
import gameConfig from '../utils/game.config';
import { ApiResponse } from '../utils/api/ApiResponse';
import { generateQuestion, generateQuestions } from '../utils/question.utils';
import { generateSeed } from '../utils/seed.utils';
import { ApiError } from '../utils/api/ApiError';
import { calculateSoloScore, calculateSoloPoint, calculateSoloCoinPoint } from '../utils/score.utils';

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
  
      const { correctDigit, ...clientSafeQuestion } = question;
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
  try {
    const {soloSessionId, userId} = req.body();
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
    const finalScore = calculateSoloScore(session.correctAnswers, session.questionsAnswered);
    const finalPoints = calculateSoloPoint(finalScore);

    const updatedSoloSession = await prisma.soloSession.update({
      where: {
        id: soloSessionId
      },
      data: {
        updatedAt: today,
        endedAt: today,
        status: 'COMPLETED',
        bankedPoints: finalPoints,
        finalScore: finalScore,
        coinPointsEarned: finalPoints,
        quitEarly: true,
      }
    })
    if(!updatedSoloSession){
      throw new ApiError({
        statusCode: 400,
        message: 'You can only quit solo-tournament at the end of a round',
      });
    }
    
    // - find rank of user
    // - Calculate current session rank within top 10
    const top10 = await prisma.soloSession.findMany({
      where: { 
        userId, 
        date: today, 
        status: 'COMPLETED' 
      },
      orderBy: { finalScore: 'desc' },
      take: 10,
      select: { id: true, finalScore: true }
    })
    // search userId 
    console.log(top10);
    
    // Calculate coin points (only if in top10)
    // - If isTop10:
    // -- Calculate coin points based on rank/formula
    // -- Update session: coinPointsEarned
    // - If NOT in top 10: coinPointsEarned = 0
  
    return res.status(200).json({
      message: 'You can leave this window.',
      sessionEnded: true,
      Leaderboard: top10,
      yourPoint: finalPoints,
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
    if(!soloSessionId || !userId || questionId || userAnswer || time){
      throw new ApiError({
          statusCode: 400,
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
    let points = 0;
    if (isCorrect) {
      const basePointsMap: { [key: number]: number } = {
        1: 10,
        2: 15,
        3: 20,
        4: 25,
        5: 30,
      };
      const basePoints = basePointsMap[question.level] || 10;
  
      const clampedTime = Math.min(time, 10000);
      const timeBonus = ((10000 - clampedTime) / 10000) * basePoints * 0.5;
  
      points = Math.floor(basePoints + timeBonus);

      const updatedQuestionsAnswered = session.questionsAnswered + 1;
      const updatedCorrectAnswers = isCorrect ? session.correctAnswers + 1 : session.correctAnswers;
      const newNextLevel = Math.floor(updatedQuestionsAnswered / 2) + 1;
      const nextGeneratedSeed = generateSeed();
      let nextGeneratedQuestion: QuestionData;
      nextGeneratedQuestion = await generateQuestion(newNextLevel);
      const [updatedSession, newNextQuestion] = await prisma.$transaction([
        // Update session progress
        prisma.soloSession.update({
          where: { id: soloSessionId },
          data: {
            questionsAnswered: updatedQuestionsAnswered,
            correctAnswers: updatedCorrectAnswers,
            currentLevel: newNextLevel,
          },
        }),
        prisma.questionAttempt.create({
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
        }),
      ]);

      const { correctDigit, ...clientSafeQuestion } = newNextQuestion;
      const sanitizedQuestion = clientSafeQuestion;
    
      // TODO 8: generate next Question
    
      return res.json({
        success: true,
        isCorrect: true,
        pointsEarned: points,
        roundCompleted: true,
        roundNumber: updatedSession.currentRound,
        roundPoints: basePoints,
        totalBanked: points,
        correctAnswer: question.correctDigit,
        nextQuestion: sanitizedQuestion
      });
    }
    if (!isCorrect && !session.madeMistake) {
      const finalScore = Math.floor(session.bankedPoints / 2);
  
      // Update session - game over
      await prisma.soloSession.update({
        where: { id: soloSessionId },
        data: {
          madeMistake: true,
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
    console.log("",error);
    
  }
}

export const finalSessionSubmission  = async (req: Request, res: Response) => {
  // TODO 1: Extract & validate request data
  //   - sessionId
  //   - userId (from auth middleware)
  //   - reason: 'time_limit' | 'max_rounds' | 'user_choice' (optional)

  // TODO 2: Fetch session from database
  //   - Include: questions (to verify completion)
  //   - Validate: status must be 'IN_PROGRESS'
  //   - Validate: session belongs to userId

  // TODO 3: Validate session is actually complete
  //   - Check: questionsAnswered % 5 === 0 (round completed)
  //   - If mid-round: return error OR auto-complete with penalty

  // TODO 4: Calculate final statistics
  //   - totalQuestionsAnswered
  //   - totalCorrectAnswers
  //   - accuracy = (correctAnswers / questionsAnswered) * 100
  //   - roundsCompleted = questionsAnswered / 5

  // TODO 5: Calculate final score
  //   - If quit mid-round (shouldn't happen): finalScore = bankedPoints / 2
  //   - If completed round: finalScore = bankedPoints
  //   - Store in variable

  // TODO 6: Update session to COMPLETED
  //   - Set: { 
  //       status: 'COMPLETED', 
  //       finalScore, 
  //       endedAt: new Date() 
  //     }

  // TODO 7: Get user's top 10 sessions for today
  //   - Query: user's completed solo sessions for today
  //   - Order by: finalScore DESC
  //   - Take: 10
  //   - Calculate rank of current session

  // TODO 8: Calculate coin points for this session
  //   - Only if session is in top 10
  //   - Use scoring formula (from config or service)
  //   - Update session: coinPointsEarned

  // TODO 9: Update user statistics (optional)
  //   - Increment total games played
  //   - Update lifetime stats
  //   - (Or handle this in cron job)

  // TODO 10: Return success response
  //   - Include: {
  //       finalScore,
  //       bankedPoints,
  //       roundsCompleted,
  //       accuracy,
  //       rank (within today's top 10),
  //       isTop10,
  //       coinPointsEarned,
  //       statistics: { totalQuestions, correctAnswers, accuracy }
  //     }

  // TODO 11: Error handling
  //   - Wrap in try-catch
  //   - Handle invalid session, incomplete rounds, etc.
}

export const minuiteLeaderboard  = async (req: Request, res: Response) => {

}
