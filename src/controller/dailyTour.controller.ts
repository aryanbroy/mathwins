import { Request, Response } from 'express';
import { ApiResponse } from '../utils/api/ApiResponse';
import prisma from '../prisma';
import { asyncHandler } from '../middlewares/asyncHandler';
import { ApiError } from '../utils/api/ApiError';
import { generateSeed } from '../utils/seed.utils';
import { calculateScore } from '../utils/score.utils';
import { UserTournamentStatus } from '../generated/prisma';

export const fetchDailyTournament = async (req: Request, res: Response) => {
  try {
    const { sessionId, tournamentId, difficultySeed, timer } = req.body;
    res.status(200).json({ sessionId, tournamentId, difficultySeed, timer });
  } catch (err) {
    console.log('Error fetching daily tournament: ', err);
    res.status(500).json(err);
  }
};

export const createDailyTournament = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.userId;
    if (!userId) {
      throw new ApiError({
        statusCode: 400,
        message: 'Received invalid user id from auth handler',
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

      const session = await prisma.dailyTournamentSession.create({
        data: {
          userId: userId,
          tournamentId: dailyTournament.id,
          sessionSeed: sessionSeed,
        },
      });
      return { dailyTournament, session };
    });

    res
      .status(201)
      .json(
        new ApiResponse(201, result.session, 'Create daily tournament session')
      );
  }
);

export const updateSessionScore = asyncHandler(
  async (req: Request, res: Response) => {
    const { dailyTournamentSessionId, questionId, answer, timeTaken } =
      req.body; // session id value can be later received from cookies

    if (!dailyTournamentSessionId || !questionId || !answer || !timeTaken) {
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
    });
    if (!session) {
      throw new ApiError({
        statusCode: 400,
        message: `Session with id ${dailyTournamentSessionId} does not exists`,
      });
    }

    const question = await prisma.questionAttempt.findFirst({
      where: {
        id: questionId,
      },
    });
    if (!question) {
      throw new ApiError({
        statusCode: 400,
        message: `No question with id ${questionId} exists`,
      });
    }

    if (question.result != answer) {
      // dont update the score here (fix this later)
      await prisma.dailyTournamentSession.update({
        where: {
          id: dailyTournamentSessionId,
        },
        data: {
          questionsAnswered: {
            increment: 1,
          },
        },
      });
      return res.status(200).json({ success: true, answer: 'wrong' });
    }

    const incrementalScore = calculateScore(question.level, timeTaken);

    const updatedSession = await prisma.dailyTournamentSession.update({
      where: {
        id: dailyTournamentSessionId,
      },
      data: {
        currentScore: {
          increment: incrementalScore,
        },
        questionsAnswered: {
          increment: 1,
        },
        correctAnswers: {
          increment: 1,
        },
      },
    });
    res.status(202).json(new ApiResponse(202, updatedSession, 'Updated score'));
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

    const { sessionId, finalScore, endedAt } = req.body; // sessionId can be later extracted from cookies

    if (!finalScore || !sessionId || endedAt) {
      throw new ApiError({
        statusCode: 400,
        message: 'Received empty fields: finalScore, sessionId, endedAt',
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
