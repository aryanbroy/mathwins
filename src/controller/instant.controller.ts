import { Request, Response } from 'express';
import { ApiError } from '../utils/api/ApiError';
import prisma from '../prisma';
import { ApiResponse } from '../utils/api/ApiResponse';
import { asyncHandler } from '../middlewares/asyncHandler';
import {
  joinOrCreateRoomHandler,
  listRoomsHandler,
  startSessionHandler,
  submitQuestionHandler,
} from '../utils/helper_handler/instant';
import {
  checkActiveSession,
  checkQuestionIsValid,
  checkUserAlreadyInTournament,
  loadSession,
} from '../helpers/instant.helper';
import { MAX_ATTEMPT } from '../config/instant.config';

export const testInstant = async (_: Request, res: Response) => {
  console.log('working');
  res.status(200).json({ success: true });
};

export const joinOrCreateTournament = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.userId;
    if (!userId) {
      throw new ApiError({
        statusCode: 400,
        message: 'Received invalid user id from auth handler',
      });
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const room = await joinOrCreateRoomHandler(tx, userId, now);
      return room;
    });

    res.status(200).json(new ApiResponse(200, result));
  }
);

export const startSession = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.userId;
    const instantAttemptCount = req.instantAttempCount;

    if (!userId) {
      throw new ApiError({
        statusCode: 403,
        message: 'Unauthorized user: userId not found',
      });
    }

    if (instantAttemptCount >= MAX_ATTEMPT) {
      throw new ApiError({ statusCode: 403, message: 'no attempts left' });
    }

    const { roomId } = req.body;
    if (!roomId) {
      throw new ApiError({ statusCode: 404, message: 'Room id not provided' });
    }

    const activeSession = await checkActiveSession(userId, roomId);
    if (activeSession) {
      return res.status(200).json(new ApiResponse(200, activeSession));
    }

    const now = new Date();
    const isUserAlreadyInTournament = await checkUserAlreadyInTournament(
      userId,
      roomId,
      now
    );
    if (isUserAlreadyInTournament) {
      throw new ApiError({
        statusCode: 403,
        message: 'User already in a tournament',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const session = await startSessionHandler(tx, userId, roomId);
      return session;
    });

    res.status(201).json(new ApiResponse(201, result, 'session started'));
  }
);

export const listRooms = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    throw new ApiError({ statusCode: 403, message: 'Unauthorized user' });
  }
  const now = new Date();
  const availableRooms = await listRoomsHandler(now);
  if (!availableRooms || availableRooms.length == 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, { availableRooms: [] }, 'no rooms available'));
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { availableRooms },
        'fetched available rooms successfuly'
      )
    );
});

export const submitQuestion = asyncHandler(
  async (req: Request, res: Response) => {
    const submittedAt = new Date();
    const userId = req.userId;
    if (!userId) {
      throw new ApiError({ statusCode: 401, message: 'Unauthorized user' });
    }
    let { sessionId, questionId, answer, timeTakenMs } = req.body;
    if (
      !sessionId ||
      !questionId ||
      typeof answer !== 'number' ||
      typeof timeTakenMs !== 'number'
    ) {
      throw new ApiError({
        statusCode: 400,
        message:
          'received empty fields(s): sessionId, questionId, answer, timetaken',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const session = await loadSession(tx, sessionId);
      if (!session) {
        throw new ApiError({
          statusCode: 404,
          message: `error! session not found with id ${sessionId}`,
        });
      }
      if (session.userId !== userId) {
        throw new ApiError({
          statusCode: 404,
          message: `error! session: ${sessionId} does not belong to user: ${userId}`,
        });
      }
      if (
        (session.endsAt != null && session.endsAt < submittedAt) ||
        session.status != 'ACTIVE'
      ) {
        throw new ApiError({ statusCode: 400, message: 'session expired' });
      }

      const question = await checkQuestionIsValid(tx, questionId);
      if (!question) {
        throw new ApiError({
          statusCode: 404,
          message: `question: ${questionId}, not found`,
        });
      }

      const updatedSession = await submitQuestionHandler(
        tx,
        question,
        sessionId,
        answer,
        timeTakenMs
      );
      return updatedSession;
    });

    res
      .status(200)
      .json(new ApiResponse(200, result, 'question submitted successfuly'));
  }
);
