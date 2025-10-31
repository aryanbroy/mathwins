import { Request, Response } from 'express';
import prisma from '../prisma';

export const addQuestion = async (req: Request, res: Response) => {
  try {
    console.log(req.body);
    const { question, option, answer, difficulty} = req.body;
    const qs = await prisma.question.create({
      data: {
        question,       
        option,
        answer,             
        difficulty,
      },
    });
    res.status(201).json({ qs });
  } catch (err) {
    console.log('Error occurred: ', err);
    res.status(400).json(err);
  }
};

function shuffle(array: any[]): any[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
export const createTournament = async (req: Request, res: Response) => {
  try {
    const { size } = req.body;
    const totalQuestions = size;
    const targetCounts = {
      EASY: Math.floor(totalQuestions * 0.4),
      MEDIUM: Math.floor(totalQuestions * 0.3),
      HARD: Math.floor(totalQuestions * 0.3),
    };
    const remainder = totalQuestions - (targetCounts.EASY + targetCounts.MEDIUM + targetCounts.HARD);
    targetCounts.EASY += remainder;
    const [easyQuestions, mediumQuestions, hardQuestions] = await prisma.$transaction([
      prisma.question.findMany({
        where: { difficulty: "EASY" },
      }),
      prisma.question.findMany({
        where: { difficulty: "MEDIUM" },
      }),
      prisma.question.findMany({
        where: { difficulty: "HARD" },
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
    return res.status(201).send(selectedQuestions);
  } catch (err) {
    console.log('Error occurred: ', err);
    res.status(400).json(err);
  }
};

export const Leaderboard = async (req: Request, res: Response) => {
  try {
    const { count } = req.body;
    const allTimeQuery = prisma.user.findMany({
      where: {
        lifeTimePoints: {
          gt: 0,
        },
      },
      orderBy: {
        lifeTimePoints: 'desc',
      },
      take: count,
    });
    const soloQuery = prisma.liveDailyLeaderboard.findMany({
      where: {
        soloPoints: {
          gt: 0,
        },
      },
      orderBy: {
        soloPoints: 'desc',
      },
      take: count,
      include: {
        user: {
          select: { name: true, avatarUrl: true },
        },
      },
    });
    const dailyQuery = prisma.liveDailyLeaderboard.findMany({
      where: {
        dailyPoints: {
          gt: 0,
        },
      },
      orderBy: {
        dailyPoints: 'desc',
      },
      take: count,
      include: {
        user: {
          select: { name: true, avatarUrl: true },
        },
      },
    });
    const instantQuery = prisma.liveDailyLeaderboard.findMany({
      where: {
        instantPoints: {
          gt: 0,
        },
      },
      orderBy: {
        instantPoints: 'desc',
      },
      take: count,
      include: {
        user: {
          select: { name: true, avatarUrl: true },
        },
      },
    });

    const [allTimeResults,soloResults,dailyResults,instantResults,] = await prisma.$transaction([allTimeQuery,soloQuery,dailyQuery,instantQuery,]);
    
    const allTimeLeaders = allTimeResults.map((user, index) => ({
      rank: index + 1,
      userName: user.name,
      avatarUrl: user.avatarUrl,
      points: user.lifeTimePoints,
      userId: user.id,
    }));
    const todaySoloLeaders = soloResults.map((entry, index) => ({
      rank: index + 1,
      userName: entry.user.name,
      avatarUrl: entry.user.avatarUrl,
      points: entry.soloPoints,
      userId: entry.userId,
    }));
    const todayDailyTournamentLeader = dailyResults.map((entry, index) => ({
      rank: index + 1,
      userName: entry.user.name,
      avatarUrl: entry.user.avatarUrl,
      points: entry.dailyPoints,
      userId: entry.userId,
    }));
    const todayInstantTournamentLeader = instantResults.map((entry, index) => ({
      rank: index + 1,
      userName: entry.user.name,
      avatarUrl: entry.user.avatarUrl,
      points: entry.instantPoints,
      userId: entry.userId,
    }));

    return res.status(201).json({
      allTimeLeaders: allTimeLeaders,
      todaySoloLeaders: todaySoloLeaders,
      todayDailyTournamentLeader: todayDailyTournamentLeader,
      todayInstantTournamentLeader: todayInstantTournamentLeader,
    });
  } catch (error) {
    console.error('Error fetching top performers:', error);
    throw new Error('Could not fetch leaderboard data.');
  }
}