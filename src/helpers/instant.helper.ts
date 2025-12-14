import {
  MIN_TIME_TO_JOIN,
  MIN_TO_MILLISECONDS,
} from '../config/instant.config';
import { InstantSession, InstantTournament, Prisma } from '../generated/prisma';
import prisma from '../prisma';
import { ApiError } from '../utils/api/ApiError';
import { GeneratedQuestion } from '../utils/question.utils';

export type QuestionValidationType = {
  result: string;
  side: string;
  kthDigit: number;
  correctDigit: number;
  level: number;
};

export const validExpiryInterval = (now: Date) => {
  return new Date(now.getTime() + MIN_TIME_TO_JOIN * MIN_TO_MILLISECONDS);
};

export const checkActiveSession = async (
  userId: string,
  roomId: string,
  now: Date
) => {
  try {
    const activeSession = await prisma.instantSession.findFirst({
      where: {
        userId: userId,
        tournamentId: roomId,
        endsAt: { gt: now },
        status: { not: 'SUBMITTED' },
      },
      include: {
        questions: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (activeSession) {
      const { questions, ...sessionFields } = activeSession;
      return { sessionFields, questions };
    }

    return null;
  } catch (err) {
    throw new ApiError({
      statusCode: 500,
      message: 'Error checking active sessions',
      errors: err,
    });
  }
};

export const fetchTournament = async (
  roomId: string
): Promise<{ id: string; expiresAt: Date } | null> => {
  try {
    const tournament = await prisma.instantTournament.findUnique({
      where: {
        id: roomId,
      },
      select: {
        id: true,
        expiresAt: true,
      },
    });
    return tournament;
  } catch (err) {
    throw new ApiError({
      statusCode: 500,
      message: 'internal server error: checkUserAlreadyInTournament',
      errors: err,
    });
  }
};

export const loadSession = async (
  tx: Prisma.TransactionClient,
  sessionId: string,
  userId: string
): Promise<InstantSession> => {
  try {
    const session = await tx.instantSession.findUnique({
      where: {
        id: sessionId,
      },
    });

    if (!session) {
      throw new ApiError({
        statusCode: 404,
        message: `error! session not found with id ${sessionId}`,
      });
    }
    if (session.userId !== userId) {
      throw new ApiError({
        statusCode: 401,
        message: `error! session: ${sessionId} does not belong to user: ${userId}`,
      });
    }

    return session;
  } catch (err) {
    throw new ApiError({
      statusCode: 500,
      message: 'Internal server error: error verifying session',
      errors: err,
    });
  }
};

export const checkQuestionIsValid = async (
  tx: Prisma.TransactionClient,
  questionId: string
): Promise<QuestionValidationType> => {
  try {
    const isValidQuestion = await tx.questionAttempt.findUnique({
      where: {
        id: questionId,
      },
      select: {
        result: true,
        side: true,
        kthDigit: true,
        correctDigit: true,
        level: true,
      },
    });
    if (!isValidQuestion) {
      throw new ApiError({
        statusCode: 404,
        message: `question: ${questionId}, not found`,
      });
    }

    return isValidQuestion;
  } catch (err) {
    throw new ApiError({
      statusCode: 500,
      message: 'Internal server error: error verifying question validity',
      errors: err,
    });
  }
};

export const checkAnswer = (
  question: QuestionValidationType,
  answer: number
) => {
  const { result, side, correctDigit } = question;
  let userAnswer = answer.toString();
  if (side === 'left') {
    return result.charAt(correctDigit) === userAnswer;
  } else {
    return result.charAt(result.length - correctDigit) === userAnswer;
  }
};

export const updateSessionScore = async (
  tx: Prisma.TransactionClient,
  sessionId: string,
  incrementalScore: number
): Promise<InstantSession> => {
  const updatedSession = await tx.instantSession.update({
    data: {
      score: {
        increment: incrementalScore,
      },
    },
    where: {
      id: sessionId,
    },
  });
  if (!updatedSession) {
    throw new ApiError({
      statusCode: 400,
      message: 'error updating session score: prisma error',
    });
  }
  return updatedSession;
};

export const updateSessionFinalScore = async (
  tx: Prisma.TransactionClient,
  sessionId: string,
  currentScore: number,
  userId: string
): Promise<InstantSession | null> => {
  console.log('Userid: ', userId);
  console.log('finding user sessions...');
  const userSessions = await tx.instantSession.findMany({
    where: { userId: userId, status: 'SUBMITTED' },
    select: { bestScore: true },
    orderBy: { finalScore: 'desc' },
  });
  console.log('User sessions: ', userSessions);

  let currentBestScore = 0;
  if (userSessions.length > 0) {
    currentBestScore = userSessions[0].bestScore;
    console.log('Current best score: ', currentBestScore);
  }

  const finalScore = currentScore;

  const updatedSession = await tx.instantSession.update({
    data: {
      finalScore,
      bestScore: finalScore > currentBestScore ? finalScore : currentBestScore,
    },
    where: {
      id: sessionId,
    },
  });

  return updatedSession;
};

export const validateSubmission = async (
  tx: Prisma.TransactionClient,
  roomId: string,
  submittedAt: Date
) => {
  const room = await tx.instantTournament.findUnique({
    where: {
      id: roomId,
    },
  });
  if (!room) {
    throw new ApiError({
      statusCode: 400,
      message: 'invalid room id received: no room exist with the specified id',
    });
  }

  if (room.status !== 'OPEN') {
    throw new ApiError({
      statusCode: 400,
      message: 'room closed',
    });
  }

  if (submittedAt > room.expiresAt) {
    throw new ApiError({
      statusCode: 403,
      message: 'submission window closed',
    });
  }
};

export const markSessionAsCompleted = async (
  tx: Prisma.TransactionClient,
  sessionId: string
): Promise<InstantSession> => {
  const updatedSession = await tx.instantSession.update({
    where: {
      id: sessionId,
    },
    data: {
      status: 'SUBMITTED',
    },
  });

  if (!updatedSession) {
    throw new ApiError({
      statusCode: 400,
      message: 'error updating existing session status',
    });
  }

  return updatedSession;
};

export const tournamentIsValid = async (
  tx: Prisma.TransactionClient,
  tournamentId: string
) => {
  const tournament = await tx.instantTournament.findUnique({
    where: {
      id: tournamentId,
    },
  });

  if (!tournament) {
    throw new ApiError({
      statusCode: 400,
      message: 'tournament does not exist: invalid tournament id',
    });
  }
  return tournament;
};

export const storeQuestion = async (
  tx: Prisma.TransactionClient,
  question: GeneratedQuestion,
  sessionId: string
) => {
  const storedQuestion = await tx.questionAttempt.create({
    data: {
      level: 1,
      expression: question.expression,
      result: question.result,
      side: question.side,
      kthDigit: question.kthDigit,
      correctDigit: question.correctDigit,
      instantSessionId: sessionId,
    },
  });

  return storedQuestion;
};
