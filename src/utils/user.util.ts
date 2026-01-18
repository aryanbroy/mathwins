import { ClaimStatus, CoinLedgerSource } from '../generated/prisma';

export const SOURCE_LABEL_MAP: Record<CoinLedgerSource, string> = {
  DAILY_PERFORMANCE: 'Daily performance reward',
  REFERRAL: 'Referral bonus',
  REWARD_LOCK: 'Reward claim initiated',
  REWARD_UNLOCK: 'Reward claim rejected',
  REDEMPTION: 'Reward redeemed',
  DAILY_LOGIN: 'Daily login',
};

export const CLAIM_STATUS_MAP: Record<ClaimStatus, string> = {
  PENDING: 'Pending',
  FULFILLED: 'Fulfilled',
  REJECTED: 'Rejected',
};
