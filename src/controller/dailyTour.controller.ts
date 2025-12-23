import { Request, Response } from 'express';
import { ApiResponse } from '../utils/api/ApiResponse';
import prisma from '../prisma';
import { asyncHandler } from '../middlewares/asyncHandler';
import { ApiError } from '../utils/api/ApiError';
import { generateSeed } from '../utils/seed.utils';
import { generateQuestion } from '../utils/question.utils';
import {
  fetchUserRank,
  leaderBoardHandler,
  markDailyTounamentComplete,
  processQuestionScore,
  submitSession,
} from '../helpers/daily.helper';

export const fetchDailyAttempts = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId, dailyAttemptCount } = req;
    if (!userId) {
      throw new ApiError({
        statusCode: 400,
        message: 'Invalid user id',
      });
    }

    if (dailyAttemptCount == null) {
      throw new ApiError({
        statusCode: 400,
        message: 'error: failed to fetch daily attempt',
      });
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { dailyAttemptCount },
          'fetched daily tournament attempts'
        )
      );
  }
);

export const fetchDailyTournament = async (req: Request, res: Response) => {
  const { userId } = req;
  if (!userId) {
    throw new ApiError({
      statusCode: 400,
      message: 'Invalid user id',
    });
  }
  const today = new Date();
  const tournamentStartDate = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  );

  const tournament = await prisma.dailyTournament.findUnique({
    where: {
      date: tournamentStartDate,
    },
  });
  if (!tournament) {
    await markDailyTounamentComplete(tournamentStartDate);
    throw new ApiError({ statusCode: 400, message: 'tournament not started' });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tournament, 'fetched daily tournament details'));
};

export const createDailyTournament = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.userId;
    if (!userId) {
      throw new ApiError({
        statusCode: 400,
        message: 'Invalid user id',
      });
    }

    const today = new Date();
    const tournamentStartDate = new Date(
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
    );

    const dailyTournamentAttempt = await prisma.dailyTournament.create({
      data: {
        date: tournamentStartDate,
      },
    });

    res
      .status(201)
      .json(
        new ApiResponse(
          201,
          dailyTournamentAttempt,
          'Created daily tournament successfuly'
        )
      );
  }
);

export const createDailyTournamentSession = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.userId;
    const now = new Date();
    const endsAt = new Date(Date.now() + 5 * 60 * 1000);
    if (!userId) {
      throw new ApiError({
        statusCode: 400,
        message: 'Received invalid user id from auth handler',
      });
    }

    // pending (later)
    const today = new Date();
    const tournamentStartDate = new Date(
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
    );

    const sessionSeed = generateSeed();
    const existingSession = await prisma.dailyTournamentSession.findFirst({
      where: {
        userId: userId,
        status: 'IN_PROGRESS',
        endsAt: {
          lt: now,
        },
      },
      include: {
        questions: {
          orderBy: {
            questionIndex: 'desc',
          },
          take: 1,
        },
      },
    });

    if (existingSession) {
      submitSession(existingSession.id, userId, endsAt).catch((err) =>
        console.log('error updating session status: ', err)
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const dailyTournament = await tx.dailyTournament.upsert({
        where: {
          date: tournamentStartDate,
        },
        update: {},
        create: { date: tournamentStartDate },
      });

      await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          dailyAttemptCount: {
            increment: 1,
          },
        },
      });

      const session = await tx.dailyTournamentSession.create({
        data: {
          userId: userId,
          status: 'IN_PROGRESS',
          tournamentId: dailyTournament.id,
          sessionSeed: sessionSeed,
          endsAt,
        },
      });

      const generateFirstQuestion = await generateQuestion(1);

      const firstQuestion = await tx.questionAttempt.create({
        data: {
          level: 1,
          expression: generateFirstQuestion.expression,
          result: generateFirstQuestion.result,
          side: generateFirstQuestion.side,
          kthDigit: generateFirstQuestion.kthDigit,
          correctDigit: generateFirstQuestion.correctDigit,
          dailySessionId: session.id,
        },
      });

      return { dailyTournament, session, firstQuestion };
    });

    res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { session: result.session, firstQuestion: result.firstQuestion },
          'Create daily tournament session'
        )
      );
  }
);

export const submitQuestion = asyncHandler(
  async (req: Request, res: Response) => {
    const { dailyTournamentSessionId, questionId, answer, timeTaken } =
      req.body; // session id value can be later received from cookies

    if (
      !dailyTournamentSessionId ||
      !questionId ||
      answer == null ||
      timeTaken == null
    ) {
      throw new ApiError({
        statusCode: 400,
        message:
          'Received empty fields: dailyTournamentSessionId, questionId, answer, timeTaken',
      });
    }

    const session = await prisma.dailyTournamentSession.findFirst({
      where: {
        id: dailyTournamentSessionId,
      },
      select: {
        id: true,
        createdAt: true,
        currentLevel: true,
        currentScore: true,
      },
    });
    if (!session) {
      throw new ApiError({
        statusCode: 400,
        message: `Session with id ${dailyTournamentSessionId} does not exists`,
      });
    }

    console.log('previous score: ', session.currentScore);
    console.log('');
    const newGeneratedQuestion = await generateQuestion(session.currentLevel);

    const newQuestion = await prisma.questionAttempt.create({
      data: {
        level: 1,
        expression: newGeneratedQuestion.expression,
        result: newGeneratedQuestion.result,
        side: newGeneratedQuestion.side,
        kthDigit: newGeneratedQuestion.kthDigit,
        correctDigit: newGeneratedQuestion.correctDigit,
        dailySessionId: session.id,
      },
    });
    console.log('Correct answer: ', newQuestion.correctDigit);
    console.log('User answer: ', answer);
    console.log('Time taken to anser the question: ', timeTaken);

    const currentScore = await processQuestionScore(
      questionId,
      dailyTournamentSessionId,
      answer,
      timeTaken
    );

    res.status(202).json(
      new ApiResponse(
        202,
        {
          questionId,
          newQuestion,
          acknowledged: true,
          currentScore,
        },
        'Answer submitted'
      )
    );
  }
);

export const finalSessionSubmission = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.userId;
    if (!userId) {
      throw new ApiError({
        statusCode: 400,
        message: 'Received invalid user id from auth handler',
      });
    }

    // ended at (get from frontend)
    let { sessionId } = req.body; // sessionId can be later extracted from cookies

    // delete this later after linking frontend

    if (!sessionId) {
      throw new ApiError({
        statusCode: 400,
        message: 'Received empty fields:  sessionId, endedAt',
      });
    }

    const updatedSession = await submitSession(sessionId, userId);

    res
      .status(202)
      .json(
        new ApiResponse(202, updatedSession, 'Successful final submission')
      );
  }
);

export const minuteScoreUpdate = asyncHandler(
  async (req: Request, res: Response) => {
    const minute = req.params['minute'];
    console.log(minute);

    res.status(200).json({ sucess: true });
  }
);

export const getDailyLeaderboard = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.userId;
    let { page } = req.query;
    if (!page) page = '1';

    let pageNum = Number(page);
    if (pageNum <= 0) {
      pageNum = 1;
    }

    const leaderboardUsers = await leaderBoardHandler(pageNum);

    const userRank = await fetchUserRank(userId);
    res
      .status(200)
      .json(
        new ApiResponse(200, { leaderboard: leaderboardUsers, rank: userRank })
      );
  }
);
