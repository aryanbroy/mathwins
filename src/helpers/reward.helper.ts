import { Prisma } from '../generated/prisma';
import { ApiError } from '../utils/api/ApiError';

export const postClaimRequestHandler = async (
  tx: Prisma.TransactionClient,
  userId: string
) => {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { coins: true },
  });
  if (!user) {
    throw new ApiError({
      statusCode: 404,
      message: 'User not authorized',
    });
  }

  // this should come from config: later
  if (user.coins < 5000) {
    throw new ApiError({
      statusCode: 400,
      message: 'Not eligible to claim reward',
    });
  }

  try {
    const claim = await tx.rewardClaim.create({
      data: {
        userId,
        status: 'PENDING',
        coinsLocked: 5000, // make coins locked variable later
      },
    });

    tx.user.update({
      where: { id: userId },
      data: { coins: { decrement: 5000 } }, // make this variable later
    });

    await tx.coinLedger.create({
      data: {
        userId,
        date: new Date(),
        delta: -5000, // make this variable too: later
        source: 'REWARD_LOCK',
        referenceId: claim.id,
      },
    });

    return { claim };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      console.log('unique constraint error while claiming reward');
      if (e.code === 'P2002') {
        throw new ApiError({
          statusCode: 409,
          message: 'Claim already exists',
        });
      }
    }
    throw e;
  }
};
