// import { User } from '../../src/generated/prisma/client.ts';

declare namespace Express {
  interface Request {
    userId: string;
    // user?: User;
  }
}
