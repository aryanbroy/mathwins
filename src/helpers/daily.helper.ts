import prisma from '../prisma';
import { ApiError } from '../utils/api/ApiError';
import { calculateDailyScore } from '../utils/score.utils';

export const processQuestionScore = async (
  questionId: string,
  dailyTournamentSessionId: string,
  answer: number,
  timeTaken: number
) => {
  console.log('evaluating score...');
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
  });
  console.log(
    'score evaluation completed, score: ',
    updatedSession.currentScore
  );
};
