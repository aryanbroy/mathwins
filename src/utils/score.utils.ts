const calculateBasePoints = (level: number, answer: number): number => {
  // modify this later
  const basePoints = level * 10;
  return basePoints;
};

export const calculateDailyScore = (
  userAns: number,
  basePoints: number,
  timeTaken: number
) => {
  // according to the scroll wheel
  // only needed in daily tournament
  return 10;
};
export const calculateSoloScore = (
  correctAnswer: number,
  questionAttempt: number
) => {
  return 10;
};
export const calculateSoloPoint = (score: number) => {
  return 10;
};
export const calculateSoloCoinPoint = () => {
  return 10;
};

export const calculateInstantScore = (
  answer: number,
  level: number,
  timeTakenMs: number
): number => {
  const basePoints = calculateBasePoints(level, answer);
  const totalScore = basePoints + (10000 - timeTakenMs) / 10000;
  return totalScore;
};
