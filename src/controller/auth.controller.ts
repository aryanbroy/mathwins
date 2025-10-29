import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client();

export const googleAuth = async (req: Request, res: Response) => {
  const { credential, client_id } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: client_id,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Error fetching payload from ticket');
    }
    const userId = payload['sub'];
    console.log(userId);
    res.status(200).json({ payload });
  } catch (err) {
    console.log(err);
    res.status(400).json({ err });
  }
};

export const demoTest = () => {
  console.log('hello terhe');
};
