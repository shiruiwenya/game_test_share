/**
 * Subway Runner - Main Game Logic
 * State machine, game loop, input handling, collision detection
 */

class Game {
    constructor() {
        // Get canvas and context
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Initialize renderer
        this.renderer = new Renderer(this.ctx);

        // Game state
        this.state = 'menu'; // menu, tutorial, playing, paused, game_over
        this.score = 0;
        this.highScore = this.loadHighScore();
        this.distance = 0;
        this.speed = CONFIG.speed.initial;
        this.isNewHighScore = false;
        this._coinBonus = 0;

        // Player
        this.player = new Player();

        // Game entities
        this.obstacles = [];
        this.coins = [];
        this.particles = [];

        // Spawn timers
        this.obstacleTimer = 0;
        this.nextObstacleTime = this.getRandomObstacleTime();
        this.coinTimer = 0;

        // Timing
        this.lastTime = 0;
        this.deltaTime = 0;

        // Input states
        this.keys = {};
        this.touchStartY = null;

        // First play check
        this.isFirstPlay = !localStorage.getItem(CONFIG.storage.firstPlayKey);

        // UI button bounds (for click detection)
        this.menuButton = null;
        this.restartButton = null;

        // Bind methods
        this.gameLoop = this.gameLoop.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);

        // Setup input listeners
        this.setupInputListeners();

        // Expose game state for testing
        this.exposeGameState();

