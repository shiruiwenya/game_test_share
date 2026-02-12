/**
 * renderer.js - Canvas rendering: all screens, board, animations, particles, image preloading
 * Depends on: config.js
 */

var Renderer = (function() {

  var canvas, ctx;
  var images = {};
  var imagesLoaded = false;

  // Particle system
  var particles = [];
  // Confetti
  var confetti = [];

  // --- Image Preloading ---
  var IMAGE_ASSETS = [
    { id: 'bg_game', src: 'assets/bg_game.png' },
    { id: 'bg_menu', src: 'assets/bg_menu.png' },
    { id: 'logo_title', src: 'assets/logo_title.png' },
    { id: 'veggie_tomato', src: 'assets/veggie_tomato.png' },
    { id: 'veggie_carrot', src: 'assets/veggie_carrot.png' },
    { id: 'veggie_eggplant', src: 'assets/veggie_eggplant.png' },
    { id: 'veggie_broccoli', src: 'assets/veggie_broccoli.png' },
    { id: 'veggie_corn', src: 'assets/veggie_corn.png' },
    { id: 'veggie_chili', src: 'assets/veggie_chili.png' },
    { id: 'special_stripe_h', src: 'assets/special_stripe_h.png' },
    { id: 'special_stripe_v', src: 'assets/special_stripe_v.png' },
    { id: 'special_rainbow', src: 'assets/special_rainbow.png' }
  ];

  function preloadImages(callback) {
    var loaded = 0;
    var total = IMAGE_ASSETS.length;
    if (total === 0) { imagesLoaded = true; callback(); return; }

    IMAGE_ASSETS.forEach(function(asset) {
      var img = new Image();
      img.onload = function() {
        images[asset.id] = img;
        loaded++;
        if (loaded >= total) {
          imagesLoaded = true;
          if (callback) callback();
        }
      };
      img.onerror = function() {
        // Image not available, fallback to placeholder
        images[asset.id] = null;
        loaded++;
        if (loaded >= total) {
          imagesLoaded = true;
          if (callback) callback();
        }
      };
      img.src = asset.src;
    });
  }

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
  }

  function clear() {
    ctx.fillStyle = CONFIG.BG_COLOR;
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
  }

  // --- Drawing Helpers ---

  function drawRoundRect(x, y, w, h, radius, fillColor, strokeColor, lineWidth) {
    radius = radius || 8;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth || 2;
      ctx.stroke();
    }
  }

  function drawStar(cx, cy, r, points, fillColor) {
    points = points || 5;
    ctx.beginPath();
    for (var i = 0; i < points * 2; i++) {
      var radius = i % 2 === 0 ? r : r * 0.45;
      var angle = (Math.PI / points) * i - Math.PI / 2;
      if (i === 0) ctx.moveTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
      else ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
    }
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
  }

  function drawButton(x, y, w, h, text, bgColor, textColor, fontSize, hovered) {
    var r = Math.min(h / 2, 12);
    var darken = hovered ? -20 : 0;
    var color = bgColor;
    if (hovered) {
      // Slightly brighter on hover
      color = adjustBrightness(bgColor, 20);
    }
    // Shadow
    drawRoundRect(x + 2, y + 3, w, h, r, 'rgba(0,0,0,0.2)');
    drawRoundRect(x, y, w, h, r, color, adjustBrightness(bgColor, -30), 2);
    ctx.fillStyle = textColor || '#FFFFFF';
    ctx.font = 'bold ' + (fontSize || 20) + 'px ' + CONFIG.FONTS.primary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2);
  }

  function adjustBrightness(hex, amount) {
    if (hex.startsWith('rgba')) return hex;
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    r = Math.max(0, Math.min(255, r + amount));
    g = Math.max(0, Math.min(255, g + amount));
    b = Math.max(0, Math.min(255, b + amount));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // --- Veggie Drawing ---

  function drawVeggie(type, x, y, size, special, alpha, scale) {
    alpha = alpha !== undefined ? alpha : 1;
    scale = scale !== undefined ? scale : 1;

    ctx.save();
    ctx.globalAlpha = alpha;

    var drawX = x + (size * (1 - scale)) / 2;
    var drawY = y + (size * (1 - scale)) / 2;
    var drawSize = size * scale;

    if (type === 'rainbow') {
      // Draw rainbow gem
      if (images.special_rainbow) {
        ctx.drawImage(images.special_rainbow, drawX, drawY, drawSize, drawSize);
      } else {
        // Placeholder: colorful circle
        var grad = ctx.createRadialGradient(drawX + drawSize/2, drawY + drawSize/2, 2, drawX + drawSize/2, drawY + drawSize/2, drawSize/2);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.3, '#FF0000');
        grad.addColorStop(0.5, '#FFFF00');
        grad.addColorStop(0.7, '#00FF00');
        grad.addColorStop(0.85, '#0000FF');
        grad.addColorStop(1, '#FF00FF');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(drawX + drawSize/2, drawY + drawSize/2, drawSize/2 - 2, 0, Math.PI * 2);
        ctx.fill();
        // Star highlight
        drawStar(drawX + drawSize/2, drawY + drawSize/2, drawSize * 0.2, 4, 'rgba(255,255,255,0.8)');
      }
    } else {
      // Normal veggie
      var veggieConf = CONFIG.VEGGIES[type];
      if (!veggieConf) { ctx.restore(); return; }

      var assetId = veggieConf.asset_id;
      if (images[assetId]) {
        ctx.drawImage(images[assetId], drawX, drawY, drawSize, drawSize);
      } else {
        // Placeholder: colored circle with letter
        ctx.fillStyle = veggieConf.color;
        ctx.beginPath();
        ctx.arc(drawX + drawSize/2, drawY + drawSize/2, drawSize/2 - 3, 0, Math.PI * 2);
        ctx.fill();
        // White outline
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Emoji or first character
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold ' + Math.floor(drawSize * 0.45) + 'px ' + CONFIG.FONTS.primary;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(veggieConf.name[0], drawX + drawSize/2, drawY + drawSize/2);
      }

      // Draw special overlay
      if (special && special !== CONFIG.SPECIAL.NONE) {
        drawSpecialOverlay(special, drawX, drawY, drawSize);
      }
    }

    ctx.restore();
  }

  function drawSpecialOverlay(special, x, y, size) {
    ctx.save();
    ctx.globalAlpha = 0.7;
    if (special === CONFIG.SPECIAL.STRIPE_H) {
      if (images.special_stripe_h) {
        ctx.drawImage(images.special_stripe_h, x, y, size, size);
      } else {
        // Horizontal stripes
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        for (var i = 0; i < 3; i++) {
          var sy = y + size * 0.3 + i * size * 0.15;
          ctx.beginPath();
          ctx.moveTo(x + 4, sy);
          ctx.lineTo(x + size - 4, sy);
          ctx.stroke();
        }
        // Arrow
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(x + size - 8, y + size/2 - 4);
        ctx.lineTo(x + size - 2, y + size/2);
        ctx.lineTo(x + size - 8, y + size/2 + 4);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + 8, y + size/2 - 4);
        ctx.lineTo(x + 2, y + size/2);
        ctx.lineTo(x + 8, y + size/2 + 4);
        ctx.fill();
      }
    } else if (special === CONFIG.SPECIAL.STRIPE_V) {
      if (images.special_stripe_v) {
        ctx.drawImage(images.special_stripe_v, x, y, size, size);
      } else {
        // Vertical stripes
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        for (var j = 0; j < 3; j++) {
          var sx = x + size * 0.3 + j * size * 0.15;
          ctx.beginPath();
          ctx.moveTo(sx, y + 4);
          ctx.lineTo(sx, y + size - 4);
          ctx.stroke();
        }
        // Arrow
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(x + size/2 - 4, y + 8);
        ctx.lineTo(x + size/2, y + 2);
        ctx.lineTo(x + size/2 + 4, y + 8);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + size/2 - 4, y + size - 8);
        ctx.lineTo(x + size/2, y + size - 2);
        ctx.lineTo(x + size/2 + 4, y + size - 8);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // --- Board Rendering ---

  /**
   * Calculate cell size and board offset for a given grid size
   */
  function getBoardLayout(rows, cols) {
    var area = CONFIG.BOARD_AREA;
    var gap = CONFIG.CELL_GAP;
    var cellW = Math.floor((area.width - gap * (cols + 1)) / cols);
    var cellH = Math.floor((area.height - gap * (rows + 1)) / rows);
    var cellSize = Math.min(cellW, cellH, 56); // max 56px
    var boardW = cellSize * cols + gap * (cols + 1);
    var boardH = cellSize * rows + gap * (rows + 1);
    var offsetX = area.x + Math.floor((area.width - boardW) / 2);
    var offsetY = area.y + Math.floor((area.height - boardH) / 2);
    return { cellSize: cellSize, boardW: boardW, boardH: boardH, offsetX: offsetX, offsetY: offsetY, gap: gap };
  }

  function cellToPixel(row, col, layout) {
    var x = layout.offsetX + layout.gap + col * (layout.cellSize + layout.gap);
    var y = layout.offsetY + layout.gap + row * (layout.cellSize + layout.gap);
    return { x: x, y: y };
  }

  function pixelToCell(px, py, layout, rows, cols) {
    var relX = px - layout.offsetX - layout.gap;
    var relY = py - layout.offsetY - layout.gap;
    var col = Math.floor(relX / (layout.cellSize + layout.gap));
    var row = Math.floor(relY / (layout.cellSize + layout.gap));
    if (row < 0 || row >= rows || col < 0 || col >= cols) return null;
    // Check if click is within cell (not in gap)
    var cellPos = cellToPixel(row, col, layout);
    if (px >= cellPos.x && px <= cellPos.x + layout.cellSize &&
        py >= cellPos.y && py <= cellPos.y + layout.cellSize) {
      return { row: row, col: col };
    }
    return null;
  }

  function drawBoard(board, layout, gameState) {
    var rows = board.rows;
    var cols = board.cols;

    // Board background
    drawRoundRect(layout.offsetX - 4, layout.offsetY - 4,
                  layout.boardW + 8, layout.boardH + 8,
                  10, CONFIG.COLORS.board_bg, '#A0845E', 3);

    // Draw cells
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var pos = cellToPixel(r, c, layout);
        // Cell background (checkerboard pattern)
        var cellColor = (r + c) % 2 === 0 ? CONFIG.COLORS.cell_bg : adjustBrightness(CONFIG.COLORS.cell_bg, -12);
        drawRoundRect(pos.x, pos.y, layout.cellSize, layout.cellSize, 4, cellColor);

        var cell = board.grid[r][c];
        if (!cell) continue;

        // Check for animations - if this cell is being animated, skip static draw
        if (gameState.animatingCells && gameState.animatingCells[r + ',' + c]) continue;

        drawVeggie(cell.type, pos.x, pos.y, layout.cellSize, cell.special);
      }
    }
  }

  // --- Selection Highlight ---

  function drawSelection(row, col, layout, time) {
    var pos = cellToPixel(row, col, layout);
    var pulse = 0.5 + 0.5 * Math.sin(time / 150);
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.3 * pulse;
    ctx.strokeStyle = CONFIG.COLORS.cell_highlight;
    ctx.lineWidth = 3;
    drawRoundRect(pos.x - 2, pos.y - 2, layout.cellSize + 4, layout.cellSize + 4, 6, null, CONFIG.COLORS.cell_highlight, 3);
    ctx.restore();
  }

  // --- Hint Highlight ---

  function drawHint(r1, c1, r2, c2, layout, time) {
    var pulse = 0.5 + 0.5 * Math.sin(time / 250);
    ctx.save();
    ctx.globalAlpha = 0.3 + 0.3 * pulse;

    var pos1 = cellToPixel(r1, c1, layout);
    var pos2 = cellToPixel(r2, c2, layout);

    ctx.strokeStyle = '#00FF88';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    drawRoundRect(pos1.x - 1, pos1.y - 1, layout.cellSize + 2, layout.cellSize + 2, 5, null, '#00FF88', 2);
    drawRoundRect(pos2.x - 1, pos2.y - 1, layout.cellSize + 2, layout.cellSize + 2, 5, null, '#00FF88', 2);
    ctx.setLineDash([]);
    ctx.restore();
  }

  // --- Top Panel ---

  function drawTopPanel(level, score, movesLeft, starThresholds, time) {
    // Panel background
    drawRoundRect(10, 10, 520, 120, 10, CONFIG.COLORS.panel_bg, CONFIG.COLORS.panel_border, 3);

    // Level label
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px ' + CONFIG.FONTS.primary;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('关卡 ' + level, 30, 42);

    // Score icon (star)
    drawStar(188, 42, 14, 5, '#F1C40F');
    // Score text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px ' + CONFIG.FONTS.score;
    ctx.textAlign = 'left';
    ctx.fillText(score + ' / ' + starThresholds.star_1, 210, 42);

    // Moves icon (footprint placeholder)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px ' + CONFIG.FONTS.primary;
    ctx.textAlign = 'center';
    var movesColor = movesLeft <= CONFIG.LOW_MOVES_WARNING ? '#FF4444' : '#FFFFFF';
    // Footprint icon placeholder
    ctx.beginPath();
    ctx.arc(418, 38, 10, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px ' + CONFIG.FONTS.primary;
    ctx.fillText('步', 418, 40);

    // Moves count
    ctx.fillStyle = movesColor;
    ctx.font = 'bold 24px ' + CONFIG.FONTS.score;
    ctx.textAlign = 'left';
    ctx.fillText('' + movesLeft, 438, 42);
    // Flash effect for low moves
    if (movesLeft <= CONFIG.LOW_MOVES_WARNING) {
      var flash = Math.sin(time / 200);
      if (flash > 0) {
        ctx.fillStyle = 'rgba(255,68,68,' + (flash * 0.3) + ')';
        ctx.fillRect(430, 25, 60, 30);
      }
    }

    // Star progress bar
    var barX = 30, barY = 78, barW = 480, barH = 16;
    // Bar background
    drawRoundRect(barX, barY, barW, barH, 8, '#1A3A0A');
    // Progress fill
    var maxScore = starThresholds.star_3;
    var progress = Math.min(score / maxScore, 1);
    if (progress > 0) {
      var grad = ctx.createLinearGradient(barX, barY, barX + barW * progress, barY);
      grad.addColorStop(0, '#4CAF50');
      grad.addColorStop(1, '#8BC34A');
      drawRoundRect(barX, barY, barW * progress, barH, 8, grad);
    }
    // Star markers
    var star1Pos = barX + barW * (starThresholds.star_1 / maxScore);
    var star2Pos = barX + barW * (starThresholds.star_2 / maxScore);
    var star3Pos = barX + barW;

    var starY = barY + barH + 4;
    var starColors = [
      score >= starThresholds.star_1 ? '#F1C40F' : '#666666',
      score >= starThresholds.star_2 ? '#F1C40F' : '#666666',
      score >= starThresholds.star_3 ? '#F1C40F' : '#666666'
    ];
    drawStar(star1Pos, starY + 6, 10, 5, starColors[0]);
    drawStar(star2Pos, starY + 6, 10, 5, starColors[1]);
    drawStar(star3Pos, starY + 6, 10, 5, starColors[2]);
  }

  // --- Target Panel ---

  function drawTargetPanel(targets, veggieEliminated, layout) {
    var panelY = layout.offsetY + layout.boardH + 15;
    drawRoundRect(10, panelY, 520, 100, 10, CONFIG.COLORS.beige_panel, '#C8A060', 2);

    // Title
    ctx.fillStyle = '#8B6914';
    ctx.font = 'bold 16px ' + CONFIG.FONTS.primary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('-- 关卡目标 --', 270, panelY + 20);

    // Target items
    var itemWidth = Math.min(100, 480 / targets.length);
    var startX = 30 + (480 - itemWidth * targets.length) / 2;

    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      var x = startX + i * itemWidth;
      var y = panelY + 38;
      var eliminated = veggieEliminated[t.veggie] || 0;
      var done = eliminated >= t.count;

      // Veggie icon
      drawVeggie(t.veggie, x + (itemWidth - 30) / 2, y, 30, CONFIG.SPECIAL.NONE, done ? 0.5 : 1);

      // Count text
      ctx.font = 'bold 14px ' + CONFIG.FONTS.primary;
      ctx.textAlign = 'center';
      ctx.fillStyle = done ? '#27AE60' : '#4A2F1A';
      ctx.fillText(eliminated + '/' + t.count, x + itemWidth / 2, y + 48);

      // Check mark if done
      if (done) {
        ctx.fillStyle = '#27AE60';
        ctx.font = 'bold 18px ' + CONFIG.FONTS.primary;
        ctx.fillText('\u2714', x + itemWidth / 2 + 18, y + 15);
      }
    }

    return panelY + 100; // return bottom Y
  }

  // --- Pause Button ---

  function drawPauseButton(panelBottom) {
    var btnY = panelBottom + 10;
    drawButton(230, btnY, 80, 36, '暂停', CONFIG.COLORS.btn_brown, '#FFFFFF', 16);
    return { x: 230, y: btnY, w: 80, h: 36 };
  }

  // --- Combo Popup ---

  function drawComboPopup(cascadeLevel, time, startTime) {
    var elapsed = time - startTime;
    var duration = CONFIG.ANIM.COMBO_POPUP;
    if (elapsed > duration) return;

    var progress = elapsed / duration;
    // Scale: bounce in then fade out
    var scale, alpha;
    if (progress < 0.3) {
      scale = 0.5 + 1.5 * (progress / 0.3); // bounce up
      alpha = 1;
    } else if (progress < 0.5) {
      scale = 2.0 - 0.3 * ((progress - 0.3) / 0.2); // settle
      alpha = 1;
    } else {
      scale = 1.7;
      alpha = 1 - ((progress - 0.5) / 0.5);
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold ' + Math.floor(32 * scale) + 'px ' + CONFIG.FONTS.title;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Outline
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.strokeText('COMBO x' + cascadeLevel + '!', 270, 430);

    // Fill with gradient
    ctx.fillStyle = '#FF6B00';
    ctx.fillText('COMBO x' + cascadeLevel + '!', 270, 430);
    ctx.restore();
  }

  // --- Screen Renderers ---

  function drawMenuScreen(time) {
    // Background
    if (images.bg_menu) {
      ctx.drawImage(images.bg_menu, 0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    } else {
      // Placeholder gradient sky
      var grad = ctx.createLinearGradient(0, 0, 0, CONFIG.CANVAS_HEIGHT);
      grad.addColorStop(0, '#87CEEB');
      grad.addColorStop(0.5, '#98D8C8');
      grad.addColorStop(1, '#7EC850');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

      // Simple hills
      ctx.fillStyle = '#6AB04C';
      ctx.beginPath();
      ctx.moveTo(0, 700);
      ctx.quadraticCurveTo(135, 620, 270, 680);
      ctx.quadraticCurveTo(405, 740, 540, 670);
      ctx.lineTo(540, 960);
      ctx.lineTo(0, 960);
      ctx.fill();

      ctx.fillStyle = '#78C850';
      ctx.beginPath();
      ctx.moveTo(0, 750);
      ctx.quadraticCurveTo(180, 700, 360, 740);
      ctx.quadraticCurveTo(450, 760, 540, 730);
      ctx.lineTo(540, 960);
      ctx.lineTo(0, 960);
      ctx.fill();
    }

    // Logo
    if (images.logo_title) {
      ctx.drawImage(images.logo_title, 70, 180, 400, 120);
    } else {
      // Placeholder logo text
      ctx.save();
      ctx.font = 'bold 52px ' + CONFIG.FONTS.title;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillText('蔬菜消消乐', 272, 243);
      // Colorful text
      var titleColors = ['#E74C3C', '#E67E22', '#8E44AD', '#27AE60', '#F1C40F'];
      var chars = '蔬菜消消乐'.split('');
      var totalW = 0;
      var charWidths = [];
      for (var ci = 0; ci < chars.length; ci++) {
        var cw = ctx.measureText(chars[ci]).width;
        charWidths.push(cw);
        totalW += cw;
      }
      var startX2 = 270 - totalW / 2;
      for (var ci2 = 0; ci2 < chars.length; ci2++) {
        ctx.fillStyle = titleColors[ci2 % titleColors.length];
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.strokeText(chars[ci2], startX2 + charWidths[ci2]/2, 240);
        ctx.fillText(chars[ci2], startX2 + charWidths[ci2]/2, 240);
        startX2 += charWidths[ci2];
      }
      ctx.restore();
    }

    // Subtitle
    ctx.fillStyle = '#6B4226';
    ctx.font = '20px ' + CONFIG.FONTS.primary;
    ctx.textAlign = 'center';
    ctx.fillText('卡通蔬菜 快乐消除', 270, 330);

    // Start button (with gentle bounce)
    var bounce = Math.sin(time / 500) * 3;
    drawButton(160, 500 + bounce, 220, 60, '开始游戏', CONFIG.COLORS.btn_green, '#FFFFFF', 28);

    return { startBtn: { x: 160, y: 497, w: 220, h: 66 } };
  }

  function drawLevelSelectScreen(levelProgress) {
    clear();
    // Soft gradient background
    var grad = ctx.createLinearGradient(0, 0, 0, CONFIG.CANVAS_HEIGHT);
    grad.addColorStop(0, '#E8F5E9');
    grad.addColorStop(1, '#C8E6C9');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // Title
    ctx.fillStyle = CONFIG.COLORS.text;
    ctx.font = 'bold 36px ' + CONFIG.FONTS.title;
    ctx.textAlign = 'center';
    ctx.fillText('选择关卡', 270, 100);

    var buttons = [];
    var positions = [
      { x: 70, y: 250 }, { x: 230, y: 250 }, { x: 390, y: 250 },
      { x: 150, y: 400 }, { x: 310, y: 400 }
    ];

    for (var i = 0; i < 5; i++) {
      var lvl = i + 1;
      var stars = levelProgress[lvl] || 0;
      var unlocked = (lvl === 1) || (levelProgress[lvl - 1] > 0);
      var pos = positions[i];

      var color = unlocked ? CONFIG.COLORS.btn_blue : '#999999';

      // Circle button
      ctx.beginPath();
      ctx.arc(pos.x + 40, pos.y + 40, 40, 0, Math.PI * 2);
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pos.x + 40, pos.y + 38, 38, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = adjustBrightness(color, -30);
      ctx.lineWidth = 3;
      ctx.stroke();

      // Level number
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 28px ' + CONFIG.FONTS.title;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('' + lvl, pos.x + 40, pos.y + 32);

      // Stars below number
      for (var s = 0; s < 3; s++) {
        var starColor = s < stars ? '#F1C40F' : 'rgba(255,255,255,0.4)';
        drawStar(pos.x + 22 + s * 18, pos.y + 58, 7, 5, starColor);
      }

      // Lock icon if locked
      if (!unlocked) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.arc(pos.x + 40, pos.y + 38, 38, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '24px ' + CONFIG.FONTS.primary;
        ctx.fillText('\uD83D\uDD12', pos.x + 40, pos.y + 38);
      }

      buttons.push({ x: pos.x, y: pos.y, w: 80, h: 80, level: lvl, unlocked: unlocked });
    }

    // Back button
    drawButton(210, 600, 120, 50, '返回', CONFIG.COLORS.btn_brown, '#FFFFFF', 20);
    buttons.push({ x: 210, y: 600, w: 120, h: 50, action: 'back' });

    return { buttons: buttons };
  }

  function drawLevelIntroScreen(levelConfig) {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // Popup panel
    drawRoundRect(60, 250, 420, 400, 15, '#FFF8E8', '#C8A060', 3);

    // Level name
    ctx.fillStyle = CONFIG.COLORS.text;
    ctx.font = 'bold 30px ' + CONFIG.FONTS.title;
    ctx.textAlign = 'center';
    ctx.fillText('关卡 ' + levelConfig.level_number, 270, 285);

    // Description
    ctx.fillStyle = '#6B4226';
    ctx.font = '18px ' + CONFIG.FONTS.primary;
    ctx.fillText(levelConfig.description, 270, 325);

    // Targets
    ctx.fillStyle = '#8B6914';
    ctx.font = 'bold 16px ' + CONFIG.FONTS.primary;
    ctx.fillText('消除目标:', 270, 360);

    var targets = levelConfig.targets;
    var itemW = Math.min(90, 340 / targets.length);
    var startX = 100 + (340 - itemW * targets.length) / 2;

    for (var i = 0; i < targets.length; i++) {
      var x = startX + i * itemW;
      drawVeggie(targets[i].veggie, x + (itemW - 36) / 2, 380, 36);
      ctx.fillStyle = CONFIG.COLORS.text;
      ctx.font = 'bold 16px ' + CONFIG.FONTS.primary;
      ctx.textAlign = 'center';
      ctx.fillText('x' + targets[i].count, x + itemW / 2, 430);
    }

    // Grid size
    ctx.fillStyle = '#6B4226';
    ctx.font = '16px ' + CONFIG.FONTS.primary;
    ctx.textAlign = 'center';
    ctx.fillText('棋盘: ' + levelConfig.grid_cols + 'x' + levelConfig.grid_rows + '  蔬菜种类: ' + levelConfig.veggie_types.length, 270, 465);

    // Moves
    ctx.fillStyle = CONFIG.COLORS.btn_red;
    ctx.font = 'bold 22px ' + CONFIG.FONTS.score;
    ctx.fillText('步数: ' + levelConfig.max_moves, 270, 510);

    // Buttons
    drawButton(180, 545, 180, 55, '开始', CONFIG.COLORS.btn_green, '#FFFFFF', 24);
    drawButton(210, 615, 120, 40, '返回', CONFIG.COLORS.btn_brown, '#FFFFFF', 16);

    return {
      startBtn: { x: 180, y: 545, w: 180, h: 55 },
      backBtn: { x: 210, y: 615, w: 120, h: 40 }
    };
  }

  function drawPausedScreen() {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    drawRoundRect(100, 300, 340, 300, 15, '#FFF8E8', '#C8A060', 3);

    ctx.fillStyle = CONFIG.COLORS.text;
    ctx.font = 'bold 36px ' + CONFIG.FONTS.title;
    ctx.textAlign = 'center';
    ctx.fillText('暂停', 270, 340);

    drawButton(170, 390, 200, 50, '继续', CONFIG.COLORS.btn_green, '#FFFFFF', 22);
    drawButton(170, 460, 200, 50, '重玩', CONFIG.COLORS.btn_blue, '#FFFFFF', 22);
    drawButton(170, 530, 200, 50, '退出', CONFIG.COLORS.btn_red, '#FFFFFF', 22);

    return {
      resumeBtn: { x: 170, y: 390, w: 200, h: 50 },
      retryBtn: { x: 170, y: 460, w: 200, h: 50 },
      quitBtn: { x: 170, y: 530, w: 200, h: 50 }
    };
  }

  function drawLevelCompleteScreen(score, starThresholds, levelNum, isLastLevel, time) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    drawRoundRect(60, 220, 420, 450, 15, '#FFF8E8', '#C8A060', 3);

    // Title with celebration color
    ctx.fillStyle = CONFIG.COLORS.btn_green;
    ctx.font = 'bold 42px ' + CONFIG.FONTS.title;
    ctx.textAlign = 'center';
    ctx.fillText('过关!', 270, 265);

    // Stars
    var stars = 0;
    if (score >= starThresholds.star_3) stars = 3;
    else if (score >= starThresholds.star_2) stars = 2;
    else if (score >= starThresholds.star_1) stars = 1;

    for (var s = 0; s < 3; s++) {
      var starX = 195 + s * 50;
      var starY = 320;
      var earned = s < stars;

      if (earned) {
        // Animated star
        var delay = s * 150;
        var elapsed = Math.max(0, time - delay);
        var scale = Math.min(1, elapsed / 300);
        var size = 22 * scale;
        drawStar(starX, starY, size, 5, '#F1C40F');
      } else {
        drawStar(starX, starY, 22, 5, '#BDC3C7');
      }
    }

    // Score
    ctx.fillStyle = CONFIG.COLORS.text;
    ctx.font = 'bold 26px ' + CONFIG.FONTS.score;
    ctx.fillText('分数: ' + score, 270, 380);

    // Star breakdown
    ctx.font = '14px ' + CONFIG.FONTS.primary;
    ctx.fillStyle = '#888';
    ctx.fillText('1星: ' + starThresholds.star_1 + '  2星: ' + starThresholds.star_2 + '  3星: ' + starThresholds.star_3, 270, 410);

    // Buttons
    if (!isLastLevel) {
      drawButton(170, 450, 200, 55, '下一关', CONFIG.COLORS.btn_green, '#FFFFFF', 24);
    }
    drawButton(180, isLastLevel ? 450 : 520, 180, 40, '关卡选择', CONFIG.COLORS.btn_blue, '#FFFFFF', 18);

    var btns = {
      levelsBtn: { x: 180, y: isLastLevel ? 450 : 520, w: 180, h: 40 }
    };
    if (!isLastLevel) {
      btns.nextBtn = { x: 170, y: 450, w: 200, h: 55 };
    }
    return btns;
  }

  function drawLevelFailedScreen(score) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    drawRoundRect(80, 280, 380, 350, 15, '#FFF8E8', '#C8A060', 3);

    ctx.fillStyle = CONFIG.COLORS.btn_red;
    ctx.font = 'bold 32px ' + CONFIG.FONTS.title;
    ctx.textAlign = 'center';
    ctx.fillText('步数用完了', 270, 320);

    ctx.fillStyle = CONFIG.COLORS.text;
    ctx.font = 'bold 24px ' + CONFIG.FONTS.score;
    ctx.fillText('分数: ' + score, 270, 380);

    ctx.fillStyle = '#6B4226';
    ctx.font = '18px ' + CONFIG.FONTS.primary;
    ctx.fillText('再试一次，你可以的!', 270, 425);

    drawButton(170, 470, 200, 55, '重试', CONFIG.COLORS.btn_green, '#FFFFFF', 24);
    drawButton(180, 545, 180, 40, '关卡选择', CONFIG.COLORS.btn_blue, '#FFFFFF', 18);

    return {
      retryBtn: { x: 170, y: 470, w: 200, h: 55 },
      levelsBtn: { x: 180, y: 545, w: 180, h: 40 }
    };
  }

  // --- Particle System ---

  function addSparkle(x, y, color, count) {
    count = count || 5;
    for (var i = 0; i < count; i++) {
      particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4 - 2,
        life: 1,
        decay: 0.02 + Math.random() * 0.03,
        size: 2 + Math.random() * 4,
        color: color || '#FFD700'
      });
    }
  }

  function addConfetti(count) {
    count = count || 40;
    var colors = ['#E74C3C', '#E67E22', '#8E44AD', '#27AE60', '#F1C40F', '#3498DB'];
    for (var i = 0; i < count; i++) {
      confetti.push({
        x: Math.random() * CONFIG.CANVAS_WIDTH,
        y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 2,
        vy: 2 + Math.random() * 3,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.1,
        size: 6 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        decay: 0.003 + Math.random() * 0.002
      });
    }
  }

  function updateAndDrawParticles() {
    // Sparkle particles
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1; // gravity
      p.life -= p.decay;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      // Draw 4-point star
      drawStar(p.x, p.y, p.size, 4, p.color);
      ctx.restore();
    }

    // Confetti
    for (var j = confetti.length - 1; j >= 0; j--) {
      var c = confetti[j];
      c.x += c.vx;
      c.y += c.vy;
      c.rotation += c.rotSpeed;
      c.life -= c.decay;
      if (c.life <= 0 || c.y > CONFIG.CANVAS_HEIGHT + 20) {
        confetti.splice(j, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = c.life;
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rotation);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2);
      ctx.restore();
    }
  }

  // --- Animation Drawing Helpers ---

  /**
   * Draw a veggie at arbitrary pixel position (for swap/fall animations)
   */
  function drawVeggieAt(type, special, px, py, cellSize, alpha, scale) {
    drawVeggie(type, px, py, cellSize, special, alpha, scale);
  }

  /**
   * Draw line blast effect for stripe activation
   */
  function drawLineBlast(row, col, direction, progress, layout) {
    var pos = cellToPixel(row, col, layout);
    var cx = pos.x + layout.cellSize / 2;
    var cy = pos.y + layout.cellSize / 2;
    var alpha = 1 - progress;

    ctx.save();
    ctx.globalAlpha = alpha;

    if (direction === 'h') {
      // Horizontal blast
      var halfW = layout.boardW * progress;
      var grad = ctx.createLinearGradient(cx - halfW, cy, cx + halfW, cy);
      grad.addColorStop(0, 'rgba(255,215,0,0)');
      grad.addColorStop(0.3, 'rgba(255,215,0,0.5)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.8)');
      grad.addColorStop(0.7, 'rgba(255,215,0,0.5)');
      grad.addColorStop(1, 'rgba(255,215,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(cx - halfW, cy - 8, halfW * 2, 16);
    } else {
      // Vertical blast
      var halfH = layout.boardH * progress;
      var grad2 = ctx.createLinearGradient(cx, cy - halfH, cx, cy + halfH);
      grad2.addColorStop(0, 'rgba(255,215,0,0)');
      grad2.addColorStop(0.3, 'rgba(255,215,0,0.5)');
      grad2.addColorStop(0.5, 'rgba(255,255,255,0.8)');
      grad2.addColorStop(0.7, 'rgba(255,215,0,0.5)');
      grad2.addColorStop(1, 'rgba(255,215,0,0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(cx - 8, cy - halfH, 16, halfH * 2);
    }
    ctx.restore();
  }

  /**
   * Draw rainbow wave effect
   */
  function drawRainbowWave(cx, cy, progress) {
    var maxRadius = 300 * progress;
    var alpha = 1 - progress;
    ctx.save();
    ctx.globalAlpha = alpha * 0.5;
    var colors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#8B00FF'];
    for (var i = 0; i < colors.length; i++) {
      var radius = maxRadius - i * 8;
      if (radius <= 0) continue;
      ctx.strokeStyle = colors[i];
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- Public API ---

  return {
    init: init,
    clear: clear,
    preloadImages: preloadImages,
    getBoardLayout: getBoardLayout,
    cellToPixel: cellToPixel,
    pixelToCell: pixelToCell,
    drawBoard: drawBoard,
    drawSelection: drawSelection,
    drawHint: drawHint,
    drawTopPanel: drawTopPanel,
    drawTargetPanel: drawTargetPanel,
    drawPauseButton: drawPauseButton,
    drawComboPopup: drawComboPopup,
    drawMenuScreen: drawMenuScreen,
    drawLevelSelectScreen: drawLevelSelectScreen,
    drawLevelIntroScreen: drawLevelIntroScreen,
    drawPausedScreen: drawPausedScreen,
    drawLevelCompleteScreen: drawLevelCompleteScreen,
    drawLevelFailedScreen: drawLevelFailedScreen,
    drawVeggieAt: drawVeggieAt,
    drawLineBlast: drawLineBlast,
    drawRainbowWave: drawRainbowWave,
    addSparkle: addSparkle,
    addConfetti: addConfetti,
    updateAndDrawParticles: updateAndDrawParticles,
    drawRoundRect: drawRoundRect,
    drawStar: drawStar,
    adjustBrightness: adjustBrightness,
    get ctx() { return ctx; },
    get images() { return images; }
  };
})();
