/**
 * Subway Runner - Entity Classes
 * Player, Obstacle, Coin, and Particle definitions
 */

/**
 * Player class - handles physics and state
 */
class Player {
    constructor() {
        this.x = CONFIG.player.x;
        this.y = CONFIG.player.groundY;
        this.width = CONFIG.player.width;
        this.height = CONFIG.player.height;
        this.velocityY = 0;
        this.state = 'running'; // 'running', 'jumping', 'sliding'
        this.slideTimer = 0;
        this.isOnGround = true;
        this.animFrame = 0;
        this.animTimer = 0;
        this.justJumped = false; // Flag for dust particle spawning
    }

    /**
     * Initiate a jump
     */
    jump() {
        if (this.isOnGround && this.state !== 'sliding') {
            this.velocityY = -CONFIG.player.jumpForce;
            this.isOnGround = false;
            this.state = 'jumping';
            this.justJumped = true; // Signal to spawn dust particles
            soundManager.play('jump');
            return true;
        }
        return false;
    }

    /**
     * Initiate a slide
     */
    slide() {
        if (this.isOnGround && this.state !== 'jumping') {
            this.state = 'sliding';
            this.slideTimer = CONFIG.player.slideDuration;
            this.width = CONFIG.player.slideWidth;
            this.height = CONFIG.player.slideHeight;
            this.y = CONFIG.player.groundY + (CONFIG.player.height - CONFIG.player.slideHeight);
            soundManager.play('slide');
            return true;
        }
        return false;
    }

    /**
     * Update player state
     * @param {number} deltaTime - Time since last update in ms
     */
    update(deltaTime) {
        // Handle jumping physics
        if (!this.isOnGround) {
            this.velocityY += CONFIG.player.gravity;
            this.y += this.velocityY;

            // Check if landed
            if (this.y >= CONFIG.player.groundY) {
                this.y = CONFIG.player.groundY;
                this.velocityY = 0;
                this.isOnGround = true;
                this.state = 'running';
                this.width = CONFIG.player.width;
                this.height = CONFIG.player.height;
                soundManager.play('land');
            }
        }

        // Handle sliding
        if (this.state === 'sliding') {
            this.slideTimer -= deltaTime;
            if (this.slideTimer <= 0) {
                this.state = 'running';
                this.width = CONFIG.player.width;
                this.height = CONFIG.player.height;
                this.y = CONFIG.player.groundY;
            }
        }

        // Update animation
        this.animTimer += deltaTime;
        if (this.animTimer > 100) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 4;
        }
    }

    /**
     * Get current hitbox (smaller than display to account for transparent padding)
     */
    getHitbox() {
        const hb = this.state === 'sliding'
            ? CONFIG.player.slideHitbox
            : CONFIG.player.hitbox;
        return {
            x: this.x + (this.width - hb.width) / 2,
            y: this.y + (this.height - hb.height),
            width: hb.width,
            height: hb.height
        };
    }

    /**
     * Reset player to initial state
     */
    reset() {
        this.x = CONFIG.player.x;
        this.y = CONFIG.player.groundY;
        this.width = CONFIG.player.width;
        this.height = CONFIG.player.height;
        this.velocityY = 0;
        this.state = 'running';
        this.slideTimer = 0;
        this.isOnGround = true;
        this.animFrame = 0;
        this.animTimer = 0;
        this.justJumped = false;
    }
}

/**
 * Obstacle class
 */
class Obstacle {
    constructor(type, x) {
        this.type = type;
        this.x = x;
        this.width = type.width;
        this.height = type.height;
        // Calculate Y position based on type
        this.y = CONFIG.ground.y - type.height + type.yOffset;
        this.hitbox = type.hitbox;
        this.passed = false;
    }

    /**
     * Update obstacle position
     * @param {number} speed - Current game speed
     */
    update(speed) {
        this.x -= speed;
    }

    /**
     * Check if obstacle is off screen
     */
    isOffScreen() {
        return this.x + this.width < -50;
    }

    /**
     * Get collision hitbox
     * Position depends on obstacle height type:
     * - low: hitbox at bottom (player must jump over)
     * - high: hitbox at top (player must slide under)
     * - full: hitbox covers entire obstacle
     */
    getHitbox() {
        const hbX = this.x + (this.width - this.hitbox.width) / 2;
        let hbY;

        if (this.type.heightType === 'high') {
            // High obstacles: hitbox at TOP of obstacle (overhead)
            // Player needs to slide to avoid collision
            hbY = this.y;
        } else if (this.type.heightType === 'full') {
            // Full height obstacles: hitbox centered vertically
            hbY = this.y + (this.height - this.hitbox.height) / 2;
        } else {
            // Low obstacles: hitbox at BOTTOM of obstacle
            // Player needs to jump to avoid collision
            hbY = this.y + (this.height - this.hitbox.height);
        }

        return {
            x: hbX,
            y: hbY,
            width: this.hitbox.width,
            height: this.hitbox.height
        };
    }

