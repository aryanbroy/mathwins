import { GameConfigSchema } from "../schemas/gameConfig.schema";

const GC = GameConfigSchema.shape;

export const CONFIG_SECTION_SCHEMA_MAP: Record<string, any> = {
  daily_tournament: GC.daily_tournament,
  instant_tournament: GC.instant_tournament,
  single_player: GC.single_player,
  leveling: GC.leveling,
  base_points_by_level: GC.base_points_by_level,
  scoring: GC.scoring,
  points_distribution: GC.points_distribution,
  caps: GC.caps,
  ad_units: GC.ad_units,
  lifelines: GC.lifelines,
  top_attempts: GC.top_attempts,
  feature_flags: GC.feature_flags,
  safety: GC.safety,
  referrals: GC.referrals,
  rewards: GC.rewards,
  cron: GC.cron,
  analytics: GC.analytics,
  leaderboard: GC.leaderboard,
  qa: GC.qa,
};
