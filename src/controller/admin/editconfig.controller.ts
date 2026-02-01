import { Request, Response } from 'express';
import prisma from '../../prisma';
import gameConfig from '../../config/game.config';
import { CONFIG_SECTION_SCHEMA_MAP } from "../../helpers/configSectionSchemaMap";

export async function getActiveConfig() {
  const active = await prisma.gameConfig.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (!active) {
    throw new Error("No active game config found");
  }

  return active;
}

export function bumpPatchVersion(version: string) {
  const [major, minor, patch] = version.split(".").map(Number);
  return `${major}.${minor}.${(patch ?? 0) + 1}`;
}

export const createConfig = async (req: Request, res: Response) => {
    try {
        console.log("createConfig :- ");
        
        const respon = await prisma.gameConfig.create({
            data: {
                version: "1.0.0",
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
                isActive: true,
            },
        });
        return res.status(200).json(respon);
    } catch (error) {
        console.error("createActiveGameConfig error:", error);
        return res.status(500).json({
        ok: false,
        error: "Internal server error",
        });
    }
}

export const getActiveGameConfig = async (req: Request, res: Response) => {
  try {
    const activeConfig = await prisma.gameConfig.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (!activeConfig) {
      return res.status(404).json({
        ok: false,
        error: "No active game config found",
      });
    }

    return res.status(200).json({
      ok: true,
      config: {
        id: activeConfig.id,
        version: activeConfig.version,

        daily_tournament: activeConfig.daily_tournament,
        instant_tournament: activeConfig.instant_tournament,
        single_player: activeConfig.single_player,
        leveling: activeConfig.leveling,
        base_points_by_level: activeConfig.base_points_by_level,
        scoring: activeConfig.scoring,
        points_distribution: activeConfig.points_distribution,
        caps: activeConfig.caps,
        ad_units: activeConfig.ad_units,
        lifelines: activeConfig.lifelines,
        top_attempts: activeConfig.top_attempts,
        feature_flags: activeConfig.feature_flags,
        safety: activeConfig.safety,
        referrals: activeConfig.referrals,
        rewards: activeConfig.rewards,
        cron: activeConfig.cron,
        analytics: activeConfig.analytics,
        leaderboard: activeConfig.leaderboard,
        qa: activeConfig.qa,

        updatedBy: activeConfig.updatedBy,
        notes: activeConfig.notes,
        createdAt: activeConfig.createdAt,
      },
    });
  } catch (error) {
    console.error("getActiveGameConfig error:", error);
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
};

export const changeConfig = async (req: any, res: any) => {
    try {
        const section = req.query.section as string; // column name
        const {payload, note} = req.body;
        console.log("section : ",section);
        console.log("payload : ",payload);
        console.log("note : ",note);
        
        if (!section) {
        return res.status(400).json({
            ok: false,
            error: "section query parameter is required",
        });
        }

        const schema = CONFIG_SECTION_SCHEMA_MAP[section];
        if (!schema) {
        return res.status(400).json({
            ok: false,
            error: `Invalid config section: ${section}`,
        });
        }

        const parsed = schema.safeParse(payload);
        if (!parsed.success) {
        return res.status(400).json({
            ok: false,
            error: parsed.error.format(),
        });
        }

        const activeConfig = await getActiveConfig();

        // Build new config row (copy all columns)
        const updatedBy = req.email || 'system';
        const newConfigData: any = {
        ...activeConfig,
        id: undefined,          // important: let Prisma generate new ID
        createdAt: undefined,
        isActive: true,
        version: bumpPatchVersion(activeConfig.version),
        updatedBy,
        notes: req.body?.note || `Updated ${section} by ${updatedBy}`,
        };

        // Replace only the requested section
        newConfigData[section] = parsed.data;

        // Deactivate old config
        await prisma.gameConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false },
        });

        // Create new config row
        const saved = await prisma.gameConfig.create({
        data: newConfigData,
        });

        return res.json({
        ok: true,
        updatedSection: section,
        version: saved.version,
        configId: saved.id,
        });
    } catch (error) {
        console.error("changeGameConfig error:", error);
        return res.status(500).json({
        ok: false,
        error: "Internal server error",
        });
    }
};