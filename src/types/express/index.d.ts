// import { User } from "../../generated/prisma";

type User = {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    phoneNumber: string | null;
    googleId: string | null;
    email: string | null;
    deviceHash: string | null;
    username: string;
    usernameReservedAt: Date | null;
    avatarType: $Enums.AvatarType;
    profilePictureUrl: string | null;
    coins: number;
    lifetimeCoins: number;
    lifetimeCoinPoints: number;
    level: number;
    theme: $Enums.Theme;
    soundEnabled: boolean;
    hapticsEnabled: boolean;
    language: string;
    referralCode: string | null;
    referredById: string | null;
    referralRewarded: boolean;
    role: $Enums.Role;
    soloAttemptCount: number;
    instantAttemptCount: number;
    dailyAttemptCount: number;
}

declare global {
  namespace Express {
    export interface Request {
      userId: string;
      // instantAttempCount: number;
      // soloAttemptCount: number;
      // dailyAttemptCount: number;
      // userData: User;
    }
  }
}
