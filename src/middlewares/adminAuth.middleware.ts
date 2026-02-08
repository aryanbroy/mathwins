import { Request, Response, NextFunction } from "express";
import { ADMIN_EMAILS } from "../config/admin";
import prisma from "../prisma";
import jwt, { JwtPayload } from 'jsonwebtoken';

interface UserPayload extends JwtPayload {
  userId: string;
}

export const isAdmin = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.header('Authorization');
  console.log('auth - middle : ', authHeader);

  if (!authHeader) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }
  //
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : authHeader;

  // console.log('middleWare : ', token);
  const JWT_SECRET = process.env.JWT_SECRET as string;
  const verifiedUser = jwt.verify(token, JWT_SECRET) as UserPayload;
  console.log(verifiedUser);
  
  if (!verifiedUser?.email) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  if (!ADMIN_EMAILS.includes(verifiedUser.email)) {
    return res.status(403).json({ ok: false, error: "Admin access required" });
  }
  console.log(verifiedUser?.email," authorized");
  req.userData = {
    id: verifiedUser.userId,
    email : verifiedUser.email
  }
  next();
};
