import {
  MAX_PLAYERS,
  SESSION_DURATION_MIN,
  MIN_TO_MILLISECONDS,
  TOURNAMENT_DURATION_MIN,
} from '../../config/instant.config';
import {
  InstantSession,
  InstantTournament,
  Prisma,
} from '../../generated/prisma';
import {
  QuestionValidationType,
  updateSessionScore,
  validExpiryInterval,
} from '../../helpers/instant.helper';
import prisma from '../../prisma';
import { ApiError } from '../api/ApiError';
import { calculateInstantScore } from '../score.utils';

export const createInstantTournamentRoom = async (
  tx: Prisma.TransactionClient
): Promise<InstantTournament> => {
  const tournament = tx.instantTournament.create({
    data: {
      expiresAt: new Date(Date.now() + 20 * 60 * 1000),
    },
  });
  return tournament;
};

export const joinOrCreateRoomHandler = async (
  tx: Prisma.TransactionClient,
  userId: string,
  now: Date
): Promise<InstantTournament> => {
  const tournaments = await tx.$queryRaw<
    InstantTournament[]
  >`SELECT * FROM "InstantTournament"
    where status = 'OPEN'
    AND "expiresAt" >  ${validExpiryInterval(now)}
    AND "playersCount" < ${MAX_PLAYERS}
    ORDER BY "createdAt" ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
  `;

  const existingTournament = tournaments[0];
  if (existingTournament) {
    const existingParticipant = await tx.instantParticipant.findUnique({
      where: {
        tournamentId_userId: {
          tournamentId: existingTournament.id,
          userId: userId,
        },
      },
    });

    if (existingParticipant) {
      console.log(
        `User ${userId} has already joined tournament: ${existingTournament.id}`
      );
      return existingTournament;
    }
    const updatedRoom = await tx.instantTournament.update({
      data: {
        playersCount: {
          increment: 1,
        },
      },
      where: {
        id: existingTournament.id,
      },
    });

    const playersCount = updatedRoom.playersCount;

    await tx.instantParticipant.create({
      data: {
        joinOrder: playersCount,
        tournamentId: existingTournament.id,
        userId: userId,
      },
    });

    console.log(`Room available user ${userId} joining room ${updatedRoom.id}`);
    return updatedRoom;
  } else {
    try {
      console.log(`No available rooms, user creating new room...`);
      const newRoom = await tx.instantTournament.create({
        data: {
          expiresAt: new Date(Date.now() + TOURNAMENT_DURATION_MIN * 60 * 1000),
          playersCount: 1,
          instantParticipant: {
            create: {
              userId: userId,
              joinOrder: 1,
            },
          },
        },
      });
      return newRoom;
    } catch (err) {
      throw new ApiError({
        statusCode: 400,
        message: 'Error creating new room',
        errors: err,
      });
    }
  }
};

export const startSessionHandler = async (
  tx: Prisma.TransactionClient,
  userId: string,
  roomId: string
): Promise<InstantSession> => {
  try {
    const session = await tx.instantSession.create({
      data: {
        userId: userId,
        tournamentId: roomId,
        endsAt: new Date(
          Date.now() + SESSION_DURATION_MIN * MIN_TO_MILLISECONDS
        ),
      },
    });

    await tx.instantParticipant.update({
      data: {
        sessionStarted: true,
      },
      where: {
        tournamentId_userId: {
          tournamentId: roomId,
          userId: userId,
        },
      },
    });

    await tx.user.update({
      data: {
        instantAttemptCount: { increment: 1 },
      },
      where: {
        id: userId,
      },
    });

    return session;
  } catch (err) {
    throw new ApiError({
      statusCode: 500,
      message: 'Error in session handler',
      errors: err,
    });
  }
};

export const listRoomsHandler = async (
  now: Date
): Promise<InstantTournament[]> => {
  try {
    const availableRooms = await prisma.instantTournament.findMany({
      where: {
        status: 'OPEN',
        expiresAt: { gt: validExpiryInterval(now) },
        playersCount: { lt: MAX_PLAYERS },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return availableRooms;
  } catch (err) {
    throw new ApiError({
      statusCode: 500,
      message: 'Internal server error: error fetching all tournaments',
      errors: err,
    });
  }
};

export const submitQuestionHandler = async (
  tx: Prisma.TransactionClient,
  question: QuestionValidationType,
  sessionId: string,
  answer: number,
  timeTakenMs: number
): Promise<InstantSession> => {
  try {
    const incrementalScore = calculateInstantScore(
      answer,
      question.level,
      timeTakenMs
    );
    const updatedSession = await updateSessionScore(
      tx,
      sessionId,
      incrementalScore
    );

    return updatedSession;
  } catch (err) {
    throw new ApiError({
      statusCode: 500,
      message: 'Internal server error: error submiting question',
      errors: err,
    });
  }
};

export const finalSubmissionHandler = async (
  tx: Prisma.TransactionClient,
  sessionId: string,
  submittedAt: Date,
  roomId: string,
  userId: string,
  finalScore: number
) => {
  await tx.instantParticipant.update({
    where: {
      tournamentId_userId: {
        tournamentId: roomId,
        userId,
      },
    },
    data: {
      submittedAt,
      finalScore,
    },
  });

  const updatedSession = await tx.instantSession.update({
    where: {
      id: sessionId,
    },
    data: {
      status: 'SUBMITTED',
      submittedAt: submittedAt,
    },
  });

  return updatedSession;
};

export const playersCountHandler = async (
  tx: Prisma.TransactionClient,
  tournamentId: string
) => {
  const playersCount = await tx.instantTournament.findUnique({
    where: {
      id: tournamentId,
    },
    select: {
      playersCount: true,
    },
  });

  const firstFivePlayers = await tx.instantParticipant.findMany({
    where: {
      tournamentId: tournamentId,
    },
    select: {
      userId: true,
      joinedAt: true,
      joinOrder: true,
      sessionStarted: true,
      user: {
        select: {
          username: true,
        },
      },
    },
    orderBy: {
      joinOrder: 'desc',
    },
    take: 3,
  });

  return { playersCount, firstFivePlayers };
};