        // Start game loop
        requestAnimationFrame(this.gameLoop);
    }

    /**
     * Setup keyboard and touch listeners
     */
    setupInputListeners() {
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        this.canvas.addEventListener('click', this.handleClick);
        this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    }

    /**
     * Handle keydown events
     */
    handleKeyDown(e) {
        this.keys[e.code] = true;

        // Unlock audio on first interaction
        soundManager.unlock();

        if (this.state === 'playing') {
            // Jump
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                if (this.player.jump()) {
                    this.spawnJumpDust();
                }
            }
            // Slide
            if (e.code === 'ArrowDown') {
                e.preventDefault();
                this.player.slide();
            }
            // Pause
            if (e.code === 'Escape') {
                this.pauseGame();
            }
        } else if (this.state === 'paused') {
            if (e.code === 'Escape') {
                this.resumeGame();
            }
        } else if (this.state === 'game_over') {
            if (e.code === 'Enter') {
                this.restartGame();
            }
        }
    }

    /**
     * Handle keyup events
     */
    handleKeyUp(e) {
        this.keys[e.code] = false;
    }

    /**
     * Handle click/tap events
     */
    handleClick(e) {
        soundManager.unlock();
        soundManager.play('click');

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        if (this.state === 'menu') {
            // Check if play button clicked
            if (this.menuButton && this.isInBounds(x, y, this.menuButton)) {
                if (this.isFirstPlay) {
                    this.state = 'tutorial';
                    localStorage.setItem(CONFIG.storage.firstPlayKey, 'true');
                    this.isFirstPlay = false;
                } else {
                    this.startGame();
                }
            }
        } else if (this.state === 'tutorial') {
            this.startGame();
        } else if (this.state === 'game_over') {
            if (this.restartButton && this.isInBounds(x, y, this.restartButton)) {
                this.restartGame();
            }
        }
    }

    /**
     * Handle touch start for mobile controls
     */
    handleTouchStart(e) {
        e.preventDefault();
        soundManager.unlock();

        if (this.state !== 'playing') {
            // Treat as click for menu/game over
            const touch = e.touches[0];
            this.handleClick({ clientX: touch.clientX, clientY: touch.clientY });
            return;
        }

        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const y = (touch.clientY - rect.top) / rect.height;

        // Top half = jump, bottom half = slide
        if (y < 0.5) {
            if (this.player.jump()) {
                this.spawnJumpDust();
            }
        } else {
            this.player.slide();
        }
    }

    /**
     * Handle touch end
     */
    handleTouchEnd(e) {
        e.preventDefault();
    }

    /**
     * Check if point is in bounds
     */
    isInBounds(x, y, bounds) {
        return x >= bounds.x && x <= bounds.x + bounds.width &&
               y >= bounds.y && y <= bounds.y + bounds.height;
    }

    /**
     * Spawn dust particles when jumping
     */
    spawnJumpDust() {
        const playerX = this.player.x + this.player.width / 2;
        const playerY = CONFIG.player.groundY + CONFIG.player.height;

        for (let i = 0; i < CONFIG.effects.jumpDust.particleCount; i++) {
            this.particles.push(new Particle(
                playerX + (Math.random() - 0.5) * 30,
                playerY,
                CONFIG.effects.jumpDust.color,
                'dust'
            ));
        }
    }

    /**
     * Start a new game
     */
    startGame() {
        this.state = 'playing';
        this.score = 0;
        this.distance = 0;
        this.speed = CONFIG.speed.initial;
        this.isNewHighScore = false;
        this._coinBonus = 0;  // Reset coin bonus
        this.player.reset();
        this.obstacles = [];
        this.coins = [];
        this.particles = [];
        this.obstacleTimer = 0;
        this.nextObstacleTime = this.getRandomObstacleTime();

        soundManager.playBGM();
    }

    /**
     * Pause the game
     */
    pauseGame() {
        if (this.state === 'playing') {
            this.state = 'paused';
            soundManager.pauseBGM();
        }
    }

    /**
     * Resume the game
     */
    resumeGame() {
        if (this.state === 'paused') {
            this.state = 'playing';
            soundManager.resumeBGM();
        }
    }

    /**
     * Restart the game
     */
    restartGame() {
        this.startGame();
    }

    /**
     * End the game
     */
    endGame() {
        this.state = 'game_over';
        soundManager.play('collision');
        soundManager.play('gameover');
        soundManager.stopBGM();
        this.renderer.startShake();

        // Check for new high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.isNewHighScore = true;
            this.saveHighScore();
            soundManager.play('highscore');
        }
    }

    /**
     * Main game loop
     */
    gameLoop(timestamp) {
        // Calculate delta time
        this.deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        // Cap delta time to prevent physics issues
        if (this.deltaTime > 100) this.deltaTime = 16.67;

        // Update
        this.update(this.deltaTime);

        // Render
        this.render();

        // Continue loop
        requestAnimationFrame(this.gameLoop);
    }

    /**
     * Update game state
     */
    update(deltaTime) {
        // Update screen shake
        this.renderer.updateShake(deltaTime);

        if (this.state !== 'playing') return;

        // Increase speed over time
        if (this.speed < CONFIG.speed.max) {
            this.speed += CONFIG.speed.acceleration * deltaTime;
        }

        // Update distance
        this.distance += this.speed * deltaTime * 0.01;

        // Calculate score: distance score + coin bonus
        this.score = Math.floor(this.distance) * CONFIG.scoring.distancePoints + this._coinBonus;

        // Update player
        this.player.update(deltaTime);

        // Spawn obstacles
        this.obstacleTimer += deltaTime;
        if (this.obstacleTimer >= this.nextObstacleTime) {
            this.spawnObstacle();
            this.obstacleTimer = 0;
            this.nextObstacleTime = this.getRandomObstacleTime();

            // Maybe spawn coins
            if (Math.random() < CONFIG.coins.spawnChance) {
                this.spawnCoins();
            }
        }

        // Update obstacles
        this.obstacles.forEach(obstacle => {
            obstacle.update(this.speed);
        });

        // Remove off-screen obstacles
        this.obstacles = this.obstacles.filter(o => !o.isOffScreen());

        // Update coins
        this.coins.forEach(coin => {
            coin.update(this.speed, deltaTime);
        });

        // Remove off-screen or collected coins
        this.coins = this.coins.filter(c => !c.isOffScreen() && !c.collected);

        // Update particles
        this.particles.forEach(p => p.update(deltaTime));
        this.particles = this.particles.filter(p => !p.isDead());

        // Check collisions
        this.checkCollisions();

        // Update exposed game state
        this.updateGameState();
    }

    /**
     * Render the game
     */
    render() {
        this.renderer.clear();

        // Draw background and ground regardless of state
        this.renderer.drawBackground(this.state === 'playing' ? this.speed : 2);
        this.renderer.drawGround(this.state === 'playing' ? this.speed : 2);

        if (this.state === 'playing' || this.state === 'paused' || this.state === 'game_over') {
            // Draw speed lines
            this.renderer.drawSpeedLines(this.speed);

            // Draw coins
            this.coins.forEach(coin => {
                this.renderer.drawCoin(coin);
            });

            // Draw obstacles
            this.obstacles.forEach(obstacle => {
                this.renderer.drawObstacle(obstacle);
            });

            // Draw player
            this.renderer.drawPlayer(this.player);

            // Draw particles
            this.particles.forEach(p => {
                this.renderer.drawParticle(p);
            });

            // Draw HUD
            this.renderer.drawHUD(this.score, this.highScore, this.distance, this.speed);
        }

        // Draw UI screens
        if (this.state === 'menu') {
            this.menuButton = this.renderer.drawMenuScreen(this.highScore);
        } else if (this.state === 'tutorial') {
            this.renderer.drawTutorialScreen();
        } else if (this.state === 'paused') {
            this.renderer.drawPauseScreen();
        } else if (this.state === 'game_over') {
            this.restartButton = this.renderer.drawGameOverScreen(this.score, this.highScore, this.isNewHighScore);
        }

        this.renderer.restore();
    }

    /**
     * Check collisions between player and obstacles/coins
     */
    checkCollisions() {
        const playerHitbox = this.player.getHitbox();
        const playerState = this.player.state;

        // Check obstacle collisions
        for (const obstacle of this.obstacles) {
            if (obstacle.checkCollision(playerHitbox, playerState)) {
                this.endGame();
                return;
            }
        }

        // Check coin collisions
        for (const coin of this.coins) {
            if (!coin.collected && coin.checkCollision(playerHitbox)) {
                coin.collect();
                this._coinBonus += CONFIG.scoring.coinPoints;

                // Spawn coin particles
                for (let i = 0; i < CONFIG.effects.coinCollect.particleCount; i++) {
                    this.particles.push(new Particle(
                        coin.x + coin.size / 2,
                        coin.y + coin.size / 2,
                        CONFIG.effects.coinCollect.color,
                        'coin'
                    ));
                }
            }
        }
    }

    /**
     * Spawn a new obstacle
     */
    spawnObstacle() {
        const types = CONFIG.obstacles.types;
        const type = types[Math.floor(Math.random() * types.length)];

        // Make sure there's enough gap from last obstacle
        const lastObstacle = this.obstacles[this.obstacles.length - 1];
        let spawnX = CONFIG.canvas.width + 50;

        if (lastObstacle) {
            const minX = lastObstacle.x + lastObstacle.width + CONFIG.obstacles.minGap;
            spawnX = Math.max(spawnX, minX);
        }

        this.obstacles.push(new Obstacle(type, spawnX));
    }

    /**
     * Spawn coins with a pattern
     */
    spawnCoins() {
        const patternId = CoinPatternGenerator.getRandomPattern();
        const lastObstacle = this.obstacles[this.obstacles.length - 1];
        let startX = CONFIG.canvas.width + 100;

        if (lastObstacle) {
            startX = lastObstacle.x + lastObstacle.width + 100;
        }

        const newCoins = CoinPatternGenerator.generate(patternId, startX, CONFIG.ground.y);
        this.coins.push(...newCoins);
    }

    /**
     * Get random obstacle spawn time
     */
    getRandomObstacleTime() {
        const min = CONFIG.obstacles.spawnInterval.min;
        const max = CONFIG.obstacles.spawnInterval.max;
        // Reduce spawn time as speed increases
        const speedFactor = 1 - (this.speed - CONFIG.speed.initial) / (CONFIG.speed.max - CONFIG.speed.initial) * 0.3;
        return (min + Math.random() * (max - min)) * speedFactor;
    }

    /**
     * Load high score from localStorage
     */
    loadHighScore() {
        const saved = localStorage.getItem(CONFIG.storage.highScoreKey);
        return saved ? parseInt(saved, 10) : 0;
    }

    /**
     * Save high score to localStorage
     */
    saveHighScore() {
        localStorage.setItem(CONFIG.storage.highScoreKey, this.highScore.toString());
    }

    /**
     * Expose game state for testing
     */
    exposeGameState() {
        window.GAME_STATE = {
            gameState: this.state,
            score: this.score,
            highScore: this.highScore,
            distance: this.distance,
            speed: this.speed,
            playerState: this.player.state,
            obstacles: this.obstacles,
            coins: this.coins,
            isNewHighScore: this.isNewHighScore,

            // Test helpers
            _testHelpers: {
                // Get current game instance
                getGame: () => this,

                // Simulate key press
                pressKey: (code) => {
                    this.handleKeyDown({ code, preventDefault: () => {} });
                },

                // Simulate key release
                releaseKey: (code) => {
                    this.handleKeyUp({ code });
                },

                // Simulate click at position
                click: (x, y) => {
                    const rect = this.canvas.getBoundingClientRect();
                    this.handleClick({
                        clientX: rect.left + x / (this.canvas.width / rect.width),
                        clientY: rect.top + y / (this.canvas.height / rect.height)
                    });
                },

                // Force start game
                forceStart: () => {
                    this.startGame();
                },

                // Force end game
                forceEnd: () => {
                    this.endGame();
                },

                // Get player hitbox
                getPlayerHitbox: () => this.player.getHitbox(),

                // Check if player is jumping
                isJumping: () => this.player.state === 'jumping',

                // Check if player is sliding
                isSliding: () => this.player.state === 'sliding',

                // Add obstacle for testing
                addObstacle: (typeId) => {
                    const type = CONFIG.obstacles.types.find(t => t.id === typeId);
                    if (type) {
                        this.obstacles.push(new Obstacle(type, CONFIG.canvas.width));
                    }
                },

                // Add coin for testing
                addCoin: (x, y) => {
                    this.coins.push(new Coin(x, y));
                },

                // Set game state
                setState: (state) => {
                    this.state = state;
                },

                // Set score
                setScore: (score) => {
                    this.score = score;
                }
            }
        };
    }

    /**
     * Update the exposed game state object
     */
    updateGameState() {
        if (window.GAME_STATE) {
            window.GAME_STATE.gameState = this.state;
            window.GAME_STATE.score = this.score;
            window.GAME_STATE.highScore = this.highScore;
            window.GAME_STATE.distance = this.distance;
            window.GAME_STATE.speed = this.speed;
            window.GAME_STATE.playerState = this.player.state;
            window.GAME_STATE.obstacles = this.obstacles;
            window.GAME_STATE.coins = this.coins;
            window.GAME_STATE.isNewHighScore = this.isNewHighScore;
        }
    }
}

// Start game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
