import { Request, Response } from 'express';
import prisma from '../prisma';
import gameConfig from "../config/game.config"
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
      // console.log("- - ",req.userData);
      
      const { userData } = req;
      const userId = userData.id; 
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
      // if (updatedUser.soloAttemptCount > freeAttemptsAllowed) {
      //   throw new ApiError({
      //       statusCode: 501,
      //       message: 'No Free Attempt Available for Today',
      //   });
      // }
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
              questionIndex: 1,
              level: question.level,
              expression: question.expression,
              result: question.result,
              side: question.side,
              kthDigit: question.kthDigit,
              correctDigit: question.correctDigit,
            },
          },
        },
        include: {
          questions: {
            select: {
              id: true,
              questionIndex: true,
              level: true,
              expression: true,
              result: true,
              side: true,
              kthDigit: true,
              correctDigit: true,
            },
          },
        },
      });
      
      const sanitizedAttemp = {
        id: newAttempt.id,
        userId: newAttempt.userId,
      }
      const createdQuestion = newAttempt.questions[0];
      const { correctDigit, result, ...clientSafeQuestion } = createdQuestion;
      // const sanitizedQuestion = {...clientSafeQuestion, questionId: createdQuestion.id};
      const sanitizedQuestion = clientSafeQuestion;
      
      return res.status(201).json(new ApiResponse(
        200,
        {sanitizedQuestion, sanitizedAttemp},
        'successfuly created soloSession'
      ));
    } catch (error) {
      console.error('start Solo error:', error);
      throw new ApiError({
          statusCode: 500,
          message: 'Failed to start Solo',
      }); 
    }
}

export const continueSolo = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    const { userData } = req;
    const userId = userData.id;
    const soloSessionId = sessionId;
    console.log(req.body);
    
    if(!userId || !soloSessionId){
      throw new ApiError({
          statusCode: 400,
          message: 'invalid userId, soloSessionId',
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
        id: soloSessionId,
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
      throw new ApiError({
        statusCode: 403,
        message: 'Not authorized for this session',
      });
    }
    if (session.status !== "IN_PROGRESS") {
      throw new ApiError({
        statusCode: 400,
        message: 'Session is not active',
      });
    }
  
    const roundSize = gameConfig.single_player.round_size;
    const levelIncrementEvery = gameConfig.single_player.level_increase_every_n_questions || 2;
    const currentLevel = session.currentLevel;
    const questionsAnswered = session.questionsAnswered;
    const roundsCompleted = Math.floor(questionsAnswered / roundSize); 
    // let newLevel = currentLevel + Math.floor(roundsCompleted / levelIncrementEvery) + 1;
    let newLevel = Math.floor(questionsAnswered / levelIncrementEvery) + 1;
    newLevel = newLevel < 5 ? newLevel : 5; 
    
    const question = await generateQuestion(newLevel);
    const updatedSession = await prisma.soloSession.update({
      where: { id: soloSessionId },
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
      select: {
        bankedPoints: true,
        currentRound: true,
        currentLevel: true,
        questions: {
          select: {
            id: true,
            questionIndex: true,
            level: true,
            expression: true,
            result: true,
            side: true,
            kthDigit: true,
            correctDigit: true,
          },
        },
      },
    });
    const { correctDigit, result, ...clientSafeQuestion } = question;
    const questionCount = updatedSession.questions.length;
    console.log("new Session : ",updatedSession, " len : ",questionCount, " last qs : ", updatedSession.questions[questionCount-1]);
    const sanitizedQuestion = {...clientSafeQuestion, "id": updatedSession.questions[questionCount-1].id};
    // const sanitizedQuestion = {...clientSafeQuestion};

    return res.status(200).json(new ApiResponse(
      200,
      {
        isRoundCompleted: false,
        bankedPoints: updatedSession.bankedPoints, 
        round: updatedSession.currentRound,
        level: updatedSession.currentLevel,
        questions: sanitizedQuestion,
      },
      'Next round started successfully'
    ));
  } catch (error) {
    console.error('continueSolo error:', error);
    throw new ApiError({
        statusCode: 500,
        message: 'Failed to continue solo session',
    });
  }
}

