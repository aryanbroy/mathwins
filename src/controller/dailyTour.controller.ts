import { Request, Response } from 'express';
import { ApiResponse } from '../utils/api/ApiResponse';
import prisma from '../prisma';
import { asyncHandler } from '../middlewares/asyncHandler';
import { ApiError } from '../utils/api/ApiError';
import { generateSessionSeed } from '../utils/seed.util';
import { throwDeprecation } from 'process';
import { calculateScore } from '../utils/score.util';

export const fetchDailyTournament = async (req: Request, res: Response) => {
  try {
    const { sessionId, tournamentId, difficultySeed, timer } = req.body;
    res.status(200).json({ sessionId, tournamentId, difficultySeed, timer });
  } catch (err) {
    console.log('Error fetching daily tournament: ', err);
    res.status(500).json(err);
  }
};

// create x no. of questions
// create new DailyTournamentAttempt table
// includes: userid, createdAt, score = 0
// return created questions without answers

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
    res.status(201).json(
      new ApiResponse(
        201,
        {
          dailyTournamentAttempt,
        },
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

    const today = new Date();
    const tournamentStartDate = new Date(
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
    );

    let dailyTournament = await prisma.dailyTournament.findFirst({
      where: {
        date: tournamentStartDate,
      },
    });

    if (!dailyTournament) {
      console.log('no current tournament exists, creating one');
      dailyTournament = await prisma.dailyTournament.create({
        data: {
          date: tournamentStartDate,
        },
      });
    }

    const sessionSeed = generateSessionSeed();

    const session = await prisma.dailyTournamentSession.create({
      data: {
        userId: userId,
        tournamentId: dailyTournament.id,
        sessionSeed: sessionSeed,
      },
    });

    res
      .status(201)
      .json(new ApiResponse(201, session, 'Create daily tournament session'));
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
      console.log(question.result, answer);
      res.status(200).json({ success: true, answer: 'wrong' });
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
      },
    });
    res.status(202).json(new ApiResponse(202, updatedSession, 'Updated score'));
  }
);

// check middleware for validation
// fetch answer array from req.body
// calculate time difference between createdAt and submitedAt (not needed)
// calculate score (compare answers)
// update DailyTournamentAttempt table - add score and submitedAt
// return score and success

// pending
export const finalSessionSubmission = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.userId;
    if (!userId) {
      throw new ApiError({
        statusCode: 400,
        message: 'Received invalid user id from auth handler',
      });
    }

    const { finalScore } = req.body;
    if (!finalScore) {
      throw new ApiError({
        statusCode: 400,
        message: 'Received empty fields: finalScore',
      });
    }

    res.status(200).json({ success: true });
  }
);
