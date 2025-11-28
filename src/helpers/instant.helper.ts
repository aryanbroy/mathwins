import {
  MIN_TIME_TO_JOIN,
  MIN_TO_MILLISECONDS,
} from '../config/instant.config';
import {
  InstantSession,
  InstantTournamentSessionStatus,
  Prisma,
} from '../generated/prisma';
import prisma from '../prisma';
import { ApiError } from '../utils/api/ApiError';

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

export const checkActiveSession = async (userId: string, roomId: string) => {
  try {
    const activeSession = await prisma.instantSession.findFirst({
      where: {
        userId: userId,
        tournamentId: roomId,
      },
    });
    return activeSession;
  } catch (err) {
    throw new ApiError({
      statusCode: 500,
      message: 'Error checking active sessions',
      errors: err,
    });
  }
};

export const checkUserAlreadyInTournament = async (
  userId: string,
  roomId: string,
  now: Date
): Promise<boolean> => {
  const validExpiryInterval = new Date(
    now.getTime() + MIN_TIME_TO_JOIN * MIN_TO_MILLISECONDS
  );
  try {
    const isUserAlreadyInTournament = await prisma.instantTournament.findFirst({
      where: {
        id: roomId,
        expiresAt: { gt: validExpiryInterval },
      },
      include: {
        sessions: {
          where: {
            userId: userId,
          },
        },
      },
    });
    if (
      isUserAlreadyInTournament &&
      isUserAlreadyInTournament.sessions.length > 0
    ) {
      return true;
    }

    return false;
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
  sessionId: string
): Promise<{
  id: string;
  endsAt: Date | null;
  status: InstantTournamentSessionStatus;
  userId: string;
} | null> => {
  try {
    const session = await tx.instantSession.findUnique({
      where: {
        id: sessionId,
      },
      select: {
        id: true,
        endsAt: true,
        status: true,
        userId: true,
      },
    });
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
): Promise<QuestionValidationType | null> => {
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
  score: number
): Promise<InstantSession> => {
  const updatedSession = await tx.instantSession.update({
    data: {
      score: score,
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