export const quitSolo  = async (req: Request, res: Response) => {
  try {      
    const { sessionId } = req.body;
    const { userData } = req;
    const userId = userData.id;
    const soloSessionId = sessionId;
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
  
    return res.status(200).json(
      new ApiResponse(
      200,
      {
        sessionEnded: true,
        finalPoint: finalPoint,
        roundsCompleted: session.currentRound,
      },
      'You can leave this window.'
    ));
  } catch (error) {
    console.error('quitSolo error:', error);
    throw new ApiError({
        statusCode: 500,
        message: 'Failed to quit solo session, Try Again ! !',
    });
  }

}

export const nextQuestion  = async (req: Request, res: Response) => {
  try {
    const { soloSessionId, questionId, userAnswer, time} = req.body;
    const {userData} = req;
    const userId = userData.id;
    // const soloSessionId = userData.soloSessionId;
    console.log("next : ",req.body);
    
    const today = new Date();
    if(!soloSessionId || !userId || !questionId || (userAnswer === null || userAnswer === undefined) || !time){
      throw new ApiError({
          statusCode: 400,
          message: 'Missing required fields: userId, soloSessionId, questionId, userAnswer, time',
      });
    }
    if (typeof userAnswer !== 'number' || userAnswer < 0 || userAnswer > 9) {
      throw new ApiError({
          statusCode: 400,
          message: 'userAnswer must be a number between 0 and 9',
      });
    }
    console.log("time : ",today);
    
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
      throw new ApiError({
          statusCode: 400,
          message: `Question not found in this session`,
      });
    }
    if (question.soloSessionId !== soloSessionId) {
      throw new ApiError({
          statusCode: 400,
          message: `Question does not belong to this session`,
      });
    }
    console.log("qs : ",question);
    
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
        res.status(201).json(new ApiResponse (
          200,
          {
            success: true,
            isCorrect: true,
            isRoundCompleted: true,
            roundNumber: updatedSession.currentRound,
            correctAnswer: question.correctDigit,
            bankedPoint: updatedSession.bankedPoints,
          },
          `${session.currentRound} completed. Select CONTINUE to move ahead.`
        ))
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
        console.log("question created : ", newNextQuestion);
        const { id, questionIndex, expression, kthDigit, level, side } = newNextQuestion;
        const sanitizedQuestion = {id,questionIndex,expression,kthDigit,level,side};
      
        return res.json(new ApiResponse(
          200,
          {
            success: true,
            isCorrect: true,
            isRoundCompleted: false,
            correctAnswer: question.correctDigit,
            roundNumber: updatedSession.currentRound,
            bankedPoint: updatedSession.bankedPoints,
            nextQuestion: sanitizedQuestion
          },
          'Next Question Created'
        ));
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
      return res.json(new ApiResponse(
        200,
        {
          success: false,
          gameOver: true,
          reason: 'MISTAKE',
          finalScore: finalScore,
          correctAnswer: question.correctDigit,
        },
        'Wrong answer! Game over. Final score is 50% of banked points.'
      ));
    }
  } catch (error) {
    console.log("Error in generating next Question",error);
    throw new ApiError({ statusCode: 500, message: 'Error in generating next Question' });
  }
}

