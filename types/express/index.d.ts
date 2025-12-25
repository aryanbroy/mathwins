import { User } from '../../src/generated/prisma/client.ts';

// make it an object
declare namespace Express {
  interface Request {
    // userId: string;
    // instantAttempCount: number;
    // soloAttemptCount: number;
    // dailyAttemptCount: number;
    userData: User;
  }
}
