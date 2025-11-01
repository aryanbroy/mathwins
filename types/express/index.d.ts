// import { User } from '../../src/generated/prisma/client.ts';

declare namespace Express {
  interface Request {
    userId: number;
    // user?: User;
  }
}
