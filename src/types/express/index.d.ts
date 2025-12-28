import express from 'express';
import { User } from '../../generated/prisma';

declare global {
  namespace Express {
    interface Request {
      userData: User;
    }
  }
}
