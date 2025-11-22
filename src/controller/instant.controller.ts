import { Request, Response } from 'express';

export const testInstant = async (req: Request, res: Response) => {
  console.log('working');
  res.status(200).json({ success: true });
};

export const joinOrCreateTournament = async (req: Request, res: Response) => {
  res.status(200).json({ success: true });
};
