import crypto from 'crypto';

// will change this logic later

export const generateSessionSeed = (): string => {
  const seed = crypto.randomBytes(16).toString('hex');
  return seed;
};
