const gameConfig = {
  // Remote config metadata
  schema_version: "1.0.0",               // JSON Schema version used to validate this object
  version: "1.0.0",                      // semantic config version (bump on publish)
  updated_at: "2025-11-05T00:00:00Z",    // ISO timestamp
  updated_by: "admin@example.com",       // who published (fill at publish-time)
  notes: "Initial complete config import from PRD", // optional changelog

  // 1) Tournament / Game mode configs
  daily_tournament: {
    duration_sec: 300,                   // total match length in seconds (5 minutes)
    breaks_sec: [60, 120, 180, 240],     // minute breakpoints for leaderboards
    extra_attempts_rewarded: 3,          // rewarded ad grant on replay
    difficulty_increase: "per_question", // "per_question" | "per_correct" | "fixed"
    banner_delay_sec: 10,                // show banner after N seconds
    interstitial_before_resume: true,    // show interstitial on Continue button
    minute_snapshot_keys: [1,2,3,4,5],   // minute keys including final
    server_timer_tolerance_sec: 1        // allowed tolerance when validating client timer
  },
  // 2
  instant_tournament: {
    room_size_max: 100,
    room_wait_timeout_sec: 1200,   // 20 minutes TTL for room creation
    match_duration_sec: 180,       // player session length (3 minutes)
    ad_minute_breaks: true,
    banner_delay_sec: 10,
    allow_early_submit_interstitial: true,
    assume_players_for_percentile: 100 // used by client when computing provisional coin points
  },

  single_player: {
    round_size: 5,                         // questions per round
    points_per_round_factor: 0.03,         // as PRD: used to compute points per round
    point_for_correct_answer: 1,           // legacy fallback per-question points (kept for backward compat)
    level_increase_every_n_questions: 2,
    round_timeout_sec: 60,                 // time for an entire round
    free_rounds_before_ad: 3,              // number of rounds before rewarded ad is required to continue
    daily_free_attempts: 10,
    revive_rewarded_after_rounds: 3,       // show rewarded ad after N rounds to continue
    banner_enabled: true,
    interstitial_after_round: true
  },

  // 2) Question leveling + generator config (QS-2 / QS-3)
  leveling: {
    // approximate digits desired for result per level
    digits: { "L1": 3, "L2": 4, "L3": 5, "L4": 6, "L5": 7},
    ops: {
      "L1": ["+"],
      "L2": ["+","-"],
      "L3": ["+","-","*"],
      "L4": ["+","-","*","/"],
      "L5": ["+","-","*","/"]
    },
    terms: { "L1": 2, "L2": 2, "L3": 3, "L4": 3, "L5": 4 },
    div_policy: { integer_only: true, nonzero_divisor: true },
    ask_digit_side_weights: { front: 0.5, right: 0.5 },
    kth_digit_rules: { min: 1, max_from_front_pct: 70, max_from_right_pct: 70 },
    slot_reveal_ms: 300,                      // optional reveal animation length (client-SKIP)
    rng_seed_source: "server_session_seed"    // "server_session_seed" or "client_time_seed"
  },

  // base points mapping per level (used as base_points in scoring formula)
  base_points_by_level: {
    "L1": 10,
    "L2": 12,
    "L3": 15,
    "L4": 18,
    "L5": 22,
  },

  // scoring specifics (used by server when computing points)
  scoring: {
    time_clamp_ms: 10000,   // clamp for (10000 - timeTakenMs)
    formula: "total_points = base_points + (10000 - timeTakenMs)/10000",
    tie_break: "earlier_submission_wins"
  },

  // 3) Points distribution => Coin Points mapping (SC-1 / DT-5 / IT-5)
  // Note: `range` strings are percentiles or range descriptors. Keep consistent.
  points_distribution: {
    min_participants_for_percentiles: 50,   // fallback to rank-based if participants < this
    single_player_distribution: [
      { range: "0-1", points: 30 },
      { range: "1-5", points: 20 },
      { range: "5-10", points: 15 },
      { range: "10-20", points: 10 },
      { range: "20-50", points: 5 },
      { range: "50-100", points: 1 },
    ],    
    daily_points_distribution: [
      { range: "0-1", points: 30 },    // top 0-1% get 30 CP (matches PRD example tables)
      { range: "1-2", points: 20 },
      { range: "2-5", points: 15 },
      { range: "5-10", points: 10 },
      { range: "10-20", points: 9 },
      { range: "20-50", points: 8 },
      { range: "50-100", points: 1 }
    ],
    instant_points_distribution: [
      { range: "1", points: 5 },
      { range: "2", points: 3 },
      { range: "3-5", points: 2 },
      { range: "6-10", points: 1.5 },
      { range: "11-50", points: 1 },
      { range: "51-100", points: 0.5 }
    ]
  },

  // 4) Caps for Ads & general limits (AD-6 / AD-1)
  caps: {
    app_open_per_day: 4,
    interstitial_per_session: 5,   // conservative default (adjust remotely)
    rewarded_per_hour: 10,
    native_per_list_block: 20,     // show native after every 20 ranks
    banner_enabled: true,
    ad_retry_on_fail_ms: 2500      // client retry timeout before auto-continue
  },

  // 5) Lifelines configuration (LF-1..LF-7)
  lifelines: {
    free_daily: { fifty_fifty: 1, level_down: 1, plus_30s: 0 },
    cooldowns_sec: { fifty_fifty: 60, level_down: 60, plus_30s: 60 },
    max_per_session: { fifty_fifty: 3, level_down: 2, plus_30s: 1 },
    max_per_day: { fifty_fifty: 5, level_down: 5, plus_30s: 3 },
    plus_30s_applies: "session",  // "session" for Daily/Instant, "question" for Single Player
    rewarded_unlock_type: "ad"     // unlock lifeline extra uses via rewarded ads
  },

  // 6) Best-N aggregation and top-attempts (SC-2 & SC-4)
  top_attempts: {
    daily: 1,
    instant: 10,
    single_player: 10
  },

  // 7) Feature flags (toggle experiments / behavior)
  feature_flags: {
    use_rank_fallback_under_min_players: true,
    instant_submit_gate_interstitial: true,
    enable_analytics_event_capture: true,
    throttle_interstitial_on_skip_rate: true,
    require_interstitial_before_final_submit: true
  },

  // 8) Safety flags
  safety: {
    kill_switch: false,               // full feature kill
    force_client_defaults: false      // ignore remote config, use client defaults
  },

  // 9) Ad Unit IDs (per placement)
  ad_units: {
    app_open: "ca-app-pub-xxx-OPEN",
    banner: {
      daily: "ca-app-pub-xxx-B-DAILY",
      instant: "ca-app-pub-xxx-B-INSTANT",
      single_player: "ca-app-pub-xxx-B-SP"
    },
    interstitial: {
      daily: "ca-app-pub-xxx-I-DAILY",
      instant: "ca-app-pub-xxx-I-INSTANT",
      single_player: "ca-app-pub-xxx-I-SP"
    },
    native: {
      daily_leaderboard_popup: "ca-app-pub-xxx-N-DAILY-POPUP",
      instant_leaderboard_popup: "ca-app-pub-xxx-N-INSTANT-POPUP",
      leaderboard_scroll: "ca-app-pub-xxx-N-SCROLL",
      sp_round_summary: "ca-app-pub-xxx-N-SP-SUMMARY"
    },
    rewarded: {
      daily_attempt: "ca-app-pub-xxx-R-DAILY",
      instant_attempt: "ca-app-pub-xxx-R-INSTANT",
      singleplayer_attempt: "ca-app-pub-xxx-R-SP",
      lifeline: "ca-app-pub-xxx-R-LIFELINE"
    }
  },

  // 10) Referral / Growth config (RF-1 / RF-2)
  referrals: {
    referrer_coins: 50,
    referee_coins: 20,
    one_referrer_per_user: true,
    deep_link_template: "app://r/{code}",
    prevent_self_referral: true,
    expire_days: 30
  },

  // 11) Rewards & Claims thresholds (RW-1..RW-3)
  rewards: {
    redeem_threshold_coins: 5000,
    auto_claim_convert_time: "00:05:00", // conversion job time after midnight (HH:MM:SS)
    fulfill_notification_delay_sec: 30,   // time to reflect fulfillment in UI (poll window)
    audit_log_retention_days: 365
  },

  // 12) Admin / Cron / Archival config
  cron: {
    daily_tournament_create_at: "00:00:00",   // local IST time (cron schedule)
    daily_tournament_finalize_at: "23:50:00",
    daily_coin_conversion_at: "00:05:00",
    reset_daily_lifeline_counters_at: "00:00:00"
  },

  // 13) Analytics & A/B toggles (Epic 10)
  analytics: {
    enabled_events: {
      session_start: true,
      question_answer: true,
      lifeline_use: true,
      ad_reward_granted: true,
      session_end: true,
      reattempt: true
    },
    toggleable: true,      // remote can enable/disable analytics groups
    etl_export_window_hours: 24
  },

  // 14) Leaderboard / Aggregation tuning
  leaderboard: {
    remove_below_coinpoints: 5,      // remove users with < 5 CP before percentile calculations
    history_retention_days: 1,       // keep finalized snapshots for 'yesterday' toggle
    finalize_time_buffer_sec: 600,   // buffer before finalization to avoid overlaps
    provisional_refresh_interval_sec: 60 // how often UI should fetch provisional totals
  },

  // 15) Developer / QA flags (client helpful)
  qa: {
    config_info_visible: true,        // allow QA screen to show version + source
    simulate_low_participation_threshold: 10
  }
};

export default gameConfig;