    /**
     * Check collision with player
     * 跑酷游戏逻辑：只要玩家在障碍物到达时执行了正确的动作，就能通过
     * @param {Object} playerHitbox - Player hitbox
     * @param {string} playerState - Player state ('running', 'jumping', 'sliding')
     */
    checkCollision(playerHitbox, playerState) {
        const hb = this.getHitbox();

        // 先检查 X 轴是否有重叠（障碍物是否到达玩家位置）
        const xOverlap = playerHitbox.x < hb.x + hb.width &&
                         playerHitbox.x + playerHitbox.width > hb.x;

        if (!xOverlap) {
            return false; // 障碍物还没到达，不碰撞
        }

        // 障碍物到达玩家位置，检查玩家是否执行了正确的动作

        // 低障碍：需要跳跃
        if (this.type.heightType === 'low') {
            if (playerState === 'jumping') {
                return false; // 正在跳跃，通过！
            }
        }

        // 高障碍：需要滑行
        if (this.type.heightType === 'high') {
            if (playerState === 'sliding') {
                return false; // 正在滑行，通过！
            }
        }

        // 混合障碍（如 train）：跳跃或滑行都行
        if (this.type.heightType === 'full') {
            if (playerState === 'jumping' || playerState === 'sliding') {
                return false; // 有动作就能通过
            }
        }

        // 没有执行正确动作，检查 Y 轴碰撞
        const yOverlap = playerHitbox.y < hb.y + hb.height &&
                         playerHitbox.y + playerHitbox.height > hb.y;

        return yOverlap; // X 和 Y 都重叠才碰撞
    }
}

/**
 * Coin class
 */
class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = CONFIG.coins.size;
        this.collected = false;
        this.animAngle = 0;
        this.sparkleTimer = 0;
    }

    /**
     * Update coin position and animation
     * @param {number} speed - Current game speed
     * @param {number} deltaTime - Time since last update
     */
    update(speed, deltaTime) {
        this.x -= speed;
        this.animAngle += deltaTime * 0.01;
        this.sparkleTimer += deltaTime;
    }

    /**
     * Check if coin is off screen
     */
    isOffScreen() {
        return this.x + this.size < -10;
    }

    /**
     * Get collision box
     */
    getHitbox() {
        return {
            x: this.x,
            y: this.y,
            width: this.size,
            height: this.size
        };
    }

    /**
     * Check collision with player
     */
    checkCollision(playerHitbox) {
        const hb = this.getHitbox();

        return playerHitbox.x < hb.x + hb.width &&
               playerHitbox.x + playerHitbox.width > hb.x &&
               playerHitbox.y < hb.y + hb.height &&
               playerHitbox.y + playerHitbox.height > hb.y;
    }

    /**
     * Collect this coin
     */
    collect() {
        if (!this.collected) {
            this.collected = true;
            soundManager.play('coin');
            return true;
        }
        return false;
    }
}

/**
 * Particle class for visual effects
 */
class Particle {
    constructor(x, y, color, type = 'default') {
        this.x = x;
        this.y = y;
        this.color = color;
        this.type = type;
        this.life = 1.0;
        this.size = Math.random() * 5 + 3;

        // Random velocity
        if (type === 'coin') {
            this.vx = (Math.random() - 0.5) * 6;
            this.vy = (Math.random() - 0.5) * 6 - 2;
        } else if (type === 'dust') {
            this.vx = (Math.random() - 0.5) * 3 - 2;
            this.vy = -Math.random() * 2 - 1;
        } else {
            this.vx = (Math.random() - 0.5) * 4;
            this.vy = (Math.random() - 0.5) * 4;
        }

        this.decay = 0.02 + Math.random() * 0.02;
    }

    /**
     * Update particle
     */
    update(deltaTime) {
        const dt = deltaTime / 16.67; // Normalize to 60fps
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= this.decay * dt;

        if (this.type === 'dust') {
            this.vy += 0.1 * dt; // Gravity for dust
        }
    }

    /**
     * Check if particle is dead
     */
    isDead() {
        return this.life <= 0;
    }
}

/**
 * SpeedLine class for background effect
 */
class SpeedLine {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = CONFIG.canvas.width + Math.random() * 100;
        this.y = Math.random() * CONFIG.canvas.height * 0.8;
        this.length = Math.random() * 80 + 40;
        this.opacity = Math.random() * 0.3 + 0.1;
    }

    update(speed) {
        this.x -= speed * 2;
        if (this.x + this.length < 0) {
            this.reset();
        }
    }
}

/**
 * CoinPatternGenerator - generates coin formations
 */
const CoinPatternGenerator = {
    /**
     * Generate coins based on pattern
     * @param {string} patternId - Pattern ID
     * @param {number} startX - Starting X position
     * @param {number} baseY - Base Y position (ground level)
     */
    generate(patternId, startX, baseY) {
        const pattern = CONFIG.coins.patterns.find(p => p.id === patternId);
        if (!pattern) return [];

        const coins = [];
        const coinSize = CONFIG.coins.size;
        const spacing = coinSize + 10;

        switch (pattern.formation) {
            case 'horizontal':
                for (let i = 0; i < pattern.count; i++) {
                    coins.push(new Coin(
                        startX + i * spacing,
                        baseY - 60
                    ));
                }
                break;

            case 'arc':
                // Arc shape following jump trajectory
                for (let i = 0; i < pattern.count; i++) {
                    const t = i / (pattern.count - 1);
                    const arcY = -Math.sin(t * Math.PI) * 100;
                    coins.push(new Coin(
                        startX + i * spacing,
                        baseY - 60 + arcY
                    ));
                }
                break;

            case 'diagonal_up':
                for (let i = 0; i < pattern.count; i++) {
                    coins.push(new Coin(
                        startX + i * spacing,
                        baseY - 60 - i * 30
                    ));
                }
                break;

            case 'low_horizontal':
                // Low coins that encourage sliding
                for (let i = 0; i < pattern.count; i++) {
                    coins.push(new Coin(
                        startX + i * spacing,
                        baseY - 40
                    ));
                }
                break;

            default:
                // Default to horizontal
                for (let i = 0; i < pattern.count; i++) {
                    coins.push(new Coin(
                        startX + i * spacing,
                        baseY - 60
                    ));
                }
        }

        return coins;
    },

    /**
     * Get random pattern ID
     */
    getRandomPattern() {
        const patterns = CONFIG.coins.patterns;
        return patterns[Math.floor(Math.random() * patterns.length)].id;
    }
};
