// import { User } from '../../src/generated/prisma/client.ts';

declare namespace Express {
  interface Request {
    userId: string;
    instantAttempCount: number;
    soloAttemptCount: number;
    dailyAttemptCount: number;
    // user?: User;
  }
}
