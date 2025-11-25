import { create } from 'domain';
import {
  MAX_PLAYERS,
  MIN_TIME_TO_JOIN,
  TOURNAMENT_DURATION_MIN,
} from '../../config/instant.config';
import { InstantTournament, Prisma } from '../../generated/prisma';
import { ApiError } from '../api/ApiError';

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
  const validExpiryInterval = new Date(
    now.getTime() + MIN_TIME_TO_JOIN * 60 * 1000
  );

  const tournaments = await tx.$queryRaw<
    InstantTournament[]
  >`SELECT * FROM "InstantTournament"
    where status = 'OPEN'
    AND "expiresAt" >  ${validExpiryInterval}
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
