/**
 * Subway Runner - Configuration
 * All game constants extracted from GDD
 */

const CONFIG = {
    // Canvas settings
    canvas: {
        width: 960,
        height: 540,
        backgroundColor: '#87CEEB'
    },

    // Player settings
    player: {
        x: 150,                    // Fixed X position
        groundY: 340,              // Y position when on ground
        width: 60,
        height: 100,
        slideWidth: 80,
        slideHeight: 50,
        jumpForce: 15,
        gravity: 0.8,
        slideDuration: 500,        // ms
        // Hitbox smaller than display to account for transparent padding in AI-generated images
        hitbox: { width: 40, height: 85 },
        slideHitbox: { width: 60, height: 40 }
    },

    // Speed settings
    speed: {
        initial: 4,
        max: 10,
        acceleration: 0.0004
    },

    // Ground settings
    ground: {
        y: 440,
        height: 100
    },

    // Scoring
    scoring: {
        coinPoints: 10,
        distancePoints: 1          // Per meter
    },

    // Obstacle types
    obstacles: {
        types: [
            {
                id: 'low_barrier',
                assetId: 'obstacle_barrier',
                heightType: 'low',
                width: 60,
                height: 50,
                yOffset: 0,
                actionRequired: 'jump',
                hitbox: { width: 50, height: 45 },
                color: '#DC143C'
            },
            {
                id: 'crate',
                assetId: 'obstacle_crate',
                heightType: 'low',
                width: 50,
                height: 50,
                yOffset: 0,
                actionRequired: 'jump',
                hitbox: { width: 45, height: 45 },
                color: '#8B4513'
            },
            {
                id: 'high_sign',
                assetId: 'obstacle_sign',
                heightType: 'high',
                width: 40,
                height: 100,
                yOffset: -50,
                actionRequired: 'slide',
                hitbox: { width: 35, height: 90 },
                color: '#FFD700'
            },
            {
                id: 'overhead_pipe',
                assetId: 'obstacle_pipe',
                heightType: 'high',
                width: 80,
                height: 60,
                yOffset: -40,
                actionRequired: 'slide',
                hitbox: { width: 75, height: 55 },
                color: '#228B22'
            },
            {
                id: 'train',
                assetId: 'obstacle_train',
                heightType: 'full',
                width: 200,
                height: 120,
                yOffset: -20,
                actionRequired: 'any',
                hitbox: { width: 180, height: 100 },
                color: '#1E90FF'
            }
        ],
        spawnInterval: { min: 1500, max: 3000 },
        minGap: 300
    },

    // Coin patterns
    coins: {
        size: 30,
        color: '#FFD700',
        patterns: [
            {
                id: 'line',
                count: 5,
                formation: 'horizontal'
            },
            {
                id: 'arc',
                count: 7,
                formation: 'arc'
            },
            {
                id: 'diagonal_up',
                count: 4,
                formation: 'diagonal_up'
            },
            {
                id: 'low_line',
                count: 4,
                formation: 'low_horizontal'
            }
        ],
        spawnChance: 0.6
    },

    // Storage keys
    storage: {
        highScoreKey: 'subway_runner_highscore',
        firstPlayKey: 'subway_runner_first_play'
    },

    // UI colors
    colors: {
        primary: '#4CAF50',
        secondary: '#2196F3',
        accent: '#FFD700',
        text: '#333333',
        textLight: '#FFFFFF',
        danger: '#E74C3C',
        warning: '#FF9800'
    },

    // Fonts
    fonts: {
        primary: 'Arial, sans-serif',
        score: 'Impact, Arial Black, sans-serif',
        title: 'Comic Sans MS, cursive, sans-serif'
    },

    // Effects
    effects: {
        coinCollect: {
            duration: 300,
            particleCount: 5,
            color: '#FFD700'
        },
        jumpDust: {
            duration: 200,
            particleCount: 3,
            color: '#A0A0A0'
        },
        slideTrail: {
            duration: 400,
            color: '#87CEEB'
        },
        collisionShake: {
            duration: 300,
            intensity: 10
        },
        speedLines: {
            triggerSpeed: 15,
            opacity: 0.3
        }
    },

    // Audio paths
    audio: {
        bgmPath: 'assets/audio/bgm_gameplay.mp3',
        bgmVolume: 0.4
    }
};

// Freeze config to prevent accidental modification
Object.freeze(CONFIG);
