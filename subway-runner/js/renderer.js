/**
 * Subway Runner - Renderer
 * Handles all drawing operations
 */

class Renderer {
    constructor(ctx) {
        this.ctx = ctx;
        this.bgOffset = 0;
        this.groundOffset = 0;
        this.shakeOffset = { x: 0, y: 0 };
        this.shakeTimer = 0;
        this.speedLines = [];

        // Image assets
        this.images = {};
        this.imagesLoaded = false;
        this.loadingProgress = 0;

        // Load images
        this.loadImages();

        // Initialize speed lines
        for (let i = 0; i < 10; i++) {
            this.speedLines.push(new SpeedLine());
        }
    }

    /**
     * Load all image assets
     */
    loadImages() {
        const imageAssets = [
            'bg_city',
            'ground_tile',
            'player_run',
            'player_jump',
            'player_slide',
            'obstacle_barrier',
            'obstacle_crate',
            'obstacle_sign',
            'obstacle_train',
            'obstacle_pipe',
            'coin',
            'title_logo'
        ];

        let loaded = 0;
        const total = imageAssets.length;

        imageAssets.forEach(id => {
            const img = new Image();
            img.onload = () => {
                loaded++;
                this.loadingProgress = loaded / total;
                if (loaded === total) {
                    this.imagesLoaded = true;
                    console.log('All images loaded successfully');
                }
            };
            img.onerror = () => {
                console.warn(`Failed to load image: ${id}.png, using placeholder`);
                loaded++;
                this.loadingProgress = loaded / total;
                if (loaded === total) {
                    this.imagesLoaded = true;
                }
            };
            img.src = `assets/${id}.png`;
            this.images[id] = img;
        });
    }

    /**
     * Clear the canvas
     */
    clear() {
        const ctx = this.ctx;
        ctx.save();

        // Apply screen shake
        if (this.shakeTimer > 0) {
            ctx.translate(this.shakeOffset.x, this.shakeOffset.y);
        }

        ctx.fillStyle = CONFIG.canvas.backgroundColor;
        ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
    }

    /**
     * Restore context after drawing
     */
    restore() {
        this.ctx.restore();
    }

    /**
     * Update and apply screen shake
     * @param {number} deltaTime
     */
    updateShake(deltaTime) {
        if (this.shakeTimer > 0) {
            this.shakeTimer -= deltaTime;
            const intensity = CONFIG.effects.collisionShake.intensity * (this.shakeTimer / CONFIG.effects.collisionShake.duration);
            this.shakeOffset.x = (Math.random() - 0.5) * intensity * 2;
            this.shakeOffset.y = (Math.random() - 0.5) * intensity * 2;
        } else {
            this.shakeOffset.x = 0;
            this.shakeOffset.y = 0;
        }
    }

    /**
     * Start screen shake effect
     */
    startShake() {
        this.shakeTimer = CONFIG.effects.collisionShake.duration;
    }

    /**
     * Draw scrolling background
     * @param {number} speed - Current game speed
     */
    drawBackground(speed) {
        const ctx = this.ctx;
        const width = CONFIG.canvas.width;
        const height = CONFIG.canvas.height;

        // Update background scroll
        this.bgOffset = (this.bgOffset + speed * 0.3) % width;

        // Try to use image asset
        const bgImg = this.images.bg_city;
        if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
            // Draw scrolling background image
            const imgWidth = width * 2; // Use 2x canvas width for seamless scroll
            const x1 = -this.bgOffset;
            const x2 = x1 + imgWidth;

            ctx.drawImage(bgImg, x1, 0, imgWidth, CONFIG.ground.y);
            if (x2 < width) {
                ctx.drawImage(bgImg, x2, 0, imgWidth, CONFIG.ground.y);
            }
        } else {
            // Fallback: Sky gradient
            const gradient = ctx.createLinearGradient(0, 0, 0, CONFIG.ground.y);
            gradient.addColorStop(0, '#87CEEB');
            gradient.addColorStop(1, '#B0E0E6');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, CONFIG.ground.y);

