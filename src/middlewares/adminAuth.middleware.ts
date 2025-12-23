import { Request, Response, NextFunction } from "express";
import { ADMIN_EMAILS } from "../config/admin";
import prisma from "../prisma";

export const isAdmin = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  const incomingUserId = req.header('Authorization');
  const userId = String(incomingUserId);
  console.log("user :- ",userId);
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
    },
  });
  
  if (!user?.email) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  if (!ADMIN_EMAILS.includes(user.email)) {
    return res.status(403).json({ ok: false, error: "Admin access required" });
  }
  console.log(user?.email," authorized");
  req.userId = user.id;
  req.email = user.email;
  
  next();
};
