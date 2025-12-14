import { Request, Response } from 'express';
import { ApiError } from '../utils/api/ApiError';
import prisma from '../prisma';
import { ApiResponse } from '../utils/api/ApiResponse';
import { asyncHandler } from '../middlewares/asyncHandler';
import {
  finalSubmissionHandler,
  joinOrCreateRoomHandler,
  listRoomsHandler,
  playersCountHandler,
  startSessionHandler,
  submitQuestionHandler,
} from '../utils/helper_handler/instant';
import {
  checkActiveSession,
  checkQuestionIsValid,
  updateSessionFinalScore,
  loadSession,
  validateSubmission,
  markSessionAsCompleted,
  tournamentIsValid,
  fetchTournament,
  storeQuestion,
} from '../helpers/instant.helper';
import { MAX_ATTEMPT } from '../config/instant.config';
import { generateQuestion } from '../utils/question.utils';

export const testInstant = async (_: Request, res: Response) => {
  console.log('working');
  res.status(200).json({ success: true });
};

export const getPlayersInTournament = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.userId;
    if (!userId) {
      throw new ApiError({
        statusCode: 400,
        message: 'Received invalid user id from auth handler',
      });
    }

    const { tournamentId } = req.body;
    if (!tournamentId) {
      throw new ApiError({ statusCode: 400, message: 'invalid tournament id' });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tournamentIsValid(tx, tournamentId);
      const { playersCount, firstFivePlayers } = await playersCountHandler(
        tx,
        tournamentId
      );
      return { playersCount, firstFivePlayers };
    });

    res.status(200).json(
      new ApiResponse(
        200,
        {
          playersCount: result.playersCount,
          firstFivePlayers: result.firstFivePlayers,
        },
        'successfuly fetched players count'
      )
    );
  }
);

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

    const now = new Date();
    const tournament = await fetchTournament(roomId);
    if (!tournament) {
      throw new ApiError({ statusCode: 404, message: 'room not found' });
    }
    if (tournament.expiresAt < now) {
      throw new ApiError({ statusCode: 403, message: 'room closed' });
    }
    const activeSession = await checkActiveSession(userId, roomId, now);
    if (activeSession != null) {
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            session: activeSession.sessionFields,
            question: activeSession.questions[0],
          },
          'session already exists'
        )
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const session = await startSessionHandler(tx, userId, roomId);

      const question = await generateQuestion(1);
      const firstQuestion = await storeQuestion(tx, question, session.id);

      return { session, firstQuestion };
    });

    res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { session: result.session, question: result.firstQuestion },
          'session started'
        )
      );
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
      const session = await loadSession(tx, sessionId, userId);
      if (
        (session.endsAt != null && session.endsAt < submittedAt) ||
        session.status != 'ACTIVE'
      ) {
        throw new ApiError({ statusCode: 400, message: 'session expired' });
      }

      await checkQuestionIsValid(tx, questionId);

      const generatedQuestion = await generateQuestion(1);
      const question = await storeQuestion(tx, generatedQuestion, session.id);

      const updatedSession = await submitQuestionHandler(
        tx,
        question,
        sessionId,
        answer,
        timeTakenMs
      );

      return { updatedSession, question };
    });

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { session: result.updatedSession, question: result.question },
          'question submitted successfuly'
        )
      );
  }
);

export const submitFinal = asyncHandler(async (req: Request, res: Response) => {
  const submittedAt = new Date();
  const userId = req.userId;
  if (!userId) {
    throw new ApiError({ statusCode: 401, message: 'Unauthorized user' });
  }
  const { sessionId } = req.body;
  if (!sessionId) {
    throw new ApiError({
      statusCode: 400,
      message: 'empty fields received: sessionId',
    });
  }

  const result = await prisma.$transaction(async (tx) => {
    const session = await loadSession(tx, sessionId, userId);
    if (session.endsAt != null && session.endsAt < submittedAt) {
      throw new ApiError({ statusCode: 400, message: 'session expired' });
    }
    if (session.finalScore !== null) {
      const existingSession = await markSessionAsCompleted(tx, session.id);
      return {
        alreadySubmitted: true,
        session: existingSession,
      };
    }

    if (session.status === 'SUBMITTED') {
      return {
        alreadySubmitted: true,
        session: session,
      };
    }

    if (session.status === 'EXPIRED') {
      throw new ApiError({
        statusCode: 400,
        message: 'session expired',
      });
    }
    const roomId = session.tournamentId;

    await validateSubmission(tx, roomId, submittedAt);

    const updatedSession = await updateSessionFinalScore(
      tx,
      sessionId,
      session.score,
      userId
    );
    if (!updatedSession || !updatedSession.finalScore) {
      throw new ApiError({
        statusCode: 400,
        message: 'error: unable to update final score',
      });
    }

    const sessionFinalSubmission = await finalSubmissionHandler(
      tx,
      sessionId,
      submittedAt,
      roomId,
      userId,
      updatedSession.finalScore
    );

    return {
      alreadySubmitted: false,
      session: sessionFinalSubmission,
    };
  });

  const message = result.alreadySubmitted
    ? 'session already submitted'
    : 'final submission successful';

  res.status(200).json(new ApiResponse(200, result, message));
});