            // Draw buildings (parallax background)
            this.drawBuildings(speed);

            // Draw clouds
            this.drawClouds(speed);
        }
    }

    /**
     * Draw parallax buildings
     */
    drawBuildings(speed) {
        const ctx = this.ctx;
        const groundY = CONFIG.ground.y;

        // Far buildings (slower parallax)
        ctx.fillStyle = '#7BA3C7';
        const farOffset = (this.bgOffset * 0.5) % 200;
        for (let i = -1; i < 6; i++) {
            const x = i * 200 - farOffset;
            const buildingHeight = 80 + Math.sin(i * 1.5) * 40;
            ctx.fillRect(x, groundY - buildingHeight, 80, buildingHeight);
            ctx.fillRect(x + 100, groundY - buildingHeight - 20, 60, buildingHeight + 20);
        }

        // Near buildings (faster parallax)
        ctx.fillStyle = '#5B8DB8';
        const nearOffset = (this.bgOffset * 0.7) % 180;
        for (let i = -1; i < 7; i++) {
            const x = i * 180 - nearOffset;
            const buildingHeight = 100 + Math.sin(i * 2.3) * 50;
            ctx.fillRect(x, groundY - buildingHeight, 70, buildingHeight);

            // Windows
            ctx.fillStyle = '#FFFFCC';
            for (let wy = groundY - buildingHeight + 15; wy < groundY - 20; wy += 25) {
                for (let wx = x + 10; wx < x + 60; wx += 20) {
                    if (Math.random() > 0.3) {
                        ctx.fillRect(wx, wy, 10, 15);
                    }
                }
            }
            ctx.fillStyle = '#5B8DB8';
        }
    }

    /**
     * Draw clouds
     */
    drawClouds(speed) {
        const ctx = this.ctx;
        const cloudOffset = (this.bgOffset * 0.2) % 400;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';

        // Draw simple cloud shapes
        const clouds = [
            { x: 100, y: 60, size: 40 },
            { x: 350, y: 90, size: 50 },
            { x: 600, y: 50, size: 35 },
            { x: 850, y: 80, size: 45 }
        ];

        clouds.forEach(cloud => {
            const x = ((cloud.x - cloudOffset) % (CONFIG.canvas.width + 200)) - 100;
            this.drawCloud(x, cloud.y, cloud.size);
        });
    }

    /**
     * Draw a single cloud
     */
    drawCloud(x, y, size) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.arc(x, y, size * 0.6, 0, Math.PI * 2);
        ctx.arc(x + size * 0.5, y - size * 0.2, size * 0.5, 0, Math.PI * 2);
        ctx.arc(x + size, y, size * 0.6, 0, Math.PI * 2);
        ctx.arc(x + size * 0.5, y + size * 0.3, size * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Draw ground
     * @param {number} speed
     */
    drawGround(speed) {
        const ctx = this.ctx;
        const groundY = CONFIG.ground.y;
        const groundHeight = CONFIG.ground.height;

        // Update ground scroll
        this.groundOffset = (this.groundOffset + speed) % 60;

        // Try to use image asset
        const groundImg = this.images.ground_tile;
        if (groundImg && groundImg.complete && groundImg.naturalWidth > 0) {
            // Draw scrolling ground image
            const tileWidth = CONFIG.canvas.width;
            const x1 = -(this.groundOffset * 16) % tileWidth;
            ctx.drawImage(groundImg, x1, groundY, tileWidth, groundHeight);
            ctx.drawImage(groundImg, x1 + tileWidth, groundY, tileWidth, groundHeight);
        } else {
            // Fallback: Main ground
            ctx.fillStyle = '#5C5C5C';
            ctx.fillRect(0, groundY, CONFIG.canvas.width, groundHeight);

            // Yellow safety line
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(0, groundY, CONFIG.canvas.width, 5);

            // Ground texture (tiles)
            ctx.strokeStyle = '#4A4A4A';
            ctx.lineWidth = 2;
            for (let x = -this.groundOffset; x < CONFIG.canvas.width; x += 60) {
                ctx.beginPath();
                ctx.moveTo(x, groundY + 5);
                ctx.lineTo(x, groundY + groundHeight);
                ctx.stroke();
            }
        }
    }

    /**
     * Draw player
     * @param {Player} player
     */
    drawPlayer(player) {
        const ctx = this.ctx;

        // Select image based on player state
        let imgId = 'player_run';
        if (player.state === 'jumping') {
            imgId = 'player_jump';
        } else if (player.state === 'sliding') {
            imgId = 'player_slide';
        }

        const img = this.images[imgId];
        if (img && img.complete && img.naturalWidth > 0) {
            // Draw player image
            ctx.drawImage(img, player.x, player.y, player.width, player.height);
        } else {
            // Fallback: placeholder drawing
            ctx.fillStyle = '#4169E1';

            if (player.state === 'sliding') {
                // Sliding pose - low and wide
                ctx.fillRect(player.x, player.y, player.width, player.height);

                // Head
                ctx.beginPath();
                ctx.arc(player.x + player.width - 20, player.y + 15, 15, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Standing/Running/Jumping pose
                // Body
                ctx.fillRect(player.x + 15, player.y + 30, 30, 50);

                // Head
                ctx.beginPath();
                ctx.arc(player.x + 30, player.y + 20, 18, 0, Math.PI * 2);
                ctx.fill();

                // Cap
                ctx.fillStyle = '#DC143C';
                ctx.beginPath();
                ctx.arc(player.x + 30, player.y + 15, 12, Math.PI, Math.PI * 2);
                ctx.fill();
                ctx.fillRect(player.x + 30, player.y + 10, 15, 6);

                // Legs (animated when running)
                ctx.fillStyle = '#2F4F4F';
                if (player.state === 'running') {
                    const legOffset = Math.sin(player.animFrame * Math.PI / 2) * 10;
                    ctx.fillRect(player.x + 18, player.y + 75, 10, 25 + legOffset);
                    ctx.fillRect(player.x + 32, player.y + 75, 10, 25 - legOffset);
                } else {
                    // Jumping - legs tucked
                    ctx.fillRect(player.x + 15, player.y + 75, 12, 20);
                    ctx.fillRect(player.x + 33, player.y + 75, 12, 20);
                }
            }
        }
    }

    /**
     * Draw an obstacle
     * @param {Obstacle} obstacle
     */
    drawObstacle(obstacle) {
        const ctx = this.ctx;
        const type = obstacle.type;

        // Map type id to asset id
        const assetMap = {
            'low_barrier': 'obstacle_barrier',
            'crate': 'obstacle_crate',
            'high_sign': 'obstacle_sign',
            'overhead_pipe': 'obstacle_pipe',
            'train': 'obstacle_train'
        };

        const imgId = assetMap[type.id];
        const img = imgId ? this.images[imgId] : null;

        if (img && img.complete && img.naturalWidth > 0) {
            // Draw obstacle image
            ctx.drawImage(img, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        } else {
            // Fallback: placeholder drawing
            ctx.fillStyle = type.color;

            switch (type.id) {
                case 'low_barrier':
                    // Red/white striped barrier
                    ctx.fillStyle = '#DC143C';
                    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                    ctx.fillStyle = '#FFFFFF';
                    for (let i = 0; i < obstacle.width; i += 20) {
                        ctx.fillRect(obstacle.x + i, obstacle.y, 10, obstacle.height);
                    }
                    break;

                case 'crate':
                    // Wooden crate
                    ctx.fillStyle = '#8B4513';
                    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                    ctx.strokeStyle = '#654321';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(obstacle.x + 5, obstacle.y + 5, obstacle.width - 10, obstacle.height - 10);
                    ctx.beginPath();
                    ctx.moveTo(obstacle.x + 5, obstacle.y + 5);
                    ctx.lineTo(obstacle.x + obstacle.width - 5, obstacle.y + obstacle.height - 5);
                    ctx.moveTo(obstacle.x + obstacle.width - 5, obstacle.y + 5);
                    ctx.lineTo(obstacle.x + 5, obstacle.y + obstacle.height - 5);
                    ctx.stroke();
                    break;

                case 'high_sign':
                    // Tall sign post
                    ctx.fillStyle = '#8B4513';
                    ctx.fillRect(obstacle.x + obstacle.width / 2 - 5, obstacle.y + 30, 10, obstacle.height - 30);
                    ctx.fillStyle = '#FFD700';
                    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, 35);
                    ctx.fillStyle = '#333333';
                    ctx.font = 'bold 12px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('!', obstacle.x + obstacle.width / 2, obstacle.y + 25);
                    break;

                case 'overhead_pipe':
                    // Green pipe
                    ctx.fillStyle = '#228B22';
                    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                    ctx.fillStyle = '#1E7B1E';
                    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, 10);
                    ctx.fillRect(obstacle.x, obstacle.y + obstacle.height - 10, obstacle.width, 10);
                    break;

                case 'train':
                    // Subway train
                    ctx.fillStyle = '#1E90FF';
                    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                    // Train front
                    ctx.fillStyle = '#4169E1';
                    ctx.fillRect(obstacle.x, obstacle.y, 30, obstacle.height);
                    // Windows
                    ctx.fillStyle = '#87CEEB';
                    ctx.fillRect(obstacle.x + 40, obstacle.y + 20, 40, 30);
                    ctx.fillRect(obstacle.x + 90, obstacle.y + 20, 40, 30);
                    ctx.fillRect(obstacle.x + 140, obstacle.y + 20, 40, 30);
                    // Headlight
                    ctx.fillStyle = '#FFFF00';
                    ctx.beginPath();
                    ctx.arc(obstacle.x + 15, obstacle.y + 40, 10, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                default:
                    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            }
        }
    }

    /**
     * Draw a coin
     * @param {Coin} coin
     */
    drawCoin(coin) {
        if (coin.collected) return;

        const ctx = this.ctx;
        const x = coin.x + coin.size / 2;
        const y = coin.y + coin.size / 2;
        const radius = coin.size / 2;

        // Wobble animation
        const wobble = Math.sin(coin.animAngle) * 0.2 + 0.8;

        const img = this.images.coin;
        if (img && img.complete && img.naturalWidth > 0) {
            // Draw coin image with wobble effect
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(wobble, 1);
            ctx.drawImage(img, -radius, -radius, coin.size, coin.size);
            ctx.restore();
        } else {
            // Fallback: placeholder drawing
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(wobble, 1);

            // Coin body
            ctx.fillStyle = CONFIG.coins.color;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fill();

            // Inner circle
            ctx.fillStyle = '#FFC000';
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
            ctx.fill();

            // $ symbol
            ctx.fillStyle = '#B8860B';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('$', 0, 0);

            // Sparkle
            if (coin.sparkleTimer % 500 < 100) {
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(-radius * 0.4, -radius * 0.4, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    /**
     * Draw a particle
     * @param {Particle} particle
     */
    drawParticle(particle) {
        const ctx = this.ctx;
        ctx.globalAlpha = particle.life;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    /**
     * Draw speed lines when going fast
     * @param {number} speed
     */
    drawSpeedLines(speed) {
        if (speed < CONFIG.effects.speedLines.triggerSpeed) return;

        const ctx = this.ctx;
        const opacity = (speed - CONFIG.effects.speedLines.triggerSpeed) / (CONFIG.speed.max - CONFIG.effects.speedLines.triggerSpeed);

        this.speedLines.forEach(line => {
            line.update(speed);
            ctx.strokeStyle = `rgba(255, 255, 255, ${line.opacity * opacity})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(line.x, line.y);
            ctx.lineTo(line.x + line.length, line.y);
            ctx.stroke();
        });
    }

    /**
     * Draw HUD during gameplay
     */
    drawHUD(score, highScore, distance, speed) {
        const ctx = this.ctx;

        // Score background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(15, 15, 140, 70);

        // Coin icon
        ctx.fillStyle = CONFIG.coins.color;
        ctx.beginPath();
        ctx.arc(36, 36, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#B8860B';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('$', 36, 40);

        // Score text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 28px ' + CONFIG.fonts.score;
        ctx.textAlign = 'left';
        ctx.fillText(score.toString(), 55, 44);

        // Speed bar
        ctx.fillStyle = '#333333';
        ctx.fillRect(20, 60, 120, 18);
        const speedPercent = (speed - CONFIG.speed.initial) / (CONFIG.speed.max - CONFIG.speed.initial);
        const speedGradient = ctx.createLinearGradient(22, 0, 138, 0);
        speedGradient.addColorStop(0, '#4CAF50');
        speedGradient.addColorStop(0.5, '#FFEB3B');
        speedGradient.addColorStop(1, '#F44336');
        ctx.fillStyle = speedGradient;
        ctx.fillRect(22, 62, 116 * speedPercent, 14);

        // Distance (centered)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(400, 15, 160, 35);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '24px ' + CONFIG.fonts.primary;
        ctx.textAlign = 'center';
        ctx.fillText(Math.floor(distance) + ' m', 480, 40);

        // High score
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(780, 15, 160, 30);
        ctx.fillStyle = CONFIG.colors.accent;
        ctx.font = 'bold 20px ' + CONFIG.fonts.primary;
        ctx.textAlign = 'left';
        ctx.fillText('BEST: ' + highScore, 790, 38);
    }

    /**
     * Draw menu screen
     */
    drawMenuScreen(highScore) {
        const ctx = this.ctx;
        const width = CONFIG.canvas.width;
        const height = CONFIG.canvas.height;

        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, width, height);

        // Menu panel
        const panelX = 230;
        const panelY = 70;
        const panelW = 500;
        const panelH = 400;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        this.drawRoundedRect(panelX, panelY, panelW, panelH, 20);

        // Title - try to use image
        const titleImg = this.images.title_logo;
        if (titleImg && titleImg.complete && titleImg.naturalWidth > 0) {
            ctx.drawImage(titleImg, width / 2 - 200, panelY + 30, 400, 100);
        } else {
            // Fallback: text title
            ctx.fillStyle = '#FF6B6B';
            ctx.font = 'bold 48px ' + CONFIG.fonts.title;
            ctx.textAlign = 'center';
            ctx.fillText('SUBWAY', width / 2, panelY + 70);
            ctx.fillStyle = '#4ECDC4';
            ctx.fillText('RUNNER', width / 2, panelY + 120);
        }

        // High score
        ctx.fillStyle = CONFIG.colors.accent;
        ctx.font = 'bold 24px ' + CONFIG.fonts.primary;
        ctx.textAlign = 'center';
        ctx.fillText('BEST: ' + highScore, width / 2, panelY + 170);

        // Play button
        const btnX = width / 2 - 90;
        const btnY = panelY + 200;
        const btnW = 180;
        const btnH = 60;

        ctx.fillStyle = CONFIG.colors.primary;
        this.drawRoundedRect(btnX, btnY, btnW, btnH, 10);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 28px ' + CONFIG.fonts.primary;
        ctx.fillText('PLAY', width / 2, btnY + 42);

        // Controls hint
        ctx.fillStyle = '#666666';
        ctx.font = '16px ' + CONFIG.fonts.primary;
        ctx.fillText('SPACE/UP: Jump | DOWN: Slide', width / 2, panelY + 320);
        ctx.fillText('Touch: Top half = Jump | Bottom half = Slide', width / 2, panelY + 345);

        // Return button bounds for click detection
        return { x: btnX, y: btnY, width: btnW, height: btnH };
    }

    /**
     * Draw tutorial screen
     */
    drawTutorialScreen() {
        const ctx = this.ctx;
        const width = CONFIG.canvas.width;
        const height = CONFIG.canvas.height;

        // Dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, width, height);

        // Jump instruction
        ctx.fillStyle = '#4CAF50';
        this.drawRoundedRect(250, 160, 140, 100, 15);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 40px ' + CONFIG.fonts.primary;
        ctx.textAlign = 'center';
        ctx.fillText('^', 320, 220);
        ctx.font = '20px ' + CONFIG.fonts.primary;
        ctx.fillText('SPACE / UP', 320, 300);
        ctx.fillText('to JUMP', 320, 325);

        // Slide instruction
        ctx.fillStyle = '#2196F3';
        this.drawRoundedRect(570, 160, 140, 100, 15);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 40px ' + CONFIG.fonts.primary;
        ctx.fillText('v', 640, 220);
        ctx.font = '20px ' + CONFIG.fonts.primary;
        ctx.fillText('DOWN', 640, 300);
        ctx.fillText('to SLIDE', 640, 325);

        // Continue prompt
        ctx.fillStyle = '#4CAF50';
        ctx.font = '24px ' + CONFIG.fonts.primary;
        ctx.fillText('Click anywhere to start', width / 2, 420);
    }

    /**
     * Draw pause screen
     */
    drawPauseScreen() {
        const ctx = this.ctx;
        const width = CONFIG.canvas.width;
        const height = CONFIG.canvas.height;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 48px ' + CONFIG.fonts.primary;
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', width / 2, height / 2 - 20);

        ctx.font = '20px ' + CONFIG.fonts.primary;
        ctx.fillStyle = '#CCCCCC';
        ctx.fillText('Press ESC to resume', width / 2, height / 2 + 30);
    }

    /**
     * Draw game over screen
     */
    drawGameOverScreen(score, highScore, isNewHighScore) {
        const ctx = this.ctx;
        const width = CONFIG.canvas.width;
        const height = CONFIG.canvas.height;

        // Dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, width, height);

        // Panel
        const panelX = 280;
        const panelY = 120;
        const panelW = 400;
        const panelH = 300;

        ctx.fillStyle = '#FFFFFF';
        this.drawRoundedRect(panelX, panelY, panelW, panelH, 20);

        // Title
        ctx.fillStyle = CONFIG.colors.danger;
        ctx.font = 'bold 36px ' + CONFIG.fonts.primary;
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', width / 2, panelY + 50);

        // Score label
        ctx.fillStyle = '#666666';
        ctx.font = '18px ' + CONFIG.fonts.primary;
        ctx.fillText('SCORE', width / 2, panelY + 100);

        // Score value
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 42px ' + CONFIG.fonts.score;
        ctx.fillText(score.toString(), width / 2, panelY + 150);

        // New high score indicator
        if (isNewHighScore) {
            ctx.fillStyle = CONFIG.colors.accent;
            ctx.font = 'bold 20px ' + CONFIG.fonts.primary;
            ctx.fillText('NEW RECORD!', width / 2, panelY + 180);
        }

        // Best score
        ctx.fillStyle = CONFIG.colors.accent;
        ctx.font = 'bold 20px ' + CONFIG.fonts.primary;
        ctx.fillText('BEST: ' + highScore, width / 2, panelY + 210);

        // Restart button
        const btnX = width / 2 - 80;
        const btnY = panelY + 235;
        const btnW = 160;
        const btnH = 50;

        ctx.fillStyle = CONFIG.colors.warning;
        this.drawRoundedRect(btnX, btnY, btnW, btnH, 10);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 22px ' + CONFIG.fonts.primary;
        ctx.fillText('RESTART', width / 2, btnY + 34);

        return { x: btnX, y: btnY, width: btnW, height: btnH };
    }

    /**
     * Helper: Draw rounded rectangle
     */
    drawRoundedRect(x, y, width, height, radius) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
    }
}
