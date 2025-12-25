import { User } from '../../src/generated/prisma';

declare global {
  namespace Express {
    export interface Request {
      // userId: string;
      // instantAttempCount: number;
      // soloAttemptCount: number;
      // dailyAttemptCount: number;
      userData: User;
    }
  }
}
