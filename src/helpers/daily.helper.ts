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
  const session = await prisma.dailyTournamentSession.findFirst({
    where: {
      id: sessionId,
    },
  });
  if (!session) {
    throw new ApiError({ statusCode: 400, message: 'Invalid session id' });
  }

  const userSessions = await prisma.dailyTournamentSession.findMany({
    where: {
      userId,
      status: 'COMPLETED',
    },
    orderBy: {
      finalScore: 'desc',
    },
  });

  let currentBestScore = 0;
  if (userSessions.length > 0) {
    currentBestScore = userSessions[0].bestScore;
  }

  const finalScore = session.currentScore;

  const updatedSession = await prisma.dailyTournamentSession.update({
    where: {
      id: sessionId,
    },
    data: {
      endedAt,
      status: UserTournamentStatus.COMPLETED,
      finalScore,
      bestScore: finalScore > currentBestScore ? finalScore : currentBestScore,
    },
  });

  return updatedSession;
};
