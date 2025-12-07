import { Request, Response } from 'express';
import { ApiResponse } from '../utils/api/ApiResponse';
import prisma from '../prisma';
import { asyncHandler } from '../middlewares/asyncHandler';
import { ApiError } from '../utils/api/ApiError';
import { generateSeed } from '../utils/seed.utils';
import { UserTournamentStatus } from '../generated/prisma';
import { generateQuestion } from '../utils/question.utils';
import { processQuestionScore } from '../helpers/daily.helper';

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
      const lastQuestion = existingSession.questions[0];
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            session: existingSession,
            question: lastQuestion,
          },
          'session already exists'
        )
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
      !timeTaken
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
      },
    });
    if (!session) {
      throw new ApiError({
        statusCode: 400,
        message: `Session with id ${dailyTournamentSessionId} does not exists`,
      });
    }
    const newGeneratedQuestion = await generateQuestion(session.currentLevel);

    console.time('createquestionattempt');
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
    console.timeEnd('createquestionattempt');

    res.status(202).json(
      new ApiResponse(
        202,
        {
          questionId,
          newQuestion,
          acknowledged: true,
        },
        'Answer submitted'
      )
    );

    processQuestionScore(
      questionId,
      dailyTournamentSessionId,
      answer,
      timeTaken
    ).catch((err) => console.log('Error processing score: ', err));
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
    let { sessionId, endedAt } = req.body; // sessionId can be later extracted from cookies

    // delete this later after linking frontend
    const now = new Date();
    endedAt = new Date(now.getTime() + 5 * 60 * 1000);
    //

    // console.log(sessionId, endedAt);
    if (!sessionId || !endedAt) {
      throw new ApiError({
        statusCode: 400,
        message: 'Received empty fields:  sessionId, endedAt',
      });
    }

    const session = await prisma.dailyTournamentSession.findFirst({
      where: {
        id: sessionId,
      },
    });
    if (!session) {
      throw new ApiError({ statusCode: 400, message: 'Invalid session id' });
    }

    const currentBestScore = session.bestScore;
    const finalScore = session.currentScore;

    const updatedSession = await prisma.dailyTournamentSession.update({
      where: {
        id: sessionId,
      },
      data: {
        endedAt,
        status: UserTournamentStatus.COMPLETED,
        finalScore,
        bestScore:
          finalScore > currentBestScore ? finalScore : currentBestScore,
      },
    });

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
