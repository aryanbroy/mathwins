import { z } from "zod";

/* -------------------------------------------------
   COMMON HELPERS
-------------------------------------------------- */

const ISODateString = z.string().datetime();

const PercentageRange = z
  .string()
  .regex(/^(\d+|\d+-\d+)$/, "Invalid range format");

/* -------------------------------------------------
   DAILY TOURNAMENT
-------------------------------------------------- */

const DailyTournamentSchema = z.object({
  duration_sec: z.number().positive(),
  breaks_sec: z.array(z.number().positive()),
  extra_attempts_rewarded: z.number().int().nonnegative(),
  difficulty_increase: z.enum([
    "per_question",
    "per_correct",
    "fixed",
  ]),
  banner_delay_sec: z.number().nonnegative(),
  interstitial_before_resume: z.boolean(),
  minute_snapshot_keys: z.array(z.number().int().positive()),
  server_timer_tolerance_sec: z.number().nonnegative(),
});

/* -------------------------------------------------
   INSTANT TOURNAMENT
-------------------------------------------------- */

const InstantTournamentSchema = z.object({
  room_size_max: z.number().int().positive(),
  room_wait_timeout_sec: z.number().positive(),
  match_duration_sec: z.number().positive(),
  ad_minute_breaks: z.boolean(),
  banner_delay_sec: z.number().nonnegative(),
  allow_early_submit_interstitial: z.boolean(),
  assume_players_for_percentile: z.number().int().positive(),
});

/* -------------------------------------------------
   SINGLE PLAYER
-------------------------------------------------- */

const SinglePlayerSchema = z.object({
  round_size: z.number().int().positive(),
  points_per_round_factor: z.number().positive(),
  point_for_correct_answer: z.number().int().nonnegative(),
  level_increase_every_n_questions: z.number().int().positive(),
  round_timeout_sec: z.number().positive(),
  free_rounds_before_ad: z.number().int().nonnegative(),
  daily_free_attempts: z.number().int().nonnegative(),
  revive_rewarded_after_rounds: z.number().int().nonnegative(),
  banner_enabled: z.boolean(),
  interstitial_after_round: z.boolean(),
});

/* -------------------------------------------------
   LEVELING / QUESTION GENERATION
-------------------------------------------------- */

const LevelingSchema = z.object({
  digits: z.record(z.string(), z.number().int().positive()),
  ops: z.record(
    z.string(),
    z.array(z.enum(["+", "-", "*", "/"]))
  ),
  terms: z.record(z.string(), z.number().int().positive()),
  div_policy: z.object({
    integer_only: z.boolean(),
    nonzero_divisor: z.boolean(),
  }),
  ask_digit_side_weights: z.object({
    front: z.number().min(0).max(1),
    right: z.number().min(0).max(1),
  }),
  kth_digit_rules: z.object({
    min: z.number().int().positive(),
    max_from_front_pct: z.number().min(0).max(100),
    max_from_right_pct: z.number().min(0).max(100),
  }),
  slot_reveal_ms: z.number().nonnegative(),
  rng_seed_source: z.enum([
    "server_session_seed",
    "client_time_seed",
  ]),
});

/* -------------------------------------------------
   SCORING
-------------------------------------------------- */

const ScoringSchema = z.object({
  time_clamp_ms: z.number().positive(),
  formula: z.string(),
  tie_break: z.enum(["earlier_submission_wins"]),
});

/* -------------------------------------------------
   BASE POINTS
-------------------------------------------------- */

const BasePointsByLevelSchema = z.record(
  z.string(),
  z.number().positive()
);

/* -------------------------------------------------
   POINTS DISTRIBUTION
-------------------------------------------------- */

const PointsDistributionItemSchema = z.object({
  range: PercentageRange,
  points: z.number(),
});

const PointsDistributionSchema = z.object({
  min_participants_for_percentiles: z.number().int().positive(),
  single_player_distribution: z.array(
    PointsDistributionItemSchema
  ),
  daily_points_distribution: z.array(
    PointsDistributionItemSchema
  ),
  instant_points_distribution: z.array(
    PointsDistributionItemSchema
  ),
});

