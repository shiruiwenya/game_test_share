/**
 * config.js - Game configuration, level data, veggie types, scoring, colors
 * No dependencies.
 */

var CONFIG = {
  // Canvas
  CANVAS_WIDTH: 540,
  CANVAS_HEIGHT: 960,
  BG_COLOR: '#F5E6D0',

  // Board area
  BOARD_AREA: { x: 15, y: 145, width: 510, height: 510 },
  CELL_GAP: 2,

  // Animation durations (ms)
  ANIM: {
    SWAP: 200,
    MATCH_DISAPPEAR: 300,
    FALL: 200,
    INVALID_SWAP: 300,
    COMBO_POPUP: 800,
    SPECIAL_CREATE: 500,
    STRIPE_ACTIVATE: 400,
    RAINBOW_ACTIVATE: 600,
    STAR_EARN: 500,
    CONFETTI: 2000,
    HINT_PULSE: 1000,
    SELECTED_PULSE: 600
  },

  // Hint
  HINT_DELAY: 5000, // 5 seconds idle before hint

  // Scoring
  SCORE_EVENTS: {
    match_3: 50,
    match_4: 120,
    match_5: 300,
    match_L_T: 200,
    special_stripe_activate: 150,
    special_rainbow_activate: 500
  },

  // Combo (cascade multiplier)
  COMBO: {
    BASE_MULTIPLIER: 1.0,
    INCREMENT: 0.5,
    MAX: 5.0
  },

  // Star rating thresholds per level
  STAR_THRESHOLDS: {
    1: { star_1: 1000, star_2: 2000, star_3: 3000 },
    2: { star_1: 2000, star_2: 4000, star_3: 6000 },
    3: { star_1: 3500, star_2: 6000, star_3: 9000 },
    4: { star_1: 5000, star_2: 8000, star_3: 12000 },
    5: { star_1: 7000, star_2: 11000, star_3: 16000 }
  },

  // Veggie configuration
  VEGGIES: {
    tomato:   { color: '#E74C3C', name: '番茄',  asset_id: 'veggie_tomato',   emoji: '🍅' },
    carrot:   { color: '#E67E22', name: '胡萝卜', asset_id: 'veggie_carrot',   emoji: '🥕' },
    eggplant: { color: '#8E44AD', name: '茄子',   asset_id: 'veggie_eggplant', emoji: '🍆' },
    broccoli: { color: '#27AE60', name: '西兰花', asset_id: 'veggie_broccoli', emoji: '🥦' },
    corn:     { color: '#F1C40F', name: '玉米',   asset_id: 'veggie_corn',     emoji: '🌽' },
    chili:    { color: '#C0392B', name: '辣椒',   asset_id: 'veggie_chili',    emoji: '🌶' }
  },

  // Special types
  SPECIAL: {
    NONE: 'none',
    STRIPE_H: 'stripe_h',
    STRIPE_V: 'stripe_v',
    RAINBOW: 'rainbow'
  },

  // Levels
  LEVELS: [
    {
      level_number: 1,
      description: '入门关 - 欢迎来到菜园',
      grid_rows: 6,
      grid_cols: 6,
      veggie_types: ['tomato', 'carrot', 'eggplant', 'broccoli'],
      max_moves: 25,
      target_score: 1000,
      targets: [
        { veggie: 'tomato', count: 10 },
        { veggie: 'carrot', count: 10 }
      ]
    },
    {
      level_number: 2,
      description: '进阶关 - 丰收时节',
      grid_rows: 7,
      grid_cols: 7,
      veggie_types: ['tomato', 'carrot', 'eggplant', 'broccoli', 'corn'],
      max_moves: 22,
      target_score: 2000,
      targets: [
        { veggie: 'tomato', count: 15 },
        { veggie: 'broccoli', count: 15 },
        { veggie: 'corn', count: 10 }
      ]
    },
    {
      level_number: 3,
      description: '中级关 - 蔬菜大会',
      grid_rows: 8,
      grid_cols: 8,
      veggie_types: ['tomato', 'carrot', 'eggplant', 'broccoli', 'corn'],
      max_moves: 20,
      target_score: 3500,
      targets: [
        { veggie: 'eggplant', count: 20 },
        { veggie: 'corn', count: 20 },
        { veggie: 'carrot', count: 15 }
      ]
    },
    {
      level_number: 4,
      description: '挑战关 - 辣椒来了',
      grid_rows: 8,
      grid_cols: 8,
      veggie_types: ['tomato', 'carrot', 'eggplant', 'broccoli', 'corn', 'chili'],
      max_moves: 18,
      target_score: 5000,
      targets: [
        { veggie: 'chili', count: 15 },
        { veggie: 'tomato', count: 20 },
        { veggie: 'broccoli', count: 20 },
        { veggie: 'eggplant', count: 15 }
      ]
    },
    {
      level_number: 5,
      description: '终极关 - 菜园大丰收',
      grid_rows: 9,
      grid_cols: 9,
      veggie_types: ['tomato', 'carrot', 'eggplant', 'broccoli', 'corn', 'chili'],
      max_moves: 15,
      target_score: 7000,
      targets: [
        { veggie: 'tomato', count: 25 },
        { veggie: 'carrot', count: 25 },
        { veggie: 'eggplant', count: 20 },
        { veggie: 'broccoli', count: 20 },
        { veggie: 'corn', count: 15 },
        { veggie: 'chili', count: 15 }
      ]
    }
  ],

  // UI Colors
  COLORS: {
    primary: '#4CAF50',
    secondary: '#8BC34A',
    accent: '#FF9800',
    text: '#4A2F1A',
    text_light: '#FFFFFF',
    panel_bg: '#2D5016',
    panel_border: '#1A3A0A',
    board_bg: '#C8A46E',
    cell_bg: '#D4A574',
    cell_highlight: '#FFD700',
    btn_green: '#27AE60',
    btn_blue: '#3498DB',
    btn_red: '#E74C3C',
    btn_brown: '#8B6914',
    menu_bg: '#87CEEB',
    beige_panel: '#FFF3E0'
  },

  // Fonts
  FONTS: {
    primary: 'Arial, sans-serif',
    score: '"Arial Black", Arial, sans-serif',
    title: '"Arial Black", Impact, sans-serif'
  },

  // Warning threshold for moves
  LOW_MOVES_WARNING: 3
};
