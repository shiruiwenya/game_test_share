/**
 * game.js - Main game controller: state machine, input handling, game loop, animations
 * Depends on: config.js, sound.js, board.js, renderer.js
 */

(function() {
  'use strict';

  // === Game State ===
  var gameState = 'menu'; // menu | level_select | level_intro | playing | paused | level_complete | level_failed
  var currentLevelNum = 1;
  var currentLevelConfig = null;
  var board = null;
  var boardLayout = null;

  // Playing state
  var score = 0;
  var movesLeft = 0;
  var selectedCell = null; // {row, col} or null
  var veggieEliminated = {}; // {veggie_type: count}
  var cascadeLevel = 0;
  var isAnimating = false;
  var hintTimer = 0;
  var hintMove = null;   // {r1,c1,r2,c2}
  var showingHint = false;
  var lowMovesWarned = false;
  var lastStarLevel = 0;

  // Progress
  var levelProgress = {}; // {levelNum: stars}

  // Time tracking
  var lastTime = 0;
  var gameTime = 0;
  var lastInputTime = 0;

  // Animation queues
  var animations = [];
  var animatingCells = {}; // 'row,col' -> true, skip static draw
  var comboPopup = null;   // {cascadeLevel, startTime}
  var specialEffects = []; // {type, row, col, startTime, direction, cx, cy}
  var screenTransitionTime = 0;

  // UI button regions (updated each frame)
  var uiButtons = {};

  // Canvas
  var canvas, canvasRect;

  // === Initialization ===

  function initGame() {
    canvas = document.getElementById('gameCanvas');
    canvas.width = CONFIG.CANVAS_WIDTH;
    canvas.height = CONFIG.CANVAS_HEIGHT;

    Renderer.init(canvas);

    // Initialize sound manager
    SoundManager.init();

    // Load saved progress from localStorage
    loadProgress();

    // Preload images then start
    Renderer.preloadImages(function() {
      // Event listeners
      canvas.addEventListener('click', handleClick);
      canvas.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('keydown', handleKeyDown);

      // Resize handler for correct click coordinates
      window.addEventListener('resize', updateCanvasRect);
      updateCanvasRect();

      // Start game loop
      requestAnimationFrame(gameLoop);
    });
  }

  function updateCanvasRect() {
    canvasRect = canvas.getBoundingClientRect();
  }

  function getClickPos(e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = CONFIG.CANVAS_WIDTH / rect.width;
    var scaleY = CONFIG.CANVAS_HEIGHT / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  function isInRect(x, y, rect) {
    return rect && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  // === Save/Load Progress ===

  function saveProgress() {
    try {
      localStorage.setItem('veggie_match_progress', JSON.stringify(levelProgress));
    } catch (e) {}
  }

  function loadProgress() {
    try {
      var saved = localStorage.getItem('veggie_match_progress');
      if (saved) levelProgress = JSON.parse(saved);
    } catch (e) {}
  }

  // === State Transitions ===

  function goToMenu() {
    gameState = 'menu';
    screenTransitionTime = gameTime;
  }

  function goToLevelSelect() {
    gameState = 'level_select';
    screenTransitionTime = gameTime;
  }

  function goToLevelIntro(levelNum) {
    currentLevelNum = levelNum;
    currentLevelConfig = CONFIG.LEVELS[levelNum - 1];
    gameState = 'level_intro';
    screenTransitionTime = gameTime;
  }

  function startPlaying() {
    gameState = 'playing';
    score = 0;
    movesLeft = currentLevelConfig.max_moves;
    selectedCell = null;
    cascadeLevel = 0;
    isAnimating = false;
    hintTimer = 0;
    hintMove = null;
    showingHint = false;
    lowMovesWarned = false;
    lastStarLevel = 0; // Reset star tracking for new level
    animations = [];
    animatingCells = {};
    comboPopup = null;
    specialEffects = [];

    // Reset elimination tracking
    veggieEliminated = {};
    for (var i = 0; i < currentLevelConfig.targets.length; i++) {
      veggieEliminated[currentLevelConfig.targets[i].veggie] = 0;
    }

    // Create board
    board = new Board(currentLevelConfig);
    boardLayout = Renderer.getBoardLayout(board.rows, board.cols);

    lastInputTime = gameTime;
    screenTransitionTime = gameTime;
  }

  function pauseGame() {
    if (gameState === 'playing' && !isAnimating) {
      gameState = 'paused';
      SoundManager.play('click');
    }
  }

  function resumeGame() {
    gameState = 'playing';
    lastInputTime = gameTime;
    hintTimer = 0;
    showingHint = false;
  }

  function retryLevel() {
    startPlaying();
    SoundManager.play('click');
  }

  function checkWinLose() {
    // Check if all targets met AND score >= target_score
    var allTargetsMet = true;
    for (var i = 0; i < currentLevelConfig.targets.length; i++) {
      var t = currentLevelConfig.targets[i];
      if ((veggieEliminated[t.veggie] || 0) < t.count) {
        allTargetsMet = false;
        break;
      }
    }

    if (allTargetsMet && score >= currentLevelConfig.target_score) {
      // Win!
      gameState = 'level_complete';
      screenTransitionTime = gameTime;

      // Calculate stars
      var thresholds = CONFIG.STAR_THRESHOLDS[currentLevelNum];
      var stars = 0;
      if (score >= thresholds.star_3) stars = 3;
      else if (score >= thresholds.star_2) stars = 2;
      else if (score >= thresholds.star_1) stars = 1;

      // Update progress
      if (!levelProgress[currentLevelNum] || levelProgress[currentLevelNum] < stars) {
        levelProgress[currentLevelNum] = stars;
        saveProgress();
      }

      SoundManager.play('level_complete');
      Renderer.addConfetti(50);
      return true;
    }

    if (movesLeft <= 0) {
      // Lose
      gameState = 'level_failed';
      screenTransitionTime = gameTime;
      SoundManager.play('level_failed');
      return true;
    }

    return false;
  }

  // === Input Handling ===

  function handleMouseDown(e) {
    // Resume audio context on first user interaction
    SoundManager.resume();
  }

  function handleClick(e) {
    var pos = getClickPos(e);
    SoundManager.resume();

    switch (gameState) {
      case 'menu':
        handleMenuClick(pos);
        break;
      case 'level_select':
        handleLevelSelectClick(pos);
        break;
      case 'level_intro':
        handleLevelIntroClick(pos);
        break;
      case 'playing':
        handlePlayingClick(pos);
        break;
      case 'paused':
        handlePausedClick(pos);
        break;
      case 'level_complete':
        handleLevelCompleteClick(pos);
        break;
      case 'level_failed':
        handleLevelFailedClick(pos);
        break;
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      if (gameState === 'playing') {
        pauseGame();
      } else if (gameState === 'paused') {
        resumeGame();
      }
    }
  }

  function handleMenuClick(pos) {
    if (isInRect(pos.x, pos.y, uiButtons.startBtn)) {
      SoundManager.play('click');
      goToLevelSelect();
    }
  }

  function handleLevelSelectClick(pos) {
    if (!uiButtons.buttons) return;
    for (var i = 0; i < uiButtons.buttons.length; i++) {
      var btn = uiButtons.buttons[i];
      if (isInRect(pos.x, pos.y, btn)) {
        if (btn.action === 'back') {
          SoundManager.play('click');
          goToMenu();
        } else if (btn.unlocked) {
          SoundManager.play('click');
          goToLevelIntro(btn.level);
        }
        return;
      }
    }
  }

  function handleLevelIntroClick(pos) {
    if (isInRect(pos.x, pos.y, uiButtons.startBtn)) {
      SoundManager.play('click');
      startPlaying();
    } else if (isInRect(pos.x, pos.y, uiButtons.backBtn)) {
      SoundManager.play('click');
      goToLevelSelect();
    }
  }

  function handlePlayingClick(pos) {
    if (isAnimating) return;

    // Check pause button
    if (uiButtons.pauseBtn && isInRect(pos.x, pos.y, uiButtons.pauseBtn)) {
      pauseGame();
      return;
    }

    // Board click
    if (!board || !boardLayout) return;
    var cell = Renderer.pixelToCell(pos.x, pos.y, boardLayout, board.rows, board.cols);
    if (!cell) return;

    lastInputTime = gameTime;
    hintTimer = 0;
    showingHint = false;

    var gridCell = board.getCell(cell.row, cell.col);
    if (!gridCell) return;

    if (selectedCell === null) {
      // First selection
      selectedCell = { row: cell.row, col: cell.col };
      SoundManager.play('select');
    } else if (selectedCell.row === cell.row && selectedCell.col === cell.col) {
      // Deselect
      selectedCell = null;
    } else if (board.isAdjacent(selectedCell.row, selectedCell.col, cell.row, cell.col)) {
      // Try swap
      attemptSwap(selectedCell.row, selectedCell.col, cell.row, cell.col);
      selectedCell = null;
    } else {
      // Select new cell
      selectedCell = { row: cell.row, col: cell.col };
      SoundManager.play('select');
    }
  }

  function handlePausedClick(pos) {
    if (isInRect(pos.x, pos.y, uiButtons.resumeBtn)) {
      SoundManager.play('click');
      resumeGame();
    } else if (isInRect(pos.x, pos.y, uiButtons.retryBtn)) {
      retryLevel();
    } else if (isInRect(pos.x, pos.y, uiButtons.quitBtn)) {
      SoundManager.play('click');
      goToLevelSelect();
    }
  }

  function handleLevelCompleteClick(pos) {
    if (uiButtons.nextBtn && isInRect(pos.x, pos.y, uiButtons.nextBtn)) {
      SoundManager.play('click');
      if (currentLevelNum < CONFIG.LEVELS.length) {
        goToLevelIntro(currentLevelNum + 1);
      }
    }
    if (isInRect(pos.x, pos.y, uiButtons.levelsBtn)) {
      SoundManager.play('click');
      goToLevelSelect();
    }
  }

  function handleLevelFailedClick(pos) {
    if (isInRect(pos.x, pos.y, uiButtons.retryBtn)) {
      retryLevel();
    } else if (isInRect(pos.x, pos.y, uiButtons.levelsBtn)) {
      SoundManager.play('click');
      goToLevelSelect();
    }
  }

  // === Swap & Match Logic ===

  function attemptSwap(r1, c1, r2, c2) {
    isAnimating = true;

    // Check for special swap (rainbow)
    var specialSwap = board.checkSpecialSwap(r1, c1, r2, c2);

    if (specialSwap.isSpecialSwap) {
      // Rainbow swap - always valid
      SoundManager.play('swap');
      movesLeft--;

      // Low moves warning
      if (movesLeft <= CONFIG.LOW_MOVES_WARNING && !lowMovesWarned) {
        lowMovesWarned = true;
        SoundManager.play('warning');
      }

      // Animate swap
      animateSwap(r1, c1, r2, c2, function() {
        board.swap(r1, c1, r2, c2);
        // Activate rainbow
        var result = board.activateSpecial(specialSwap.rainbowPos.row, specialSwap.rainbowPos.col, specialSwap.targetType);
        if (result.scoreEvent) {
          var pts = CONFIG.SCORE_EVENTS[result.scoreEvent] || 0;
          score += pts;
          SoundManager.play('special_activate');
          // Add sparkles for removed cells
          for (var i = 0; i < result.removed.length; i++) {
            var rc = result.removed[i];
            var pxPos = Renderer.cellToPixel(rc.row, rc.col, boardLayout);
            Renderer.addSparkle(pxPos.x + boardLayout.cellSize/2, pxPos.y + boardLayout.cellSize/2,
                                CONFIG.VEGGIES[rc.type] ? CONFIG.VEGGIES[rc.type].color : '#FFD700', 3);
            // Track elimination
            if (veggieEliminated.hasOwnProperty(rc.type)) {
              veggieEliminated[rc.type]++;
            }
          }
          // Rainbow wave effect
          var rPos = Renderer.cellToPixel(specialSwap.rainbowPos.row, specialSwap.rainbowPos.col, boardLayout);
          specialEffects.push({
            type: 'rainbow_wave',
            cx: rPos.x + boardLayout.cellSize/2,
            cy: rPos.y + boardLayout.cellSize/2,
            startTime: gameTime
          });
        }

        // Continue with gravity and cascade
        processCascade(0);
      });
      return;
    }

    // Normal swap
    board.swap(r1, c1, r2, c2);
    var matches = board.findMatches();

    if (matches.length === 0) {
      // Invalid swap - swap back
      board.swap(r1, c1, r2, c2);
      SoundManager.play('invalid_swap');
      animateInvalidSwap(r1, c1, r2, c2, function() {
        isAnimating = false;
      });
      return;
    }

    // Valid swap
    board.swap(r1, c1, r2, c2); // swap back, we'll do it in animation
    SoundManager.play('swap');
    movesLeft--;

    // Low moves warning
    if (movesLeft <= CONFIG.LOW_MOVES_WARNING && !lowMovesWarned) {
      lowMovesWarned = true;
      SoundManager.play('warning');
    }

    animateSwap(r1, c1, r2, c2, function() {
      board.swap(r1, c1, r2, c2);
      // Process matches and cascade
      processCascade(0, { row: r2, col: c2 });
    });
  }

  function processCascade(level, swapPos) {
    cascadeLevel = level;
    var matches = board.findMatches();

    if (matches.length === 0) {
      // No more matches - gravity + fill
      var gravMoves = board.applyGravity();
      var newCells = board.fillEmpty();

      if (gravMoves.length > 0 || newCells.length > 0) {
        animateGravityAndFill(gravMoves, newCells, function() {
          SoundManager.play('veggie_fall');
          // Check again after fill (new veggies might form matches)
          processCascade(level);
        });
      } else {
        // Cascade complete
        finishTurn();
      }
      return;
    }

    // Process matches
    var result = board.processMatches(matches, swapPos);

    // Calculate score with cascade multiplier
    var multiplier = Math.min(CONFIG.COMBO.BASE_MULTIPLIER + CONFIG.COMBO.INCREMENT * level, CONFIG.COMBO.MAX);
    var turnScore = 0;

    for (var i = 0; i < result.scoreEvents.length; i++) {
      var evt = result.scoreEvents[i];
      var pts = CONFIG.SCORE_EVENTS[evt] || 0;
      turnScore += Math.floor(pts * multiplier);
    }
    score += turnScore;

    // Play match sounds
    var maxMatchLen = 0;
    for (var mi = 0; mi < matches.length; mi++) {
      if (matches[mi].cells.length > maxMatchLen) maxMatchLen = matches[mi].cells.length;
    }
    if (maxMatchLen >= 5) SoundManager.play('match_5');
    else if (maxMatchLen >= 4) SoundManager.play('match_4');
    else SoundManager.play('match_3');

    if (level > 0) {
      SoundManager.play('cascade', level);
    }

    // Cascade combo popup
    if (level >= 1) {
      comboPopup = { cascadeLevel: level + 1, startTime: gameTime };
      SoundManager.play('combo');
    }

    // Track veggie eliminations
    for (var ri = 0; ri < result.removed.length; ri++) {
      var removedType = result.removed[ri].type;
      if (veggieEliminated.hasOwnProperty(removedType)) {
        veggieEliminated[removedType]++;
      }
    }

    // Special creation effects
    for (var si = 0; si < result.specials.length; si++) {
      SoundManager.play('special_create');
      var sPos = Renderer.cellToPixel(result.specials[si].row, result.specials[si].col, boardLayout);
      Renderer.addSparkle(sPos.x + boardLayout.cellSize/2, sPos.y + boardLayout.cellSize/2, '#FFD700', 8);
    }

    // Check for activated specials among removed cells
    var specialActivations = [];
    for (var ri2 = 0; ri2 < result.removed.length; ri2++) {
      var rem = result.removed[ri2];
      if (rem.special && rem.special !== CONFIG.SPECIAL.NONE) {
        specialActivations.push(rem);
      }
    }

    // Sparkle particles for removed cells
    for (var ri3 = 0; ri3 < result.removed.length; ri3++) {
      var rem2 = result.removed[ri3];
      var pxPos2 = Renderer.cellToPixel(rem2.row, rem2.col, boardLayout);
      var color = CONFIG.VEGGIES[rem2.type] ? CONFIG.VEGGIES[rem2.type].color : '#FFD700';
      Renderer.addSparkle(pxPos2.x + boardLayout.cellSize/2, pxPos2.y + boardLayout.cellSize/2, color, 4);
    }

    // Animate match disappear
    animateMatchDisappear(result.removed, function() {
      // Process special activations
      processSpecialActivations(specialActivations, function() {
        // Gravity + fill
        var gravMoves = board.applyGravity();
        var newCells = board.fillEmpty();

        if (gravMoves.length > 0 || newCells.length > 0) {
          animateGravityAndFill(gravMoves, newCells, function() {
            SoundManager.play('veggie_fall');
            processCascade(level + 1);
          });
        } else {
          processCascade(level + 1);
        }
      });
    });
  }

  function processSpecialActivations(specials, callback) {
    if (specials.length === 0) {
      callback();
      return;
    }

    var special = specials.shift();
    SoundManager.play('special_activate');

    // The special was already removed from the board, but we need to activate its effect
    // For stripe specials, clear the row/column
    var removed = [];
    var scoreEvent = null;

    if (special.special === CONFIG.SPECIAL.STRIPE_H) {
      scoreEvent = 'special_stripe_activate';
      for (var c = 0; c < board.cols; c++) {
        if (board.grid[special.row][c]) {
          removed.push({ row: special.row, col: c, type: board.grid[special.row][c].type });
          board.grid[special.row][c] = null;
        }
      }
      // Line blast effect
      specialEffects.push({
        type: 'line_blast',
        row: special.row,
        col: special.col,
        direction: 'h',
        startTime: gameTime
      });
    } else if (special.special === CONFIG.SPECIAL.STRIPE_V) {
      scoreEvent = 'special_stripe_activate';
      for (var r = 0; r < board.rows; r++) {
        if (board.grid[r][special.col]) {
          removed.push({ row: r, col: special.col, type: board.grid[r][special.col].type });
          board.grid[r][special.col] = null;
        }
      }
      specialEffects.push({
        type: 'line_blast',
        row: special.row,
        col: special.col,
        direction: 'v',
        startTime: gameTime
      });
    }

    if (scoreEvent) {
      score += CONFIG.SCORE_EVENTS[scoreEvent] || 0;
    }

    // Track eliminations and sparkles
    for (var i = 0; i < removed.length; i++) {
      if (veggieEliminated.hasOwnProperty(removed[i].type)) {
        veggieEliminated[removed[i].type]++;
      }
      var pxPos = Renderer.cellToPixel(removed[i].row, removed[i].col, boardLayout);
      Renderer.addSparkle(pxPos.x + boardLayout.cellSize/2, pxPos.y + boardLayout.cellSize/2,
                          CONFIG.VEGGIES[removed[i].type] ? CONFIG.VEGGIES[removed[i].type].color : '#FFD700', 3);
    }

    // Short delay then continue
    setTimeout(function() {
      processSpecialActivations(specials, callback);
    }, 200);
  }

  function finishTurn() {
    cascadeLevel = 0;
    isAnimating = false;

    // Check win/lose
    if (checkWinLose()) return;

    // Check for valid moves (dead board)
    var validMove = board.findValidMove();
    if (!validMove) {
      // Shuffle board
      board.shuffle();
    }

    // Reset hint timer
    lastInputTime = gameTime;
    hintTimer = 0;
    showingHint = false;

    // Star earning check
    checkStarEarning();
  }

  function checkStarEarning() {
    var thresholds = CONFIG.STAR_THRESHOLDS[currentLevelNum];
    var currentStars = 0;
    if (score >= thresholds.star_3) currentStars = 3;
    else if (score >= thresholds.star_2) currentStars = 2;
    else if (score >= thresholds.star_1) currentStars = 1;

    if (currentStars > lastStarLevel) {
      SoundManager.play('star_earn');
      lastStarLevel = currentStars;
    }
  }

  // === Animations ===

  function animateSwap(r1, c1, r2, c2, callback) {
    var pos1 = Renderer.cellToPixel(r1, c1, boardLayout);
    var pos2 = Renderer.cellToPixel(r2, c2, boardLayout);
    var cell1 = board.getCell(r1, c1);
    var cell2 = board.getCell(r2, c2);
    var startTime = gameTime;
    var duration = CONFIG.ANIM.SWAP;

    animatingCells[r1 + ',' + c1] = true;
    animatingCells[r2 + ',' + c2] = true;

    animations.push({
      type: 'swap',
      r1: r1, c1: c1, r2: r2, c2: c2,
      pos1: pos1, pos2: pos2,
      cell1: { type: cell1.type, special: cell1.special },
      cell2: { type: cell2.type, special: cell2.special },
      startTime: startTime,
      duration: duration,
      callback: callback
    });
  }

  function animateInvalidSwap(r1, c1, r2, c2, callback) {
    var pos1 = Renderer.cellToPixel(r1, c1, boardLayout);
    var pos2 = Renderer.cellToPixel(r2, c2, boardLayout);
    var cell1 = board.getCell(r1, c1);
    var cell2 = board.getCell(r2, c2);
    var startTime = gameTime;
    var duration = CONFIG.ANIM.INVALID_SWAP;

    animatingCells[r1 + ',' + c1] = true;
    animatingCells[r2 + ',' + c2] = true;

    animations.push({
      type: 'invalid_swap',
      r1: r1, c1: c1, r2: r2, c2: c2,
      pos1: pos1, pos2: pos2,
      cell1: { type: cell1.type, special: cell1.special },
      cell2: { type: cell2.type, special: cell2.special },
      startTime: startTime,
      duration: duration,
      callback: callback
    });
  }

  function animateMatchDisappear(removed, callback) {
    if (removed.length === 0) { callback(); return; }
    var startTime = gameTime;
    var duration = CONFIG.ANIM.MATCH_DISAPPEAR;

    for (var i = 0; i < removed.length; i++) {
      animatingCells[removed[i].row + ',' + removed[i].col] = true;
    }

    animations.push({
      type: 'disappear',
      cells: removed,
      startTime: startTime,
      duration: duration,
      callback: callback
    });
  }

  function animateGravityAndFill(gravMoves, newCells, callback) {
    var startTime = gameTime;
    var duration = CONFIG.ANIM.FALL;
    // Extend duration for larger drops
    var maxDrop = 0;
    for (var i = 0; i < gravMoves.length; i++) {
      var drop = gravMoves[i].toRow - gravMoves[i].fromRow;
      if (drop > maxDrop) maxDrop = drop;
    }
    for (var j = 0; j < newCells.length; j++) {
      var drop2 = newCells[j].row - newCells[j].fromRow;
      if (drop2 > maxDrop) maxDrop = drop2;
    }
    duration = Math.min(duration + maxDrop * 30, 500);

    // Mark all cells involved in gravity as animating
    // This prevents the static board draw from showing them at final position
    for (var gi = 0; gi < gravMoves.length; gi++) {
      animatingCells[gravMoves[gi].toRow + ',' + gravMoves[gi].toCol] = true;
    }
    for (var ni = 0; ni < newCells.length; ni++) {
      animatingCells[newCells[ni].row + ',' + newCells[ni].col] = true;
    }

    animations.push({
      type: 'gravity',
      moves: gravMoves,
      newCells: newCells,
      startTime: startTime,
      duration: duration,
      callback: callback
    });
  }

  // === Animation Rendering ===

  function updateAnimations() {
    for (var i = animations.length - 1; i >= 0; i--) {
      var anim = animations[i];
      var elapsed = gameTime - anim.startTime;
      var progress = Math.min(elapsed / anim.duration, 1);

      switch (anim.type) {
        case 'swap':
          renderSwapAnim(anim, progress);
          break;
        case 'invalid_swap':
          renderInvalidSwapAnim(anim, progress);
          break;
        case 'disappear':
          renderDisappearAnim(anim, progress);
          break;
        case 'gravity':
          renderGravityAnim(anim, progress);
          break;
      }

      if (progress >= 1) {
        // Clean up animating cells
        if (anim.type === 'swap' || anim.type === 'invalid_swap') {
          delete animatingCells[anim.r1 + ',' + anim.c1];
          delete animatingCells[anim.r2 + ',' + anim.c2];
        } else if (anim.type === 'disappear') {
          for (var ci = 0; ci < anim.cells.length; ci++) {
            delete animatingCells[anim.cells[ci].row + ',' + anim.cells[ci].col];
          }
        } else if (anim.type === 'gravity') {
          // Clear all gravity animation markers
          for (var gi = 0; gi < anim.moves.length; gi++) {
            delete animatingCells[anim.moves[gi].toRow + ',' + anim.moves[gi].toCol];
          }
          for (var ni = 0; ni < anim.newCells.length; ni++) {
            delete animatingCells[anim.newCells[ni].row + ',' + anim.newCells[ni].col];
          }
        }

        animations.splice(i, 1);
        if (anim.callback) anim.callback();
      }
    }
  }

  function renderSwapAnim(anim, progress) {
    // Smooth ease in-out
    var t = easeInOutQuad(progress);
    var x1 = anim.pos1.x + (anim.pos2.x - anim.pos1.x) * t;
    var y1 = anim.pos1.y + (anim.pos2.y - anim.pos1.y) * t;
    var x2 = anim.pos2.x + (anim.pos1.x - anim.pos2.x) * t;
    var y2 = anim.pos2.y + (anim.pos1.y - anim.pos2.y) * t;

    Renderer.drawVeggieAt(anim.cell1.type, anim.cell1.special, x1, y1, boardLayout.cellSize);
    Renderer.drawVeggieAt(anim.cell2.type, anim.cell2.special, x2, y2, boardLayout.cellSize);
  }

  function renderInvalidSwapAnim(anim, progress) {
    // Move halfway, then shake back
    var t;
    if (progress < 0.4) {
      t = easeInOutQuad(progress / 0.4) * 0.4;
    } else {
      // Shake and return
      var shake = Math.sin((progress - 0.4) / 0.6 * Math.PI * 4) * (1 - progress) * 0.15;
      t = 0.4 * (1 - (progress - 0.4) / 0.6) + shake;
    }
    var x1 = anim.pos1.x + (anim.pos2.x - anim.pos1.x) * t;
    var y1 = anim.pos1.y + (anim.pos2.y - anim.pos1.y) * t;
    var x2 = anim.pos2.x + (anim.pos1.x - anim.pos2.x) * t;
    var y2 = anim.pos2.y + (anim.pos1.y - anim.pos2.y) * t;

    Renderer.drawVeggieAt(anim.cell1.type, anim.cell1.special, x1, y1, boardLayout.cellSize);
    Renderer.drawVeggieAt(anim.cell2.type, anim.cell2.special, x2, y2, boardLayout.cellSize);
  }

  function renderDisappearAnim(anim, progress) {
    var alpha = 1 - progress;
    var scale = 1 - progress * 0.5;
    for (var i = 0; i < anim.cells.length; i++) {
      var cell = anim.cells[i];
      var pos = Renderer.cellToPixel(cell.row, cell.col, boardLayout);
      Renderer.drawVeggieAt(cell.type, cell.special, pos.x, pos.y, boardLayout.cellSize, alpha, scale);
    }
  }

  function renderGravityAnim(anim, progress) {
    var t = easeInQuad(progress);

    // Falling cells
    for (var i = 0; i < anim.moves.length; i++) {
      var move = anim.moves[i];
      var fromPos = Renderer.cellToPixel(move.fromRow, move.fromCol, boardLayout);
      var toPos = Renderer.cellToPixel(move.toRow, move.toCol, boardLayout);
      var x = fromPos.x;
      var y = fromPos.y + (toPos.y - fromPos.y) * t;
      var cell = board.getCell(move.toRow, move.toCol);
      if (cell) {
        Renderer.drawVeggieAt(cell.type, cell.special, x, y, boardLayout.cellSize);
      }
    }

    // New cells from above
    for (var j = 0; j < anim.newCells.length; j++) {
      var nc = anim.newCells[j];
      var toPos2 = Renderer.cellToPixel(nc.row, nc.col, boardLayout);
      var fromY = boardLayout.offsetY + nc.fromRow * (boardLayout.cellSize + boardLayout.gap);
      var y2 = fromY + (toPos2.y - fromY) * t;
      var cell2 = board.getCell(nc.row, nc.col);
      if (cell2) {
        Renderer.drawVeggieAt(cell2.type, cell2.special, toPos2.x, y2, boardLayout.cellSize);
      }
    }
  }

  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function easeInQuad(t) {
    return t * t;
  }

  // === Game Loop ===

  function gameLoop(timestamp) {
    var deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    gameTime = timestamp;

    // Clamp delta
    if (deltaTime > 100) deltaTime = 16;

    update(deltaTime);
    render();

    requestAnimationFrame(gameLoop);
  }

  function update(dt) {
    if (gameState === 'playing' && !isAnimating) {
      // Hint timer
      hintTimer += dt;
      if (hintTimer >= CONFIG.HINT_DELAY && !showingHint) {
        hintMove = board.findValidMove();
        if (hintMove) {
          showingHint = true;
        }
      }
    }

    // Update special effects
    for (var i = specialEffects.length - 1; i >= 0; i--) {
      var fx = specialEffects[i];
      var elapsed = gameTime - fx.startTime;
      var duration = fx.type === 'line_blast' ? CONFIG.ANIM.STRIPE_ACTIVATE : CONFIG.ANIM.RAINBOW_ACTIVATE;
      if (elapsed > duration) {
        specialEffects.splice(i, 1);
      }
    }

    // Update GAME_STATE
    updateGameStateAPI();
  }

  function render() {
    Renderer.clear();

    switch (gameState) {
      case 'menu':
        uiButtons = Renderer.drawMenuScreen(gameTime);
        break;

      case 'level_select':
        uiButtons = Renderer.drawLevelSelectScreen(levelProgress);
        break;

      case 'level_intro':
        // Draw the level select behind as context
        Renderer.drawLevelSelectScreen(levelProgress);
        var introButtons = Renderer.drawLevelIntroScreen(currentLevelConfig);
        uiButtons = introButtons;
        break;

      case 'playing':
      case 'paused':
        renderPlayingScreen();
        if (gameState === 'paused') {
          var pauseButtons = Renderer.drawPausedScreen();
          uiButtons = pauseButtons;
        }
        break;

      case 'level_complete':
        renderPlayingScreen();
        var thresholds = CONFIG.STAR_THRESHOLDS[currentLevelNum];
        var isLast = currentLevelNum >= CONFIG.LEVELS.length;
        var completeButtons = Renderer.drawLevelCompleteScreen(score, thresholds, currentLevelNum, isLast, gameTime - screenTransitionTime);
        uiButtons = completeButtons;
        break;

      case 'level_failed':
        renderPlayingScreen();
        var failButtons = Renderer.drawLevelFailedScreen(score);
        uiButtons = failButtons;
        break;
    }

    // Always draw particles on top
    Renderer.updateAndDrawParticles();
  }

  function renderPlayingScreen() {
    // Background
    if (Renderer.images.bg_game) {
      Renderer.ctx.drawImage(Renderer.images.bg_game, 0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    } else {
      Renderer.clear();
    }

    // Top panel
    var thresholds = CONFIG.STAR_THRESHOLDS[currentLevelNum];
    Renderer.drawTopPanel(currentLevelNum, score, movesLeft, thresholds, gameTime);

    // Board
    if (board && boardLayout) {
      Renderer.drawBoard(board, boardLayout, { animatingCells: animatingCells });

      // Animations
      updateAnimations();

      // Selection highlight
      if (selectedCell && !isAnimating) {
        Renderer.drawSelection(selectedCell.row, selectedCell.col, boardLayout, gameTime);
      }

      // Hint highlight
      if (showingHint && hintMove && !isAnimating) {
        Renderer.drawHint(hintMove.r1, hintMove.c1, hintMove.r2, hintMove.c2, boardLayout, gameTime);
      }

      // Special effects
      for (var i = 0; i < specialEffects.length; i++) {
        var fx = specialEffects[i];
        var elapsed = gameTime - fx.startTime;
        var duration = fx.type === 'line_blast' ? CONFIG.ANIM.STRIPE_ACTIVATE : CONFIG.ANIM.RAINBOW_ACTIVATE;
        var progress = Math.min(elapsed / duration, 1);

        if (fx.type === 'line_blast') {
          Renderer.drawLineBlast(fx.row, fx.col, fx.direction, progress, boardLayout);
        } else if (fx.type === 'rainbow_wave') {
          Renderer.drawRainbowWave(fx.cx, fx.cy, progress);
        }
      }

      // Combo popup
      if (comboPopup) {
        Renderer.drawComboPopup(comboPopup.cascadeLevel, gameTime, comboPopup.startTime);
        if (gameTime - comboPopup.startTime > CONFIG.ANIM.COMBO_POPUP) {
          comboPopup = null;
        }
      }

      // Target panel
      var panelBottom = Renderer.drawTargetPanel(currentLevelConfig.targets, veggieEliminated, boardLayout);

      // Pause button
      uiButtons.pauseBtn = Renderer.drawPauseButton(panelBottom);
    }
  }

  // === GAME_STATE API for testing ===

  function updateGameStateAPI() {
    window.GAME_STATE = {
      gameState: gameState,
      currentLevel: currentLevelNum,
      currentLevelConfig: currentLevelConfig,
      score: score,
      movesLeft: movesLeft,
      selectedCell: selectedCell,
      veggieEliminated: Object.assign({}, veggieEliminated),
      cascadeLevel: cascadeLevel,
      isAnimating: isAnimating,
      board: board ? board.getSnapshot() : null,
      boardRows: board ? board.rows : 0,
      boardCols: board ? board.cols : 0,
      levelProgress: Object.assign({}, levelProgress),
      hintTimer: hintTimer,
      showingHint: showingHint,

      _testHelpers: {
        goToMenu: goToMenu,
        goToLevelSelect: goToLevelSelect,
        goToLevelIntro: goToLevelIntro,
        startPlaying: startPlaying,
        pauseGame: pauseGame,
        resumeGame: resumeGame,
        retryLevel: retryLevel,

        setScore: function(s) { score = s; },
        setMovesLeft: function(m) { movesLeft = m; },
        setVeggieEliminated: function(obj) { veggieEliminated = obj; },

        simulateClick: function(x, y) {
          var rect = canvas.getBoundingClientRect();
          var event = new MouseEvent('click', {
            clientX: x / (CONFIG.CANVAS_WIDTH / rect.width) + rect.left,
            clientY: y / (CONFIG.CANVAS_HEIGHT / rect.height) + rect.top
          });
          canvas.dispatchEvent(event);
        },

        simulateCellClick: function(row, col) {
          if (!boardLayout) return;
          var pos = Renderer.cellToPixel(row, col, boardLayout);
          var cx = pos.x + boardLayout.cellSize / 2;
          var cy = pos.y + boardLayout.cellSize / 2;
          this.simulateClick(cx, cy);
        },

        getBoard: function() {
          return board ? board.getSnapshot() : null;
        },

        setBoardCell: function(row, col, type, special) {
          if (!board) return;
          board.grid[row][col] = { type: type, special: special || CONFIG.SPECIAL.NONE };
        },

        findMatches: function() {
          return board ? board.findMatches() : [];
        },

        findValidMove: function() {
          return board ? board.findValidMove() : null;
        },

        toggleSound: function() {
          return SoundManager.toggle();
        },

        checkWinLose: checkWinLose,

        toggleHitboxDebug: function() {
          // No collision hitboxes in match-3 (grid-based), this is a no-op
          console.log('Match-3 games use grid-based selection, no hitbox debug needed.');
        }
      }
    };
  }

  // Initialize when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
  } else {
    initGame();
  }

})();