export const finalSessionSubmission  = async (req: Request, res: Response) => {
  try {
    const {userData} = req.body;
    const userId = userData.id;
    const soloSessionId = userData.soloSessionId;
    if (!soloSessionId || !userId) {
      throw new ApiError({ statusCode: 404, message: 'Missing required field: soloSessionId, userId' });
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
      throw new ApiError({ statusCode: 404, message: 'Session not found' });
    }
    if (session.userId !== userId) {
      throw new ApiError({ statusCode: 403, message: 'Unauthorized: Session does not belong to this user' });
    }
    if (session.status !== 'IN_PROGRESS') {
      throw new ApiError({ statusCode: 400, message: `Cannot finalize session: Session is already ${session.status}` });
    }
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if(!user){
      throw new ApiError({ statusCode: 404, message: 'user not found' });
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
    
    return res.status(201).json(new ApiResponse(
      200,
      {
        finalPoint: finalPoint,
        roundsCompleted: roundsCompleted,
        accuracy: accuracy,
        sessionEnded: true,
        success: false,
      },
      'You can leave this window.'
    ));
  } catch (error) {
    console.log('Error in Submission. Try Again ! !');
    throw new ApiError({ statusCode: 505, message: 'Error in Submission. Try Again ! !' });
  }
}

export const getRemainingSoloAttempts = async ( req: Request, res: Response ) => {
  try {
    const {userData} = req;
    const userId = userData.id;
    console.log("id :- ",userId);
    
    if (!userId) {
      throw new ApiError({ statusCode: 401, message: 'Unauthorized' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        soloAttemptCount: true,
      },
    });
    
    if (!user) {
      throw new ApiError({ statusCode: 404, message: 'User not found' });
    }
    console.log("user",user);
    
    const config = await prisma.gameConfig.findFirst({
      where: { isActive: true },
      select: {
        single_player: true,
      },
      orderBy: { createdAt: "desc" },
    });
    
    if (!config) {
      throw new ApiError({ statusCode: 500, message: 'Active game config not found' });
    }
    console.log("config ",config);
    
    const singlePlayerConfig = config.single_player as {
      daily_free_attempts: number;
    };

    const maxDailyAttempts =
    singlePlayerConfig.daily_free_attempts ?? 0;
    
    const remainingAttempts = Math.max( maxDailyAttempts - user.soloAttemptCount, 0 );
    
    return res.status(200).json(new ApiResponse(
      200,
      {
        ok: true,
        totalDailyAttempts: maxDailyAttempts,
        usedAttempts: user.soloAttemptCount,
        remainingAttempts,
      },
      'attemps fetched.'
    ));
  } catch (error) {
    console.error("getRemainingSoloAttempts error:", error);
    throw new ApiError({ statusCode: 500, message: 'Internal server error' });

  }
};

function mapPercentileToPoints(distribution: { range: string; points: number }[], percentile: number) {
  if (!distribution || distribution.length === 0) {
    // fallback mapping if no config found
    if (percentile <= 1) return 30;
    if (percentile <= 5) return 20;
    if (percentile <= 10) return 15;
    if (percentile <= 20) return 10;
    if (percentile <= 50) return 5;
    if (percentile <= 75) return 2;
    return 1;
  }

  // iterate through config buckets and check which range contains percentile
  for (const bucket of distribution) {
    const r = bucket.range.trim();
    if (r.includes("-")) {
      const [minStr, maxStr] = r.split("-");
      const min = parseFloat(minStr);
      const max = parseFloat(maxStr);
      if (percentile >= min && percentile <= max) return bucket.points;
    } else {
      // if single number like "1", treat as 0..1%
      const val = parseFloat(r);
      if (percentile >= 0 && percentile <= val) return bucket.points;
    }
  }

  // fallback to last entry's points or 0
  return distribution[distribution.length - 1]?.points ?? 0;
}

/**
 * Convert "YYYY-MM-DD" to a Date range in IST: [start, end)
 * This makes queries for "that date" consistent with IST boundaries.
 */
function getIstRange(dateStr: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) throw new Error("Invalid date format; use YYYY-MM-DD");
  // Create an ISO string with +05:30 timezone; JS Date will parse it
  const start = new Date(`${dateStr}T00:00:00+05:30`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1); // next day at 00:00 IST
  return { start, end };
}

