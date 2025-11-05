import crypto from 'crypto';

export const generateSeed = (): string => {
  const seed = crypto.randomBytes(16).toString('hex');
  return seed;
};

