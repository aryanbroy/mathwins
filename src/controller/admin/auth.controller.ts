import { Request, Response } from 'express';

export const adminLogin = async (req: Request, res: Response) => {
  const {  } = req.body;
  try {
    res.status(200).send("payload");
  } catch (err) {
    console.log(err);
    res.status(400).json({ err });
  }
};

export const adminSignup = async (req: Request, res: Response) => {
  const {  } = req.body;
  try {
    res.status(200).send("payload");
  } catch (err) {
    console.log(err);
    res.status(400).json({ err });
  }
};