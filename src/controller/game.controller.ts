import { Request, Response } from 'express';
import prisma from '../prisma';
import gameConfig from '../config/game.config';
import { generateQuestion } from '../utils/question.utils';

export const demoQuestion = async (req: Request, res: Response) => {
  try {
    console.log(req.body);
    
    const {level} = req.body;
    generateQuestion(level)
    .then(question => {
      console.log("Promise finished!");
      console.log(question.expression);
      return res.status(201).json(question);
    }).catch(err => {
      console.error("Error while getting question:", err);
    });
  } catch (error) {
    console.log(error);
  }
};

export const createGameConfigFromFile = async (
  req: Request,
  res: Response
) => {
  try {
    const existingActive = await prisma.gameConfig.findFirst({
      where: { isActive: true },
    });

    if (existingActive) {
      return res.status(400).json({
        ok: false,
        error: "Active game config already exists",
      });
    }

    const newConfig = await prisma.gameConfig.create({
      data: {
        version: gameConfig.version ?? "1.0.0",

        daily_tournament: gameConfig.daily_tournament,
        instant_tournament: gameConfig.instant_tournament,
        single_player: gameConfig.single_player,
        leveling: gameConfig.leveling,
        base_points_by_level: gameConfig.base_points_by_level,
        scoring: gameConfig.scoring,
        points_distribution: gameConfig.points_distribution,
        caps: gameConfig.caps,
        ad_units: gameConfig.ad_units,
        lifelines: gameConfig.lifelines,
        top_attempts: gameConfig.top_attempts,
        feature_flags: gameConfig.feature_flags,
        safety: gameConfig.safety,
        referrals: gameConfig.referrals,
        rewards: gameConfig.rewards,
        cron: gameConfig.cron,
        analytics: gameConfig.analytics,
        leaderboard: gameConfig.leaderboard,
        qa: gameConfig.qa,

        updatedBy: "system",
        notes: "Initial config seeded from game.config.ts",
        isActive: true,
      },
    });

    return res.status(201).json({
      ok: true,
      message: "Game config created successfully",
      configId: newConfig.id,
      version: newConfig.version,
    });
  } catch (error) {
    console.error("createGameConfigFromFile error:", error);
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
};