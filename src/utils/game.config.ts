const masterConfig = {
    version: '1.0.1',
    updated_at: '2025-11',

    daily_tournament: {
      duration_sec: 300,
      breaks_sec: [60, 120, 180, 240],
      extra_attempts_rewarded: 3,
      difficulty_increase: 'per_question',
    },

    instant_tournament: {
      room_size_max: 100,
      room_wait_timeout_sec: 1200,
      match_duration_sec: 180,
      ad_minute_breaks: true,
    },

    single_player: {
      round_size: 5,
      level_increase_every_n_questions: 2,
      daily_free_attempts: 10,
    },

    points_distribution: {
      daily_tournament: [
        // add here 
        // totalPoints = basePoints + (10000 - timeTakenMs)/10000
      ],
      instant_tournament: [
        { range: '1', points: 5 },
        { range: '2', points: 3 },
        { range: '2', points: 2 },
        { range: '5', points: 1.5 },
        { range: '5', points: 1 },
        { range: '30', points: 1 },
      ],
    },

    caps: {
      app_open_per_day: 5,
      interstitial_per_session: 10,
      rewarded_per_hour: 10,
    },

    lifelines: {
      free_daily: { fifty_fifty: 1, level_down: 1, plus_30s: 0 },
      cooldowns_sec: { fifty_fifty: 60, level_down: 60, plus_30s: 60 },
      max_per_session: { fifty_fifty: 3, level_down: 2, plus_30s: 1 },
    },

    feature_flags: {
      use_rank_fallback_under_min_players: true,
      instant_submit_gate_interstitial: true,
    },

    top_attempts: {
      daily: 1,
      instant: 10,
      single_player: 10,
    },

    safety: {
      kill_switch: false,
      force_client_defaults: false,
    },

    ad_units: {
      app_open: 'ca-app-pub-xxx-OPEN',
      banner: {
        daily: 'ca-app-pub-xxx-B-DAILY',
        instant: 'ca-app-pub-xxx-B-INSTANT',
        single_player: 'ca-app-pub-xxx-B-SP',
      },
      interstitial: {
        daily: 'ca-app-pub-xxx-I-DAILY',
        instant: 'ca-app-pub-xxx-I-INSTANT',
        single_player: 'ca-app-pub-xxx-I-SP',
      },
      native: {
        daily_leaderboard_popup: 'ca-app-pub-xxx-N-DAILY-POPUP',
        instant_leaderboard_popup: 'ca-app-pub-xxx-N-INSTANT-POPUP',
        leaderboard_scroll: 'ca-app-pub-xxx-N-SCROLL',
        sp_round_summary: 'ca-app-pub-xxx-N-SP-SUMMARY',
      },
      rewarded: {
        daily_attempt: 'ca-app-pub-xxx-R-DAILY',
        instant_attempt: 'ca-app-pub-xxx-R-INSTANT',
        singleplayer_attempt: 'ca-app-pub-xxx-R-SP',
        lifeline: 'ca-app-pub-xxx-R-LIFELINE',
      },
    },
  };