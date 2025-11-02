import prisma from '../prisma';

function shuffle(array: any[]): any[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
export const generateQuestions = async (size: number) => {
  try {
    const totalQuestions = size;
    const targetCounts = {
      EASY: Math.floor(totalQuestions * 0.4),
      MEDIUM: Math.floor(totalQuestions * 0.3),
      HARD: Math.floor(totalQuestions * 0.3),
    };
    const remainder =
      totalQuestions -
      (targetCounts.EASY + targetCounts.MEDIUM + targetCounts.HARD);
    targetCounts.EASY += remainder;
    const [easyQuestions, mediumQuestions, hardQuestions] =
      await prisma.$transaction([
        prisma.question.findMany({
          where: { difficulty: 1 },
        }),
        prisma.question.findMany({
          where: { difficulty: 2 },
        }),
        prisma.question.findMany({
          where: { difficulty: 3 },
        }),
      ]);

    const available = {
      EASY: shuffle(easyQuestions),
      MEDIUM: shuffle(mediumQuestions),
      HARD: shuffle(hardQuestions),
    };
    const selectedQuestions = [];
    const easyPicks = available.EASY.splice(0, targetCounts.EASY);
    selectedQuestions.push(...easyPicks);

    const mediumPicks = available.MEDIUM.splice(0, targetCounts.MEDIUM);
    selectedQuestions.push(...mediumPicks);

    const hardPicks = available.HARD.splice(0, targetCounts.HARD);
    selectedQuestions.push(...hardPicks);

    let shortfall = totalQuestions - selectedQuestions.length;
    if (shortfall > 0) {
      const fallbackPool = [
        ...available.EASY,
        ...available.MEDIUM,
        ...available.HARD,
      ];
      const fallbackPicks = fallbackPool.splice(0, shortfall);
      selectedQuestions.push(...fallbackPicks);
    }
    return selectedQuestions;
  } catch (err) {
    console.log('Error occurred: ', err);
    throw new Error('Error Occured !!');
  }
};
