import {
  MAX_OPEN_ROOMS,
  MAX_PLAYERS,
  MIN_TIME_TO_JOIN,
} from '../../config/instant.config';
import { InstantTournament, Prisma } from '../../generated/prisma';

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

export const findOrCreateInstantRoom = async (
  tx: Prisma.TransactionClient,
  now: Date
): Promise<InstantTournament> => {
  const validExpiryInterval = new Date(
    now.getTime() + MIN_TIME_TO_JOIN * 60 * 1000
  );
  let tournaments = await tx.instantTournament.findMany({
    where: {
      status: 'OPEN',
      expiresAt: { gt: validExpiryInterval },
      playersCount: { lt: MAX_PLAYERS },
    },
    orderBy: {
      playersCount: 'desc',
      createdAt: 'asc',
    },
  });

  if (tournaments.length > 0) {
    return tournaments[0];
  }

  const room = await tx.instantTournament.create({
    data: {
      expiresAt: new Date(Date.now() + 20 * 60 * 1000),
    },
  });

  return room;
};

export const joinRoom = async (
  tx: Prisma.TransactionClient,
  tournamentId: string,
  userId: string
) => {
  const updatedTournament = await tx.instantTournament.update({
    where: {
      id: tournamentId,
    },
    data: {
      playersCount: { increment: 1 },
    },
  });

  const joinedPlayers = updatedTournament.playersCount;
  const maxPlayers = updatedTournament.maxPlayers;

  if (joinedPlayers > maxPlayers) {
    // room is full
    if (updatedTournament.status == 'OPEN') {
      await tx.instantTournament.update({
        where: { id: tournamentId },
        data: { playersCount: { decrement: 1 }, status: 'CLOSED' },
      });
    }

    const newRoom = await createInstantTournamentRoom(tx);
    const updatedNewRoom = await tx.instantTournament.update({
      where: {
        id: newRoom.id,
      },
      data: {
        playersCount: { increment: 1 },
      },
    });
    const newParticipant = await tx.instantParticipant.create({
      data: {
        joinOrder: updatedNewRoom.playersCount,
        tournamentId: updatedNewRoom.id,
        userId: userId,
      },
    });

    return { participant: newParticipant, newRoom: updatedNewRoom };
  }

  const newParticipant = await tx.instantParticipant.create({
    data: {
      joinOrder: joinedPlayers,
      tournamentId: updatedTournament.id,
      userId: userId,
    },
  });

  return { participant: newParticipant, newRoom: updatedTournament };
};
