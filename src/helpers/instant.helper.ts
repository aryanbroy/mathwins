import {
  MIN_TIME_TO_JOIN,
  MIN_TO_MILLISECONDS,
} from '../config/instant.config';
import prisma from '../prisma';
import { ApiError } from '../utils/api/ApiError';

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

export const validExpiryInterval = (now: Date) => {
  return new Date(now.getTime() + MIN_TIME_TO_JOIN * MIN_TO_MILLISECONDS);
};
