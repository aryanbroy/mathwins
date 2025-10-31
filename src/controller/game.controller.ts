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
    res.status(500).json(err);
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