/* -------------------------------------------------
   CAPS / ADS LIMITS
-------------------------------------------------- */

const CapsSchema = z.object({
  app_open_per_day: z.number().int().nonnegative(),
  interstitial_per_session: z.number().int().nonnegative(),
  rewarded_per_hour: z.number().int().nonnegative(),
  native_per_list_block: z.number().int().positive(),
  banner_enabled: z.boolean(),
  ad_retry_on_fail_ms: z.number().nonnegative(),
});

/* -------------------------------------------------
   AD UNITS
-------------------------------------------------- */

const AdUnitsSchema = z.object({
  app_open: z.string(),
  banner: z.record(z.string(), z.string()),
  interstitial: z.record(z.string(), z.string()),
  native: z.record(z.string(), z.string()),
  rewarded: z.record(z.string(), z.string()),
});

/* -------------------------------------------------
   LIFELINES
-------------------------------------------------- */

const LifelinesSchema = z.object({
  free_daily: z.record(z.string(), z.number().int().nonnegative()),
  cooldowns_sec: z.record(z.string(), z.number().int().nonnegative()),
  max_per_session: z.record(
    z.string(),
    z.number().int().nonnegative()
  ),
  max_per_day: z.record(
    z.string(),
    z.number().int().nonnegative()
  ),
  plus_30s_applies: z.enum(["session", "question"]),
  rewarded_unlock_type: z.enum(["ad"]),
});

/* -------------------------------------------------
   TOP ATTEMPTS
-------------------------------------------------- */

const TopAttemptsSchema = z.object({
  daily: z.number().int().positive(),
  instant: z.number().int().positive(),
  single_player: z.number().int().positive(),
});

const FeatureFlagsSchema = z.record(z.string(), z.boolean());

const SafetySchema = z.object({
  kill_switch: z.boolean(),
  force_client_defaults: z.boolean(),
});

const ReferralsSchema = z.object({
  referrer_coins: z.number().int().positive(),
  referee_coins: z.number().int().positive(),
  one_referrer_per_user: z.boolean(),
  deep_link_template: z.string(),
  prevent_self_referral: z.boolean(),
  expire_days: z.number().int().positive(),
});

const RewardsSchema = z.object({
  redeem_threshold_coins: z.number().int().positive(),
  auto_claim_convert_time: z.string(),
  fulfill_notification_delay_sec: z.number().int().nonnegative(),
  audit_log_retention_days: z.number().int().positive(),
});

const CronSchema = z.object({
  daily_tournament_create_at: z.string(),
  daily_tournament_finalize_at: z.string(),
  daily_coin_conversion_at: z.string(),
  reset_daily_lifeline_counters_at: z.string(),
});

const AnalyticsSchema = z.object({
  enabled_events: z.record(z.string(), z.boolean()),
  toggleable: z.boolean(),
  etl_export_window_hours: z.number().int().positive(),
});

const LeaderboardSchema = z.object({
  remove_below_coinpoints: z.number().int().nonnegative(),
  history_retention_days: z.number().int().positive(),
  finalize_time_buffer_sec: z.number().int().nonnegative(),
  provisional_refresh_interval_sec: z.number().int().positive(),
});

const QASchema = z.object({
  config_info_visible: z.boolean(),
  simulate_low_participation_threshold: z.number().int().positive(),
});

export const GameConfigSchema = z.object({
  daily_tournament: DailyTournamentSchema,
  instant_tournament: InstantTournamentSchema,
  single_player: SinglePlayerSchema,
  leveling: LevelingSchema,
  base_points_by_level: BasePointsByLevelSchema,
  scoring: ScoringSchema,
  points_distribution: PointsDistributionSchema,
  caps: CapsSchema,
  ad_units: AdUnitsSchema,
  lifelines: LifelinesSchema,
  top_attempts: TopAttemptsSchema,
  feature_flags: FeatureFlagsSchema,
  safety: SafetySchema,
  referrals: ReferralsSchema,
  rewards: RewardsSchema,
  cron: CronSchema,
  analytics: AnalyticsSchema,
  leaderboard: LeaderboardSchema,
  qa: QASchema,
});

export type GameConfig = z.infer<typeof GameConfigSchema>;
