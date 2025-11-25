import { PrismaClientKnownRequestError } from '../generated/prisma/runtime/library';

export const isPrismaUniqueConstraintError = (err: any): boolean => {
  const isUniqueErr =
    err instanceof PrismaClientKnownRequestError &&
    (err.code === 'P2002' || err.code === '23505');

  return isUniqueErr;
};
