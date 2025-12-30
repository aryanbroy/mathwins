import { UserTournamentStatus } from '../generated/prisma';
import prisma from '../prisma';
import { ApiError } from '../utils/api/ApiError';
import { calculateDailyScore } from '../utils/score.utils';

export const processQuestionScore = async (
  questionId: string,
  dailyTournamentSessionId: string,
  answer: number,
  timeTaken: number
): Promise<number> => {
  console.log('evaluating score...');
  console.log('');
  const question = await prisma.questionAttempt.findFirst({
    where: {
      id: questionId,
    },
    select: {
      correctDigit: true,
    },
  });
  if (!question) {
    throw new ApiError({
      statusCode: 400,
      message: `No question with id ${questionId} exists`,
    });
  }

  const isCorrect = question.correctDigit === answer;

  const incrementalScore = calculateDailyScore(
    answer,
    question.correctDigit,
    timeTaken
  );
  console.log('Score to increment: ', incrementalScore);
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
        increment: isCorrect ? 1 : 0,
      },
      currentLevel: {
        increment: isCorrect ? 1 : 0,
      },
    },
    select: {
      currentScore: true,
    },
  });
  console.log(
    'score evaluation completed, final score: ',
    updatedSession.currentScore
  );

  return updatedSession.currentScore;
};

export const markDailyTounamentComplete = async (tournamentStartDate: Date) => {
  await prisma.dailyTournament.updateMany({
    data: {
      status: 'CLOSED',
    },
    where: {
      date: {
        gt: tournamentStartDate,
      },
    },
  });
};

export const markDailySessionComplete = async (sessionId: string) => {
  await prisma.dailyTournamentSession.update({
    data: {
      status: 'COMPLETED',
    },
    where: {
      id: sessionId,
    },
  });
};

export const submitSession = async (
  sessionId: string,
  userId: string,
  endedAt = new Date()
) => {
  const result = await prisma.$transaction(async (tx) => {
    const session = await tx.dailyTournamentSession.findFirst({
      where: {
        id: sessionId,
      },
    });
    if (!session) {
      throw new ApiError({ statusCode: 400, message: 'Invalid session id' });
    }

    const finalScore = session.currentScore;

    const updatedSession = await tx.dailyTournamentSession.update({
      where: {
        id: sessionId,
      },
      data: {
        endedAt,
        status: UserTournamentStatus.COMPLETED,
        finalScore,
      },
    });

    const now = new Date();
    const tournamentStartDate = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
    );

    console.log('Values:');
    console.log({ userId, tournamentStartDate, finalScore });

    await tx.$queryRaw`
        INSERT INTO "DailyLeaderboard" ("id", "userId", "date", "bestScore", "updatedAt")
        VALUES (gen_random_uuid(), ${userId}, ${tournamentStartDate}, ${finalScore}, NOW())
        ON CONFLICT ("userId", "date")
        DO UPDATE SET "bestScore" = GREATEST("DailyLeaderboard"."bestScore", ${finalScore})
      `;

    return updatedSession;
  });

  return result;
};

export const leaderBoardHandler = async (page: number) => {
  const take = 10;
  const skip = (page - 1) * take;

  const now = new Date();
  const tournamentStartDate = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  );

  const leaderboard = await prisma.dailyLeaderboard.findMany({
    where: {
      date: tournamentStartDate,
    },
    orderBy: {
      bestScore: 'desc',
    },
    skip: skip,
    take: take,
    select: {
      userId: true,
      bestScore: true,
      user: {
        select: {
          username: true,
        },
      },
    },
  });

  return leaderboard;
};

export const fetchUserRank = async (userId: string) => {
  const now = new Date();
  const tournamentStartDate = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  );

  const leaderboards = await prisma.dailyLeaderboard.findMany({
    where: {
      date: tournamentStartDate,
    },
    orderBy: {
      bestScore: 'desc',
    },
  });

  const rank =
    leaderboards.findIndex((leaderboard) => leaderboard.userId === userId) + 1;

  return rank;
};