// ApiResponce, ApiError Not Implemented
export const leaderboard = async (req: Request, res: Response) => {
  try {
    const { todayDate, start = 1, end = 10 } = req.body;

    // 1) Validate inputs
    if (!todayDate) {
      return res
        .status(400)
        .json({ ok: false, error: "todayDate required in body" });
    }

    if (typeof start !== "number" || typeof end !== "number") {
      return res
        .status(400)
        .json({ ok: false, error: "start and end must be numbers" });
    }

    if (start < 1 || end < start) {
      return res
        .status(400)
        .json({ ok: false, error: "Invalid start/end range" });
    }
    // 2) Compute IST day range
    let startDate: Date, endDate: Date;
    try {
      ({ start: startDate, end: endDate } = getIstRange(todayDate));
    } catch (e: any) {
      return res.status(400).json({ ok: false, error: e.message });
    }

    // 3) Load config distribution
    const distribution = gameConfig?.points_distribution?.single_player_distribution ?? [];

    // 4) fetch all finished SoloSessions for that date with a finalScore
    //    We only select needed fields to keep the query small
    const sessions = await prisma.soloSession.findMany({
      where: {
        date: { gte: startDate, lt: endDate },
        finalScore: { not: null },
        status: { in: ["COMPLETED"] },
      },
      select: {
        id: true,
        userId: true,
        finalScore: true,
        updatedAt: true,
        endedAt: true,
      },
    });

    if (!sessions.length) {
      return res.status(200).json({
        ok: true,
        totalPlayers: 0,
        start,
        end,
        count: 0,
        results: [],
        message: "No sessions found for this date",
      });
    }

    // 5) group sessions by userId and pick best finalScore per user
    //    tie-break rule: if scores equal, earlier updatedAt wins
    const bestByUser = new Map<
      string,
      { score: number; updatedAt?: Date | null; endedAt?: Date | null }
    >();
    for (const s of sessions) {
      const uid = s.userId;
      const score =
        typeof s.finalScore === "number"
          ? s.finalScore
          : parseFloat(String(s.finalScore));

      const cur = bestByUser.get(uid);

      if (!cur) {
        bestByUser.set(uid, {
          score,
          updatedAt: s.updatedAt,
          endedAt: s.endedAt,
        });
        continue;
      }

      if (score > cur.score) {
        bestByUser.set(uid, {
          score,
          updatedAt: s.updatedAt,
          endedAt: s.endedAt,
        });
      } else if (score === cur.score) {
        const curUpd = cur.updatedAt
          ? new Date(cur.updatedAt).getTime()
          : Number.MAX_SAFE_INTEGER;
        const newUpd = s.updatedAt
          ? new Date(s.updatedAt).getTime()
          : Number.MAX_SAFE_INTEGER;

        if (newUpd < curUpd) {
          bestByUser.set(uid, {
            score,
            updatedAt: s.updatedAt,
            endedAt: s.endedAt,
          });
        }
      }
    }

    // 6) turn map into array and sort by score desc, updatedAt asc
     const rows = Array.from(bestByUser.entries()).map(([userId, v]) => ({
      userId,
      score: v.score,
      updatedAt: v.updatedAt,
      endedAt: v.endedAt,
    }));

    rows.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      const aUpd = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bUpd = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      if (aUpd !== bUpd) return aUpd - bUpd;

      const aEnd = a.endedAt ? new Date(a.endedAt).getTime() : 0;
      const bEnd = b.endedAt ? new Date(b.endedAt).getTime() : 0;
      return aEnd - bEnd;
    });

    // 7) compute rank, percentile and coinPoints; prepare upsert ops
    const totalPlayers = rows.length;
    const dateOnly = startDate.toISOString().slice(0, 10);

    const results: {
      userId: string;
      score: number;
      rank: number;
      percentile: number;
      coinPoints: number;
    }[] = [];

    const upsertOps = [];

    for (let i = 0; i < rows.length; i++) {
      const rank = i + 1;
      const percentile = (rank / totalPlayers) * 100;
      const coinPoints = mapPercentileToPoints(distribution, percentile);

      results.push({
        userId: rows[i].userId,
        score: rows[i].score,
        rank,
        percentile,
        coinPoints,
      });

      const deterministicId = `${rows[i].userId}_${dateOnly}`;

      upsertOps.push(
        prisma.soloLeaderboard.upsert({
          where: { id: deterministicId },
          create: {
            id: deterministicId,
            date: startDate,
            userId: rows[i].userId,
            score: rows[i].score,
            rank,
            percentile,
            coinPoints,
          },
          update: {
            score: rows[i].score,
            rank,
            percentile,
            coinPoints,
          },
        })
      );
    }
    if (start === 1) {
      await prisma.$transaction(upsertOps);
    }
    // 8) Pagination (1-based)
    const fromIndex = start - 1;
    const toIndex = Math.min(end, totalPlayers);
    const paginatedResults = results.slice(fromIndex, toIndex);

    return res.status(200).json({
      ok: true,
      totalPlayers,
      start,
      end: toIndex,
      count: paginatedResults.length,
      results: paginatedResults,
    });
  } catch (err) {
    console.error("[solo leaderboard] error:", err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
};