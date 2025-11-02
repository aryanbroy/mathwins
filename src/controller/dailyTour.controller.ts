import { Request, Response } from 'express';
import { createQuestions } from '../utils/question.utils';
import { ApiResponse } from '../utils/api/ApiResponse';
import prisma from '../prisma';

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

export const createDailyTournament = async (req: Request, res: Response) => {
  try {
    const numOfQuestions = 5;
    const questions = await createQuestions(numOfQuestions);

    const userId = req.userId;
    if (!userId) {
      res.status(400).json(new ApiResponse(400, [], 'Invalid user id'));
    }
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
      },
    });

    if (!user) {
      res.status(400).json(new ApiResponse(400, [], 'No such user exists'));
    }

    const { score } = req.body;

    const dailyTournamentAttempt = await prisma.dailyTournamentAttempt.create({
      data: {
        userId: userId,
        score,
      },
    });
    res.status(201).json(
      new ApiResponse(
        201,
        {
          dailyTournamentAttempt,
          questions,
        },
        'Created daily tournament successfuly'
      )
    );
  } catch (err) {
    res.status(500).json(err);
  }
};

// export const submitDailyTournament = async () => {
// check middleware for validation
// fetch answer array from req.body
// calculate time difference between createdAt and submitedAt (not needed)
// calculate score (compare answers)
// update DailyTournamentAttempt table - add score and submitedAt
// return score and success
// };
