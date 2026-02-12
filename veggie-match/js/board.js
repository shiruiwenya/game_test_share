/**
 * board.js - Board logic: grid management, matching, cascading, specials, hints
 * Depends on: config.js
 */

var Board = (function() {

  /**
   * Create a new Board for a level
   * @param {Object} levelConfig - from CONFIG.LEVELS
   */
  function Board(levelConfig) {
    this.rows = levelConfig.grid_rows;
    this.cols = levelConfig.grid_cols;
    this.veggieTypes = levelConfig.veggie_types.slice();
    this.grid = [];         // grid[row][col] = { type: string, special: string }
    this.initGrid();
  }

  // --- Grid Initialization ---

  Board.prototype.initGrid = function() {
    this.grid = [];
    for (var r = 0; r < this.rows; r++) {
      this.grid[r] = [];
      for (var c = 0; c < this.cols; c++) {
        var type = this._randomTypeNoMatch(r, c);
        this.grid[r][c] = { type: type, special: CONFIG.SPECIAL.NONE };
      }
    }
    // Ensure at least one valid move exists
    if (!this.findValidMove()) {
      this.shuffle();
    }
  };

  Board.prototype._randomTypeNoMatch = function(row, col) {
    // Keep picking random type until it doesn't form a 3-match with left-2 or top-2
    var attempts = 0;
    while (attempts < 100) {
      var type = this.veggieTypes[Math.floor(Math.random() * this.veggieTypes.length)];
      var matchH = false, matchV = false;

      // Check horizontal (left 2)
      if (col >= 2 && this.grid[row][col - 1] && this.grid[row][col - 2]) {
        matchH = (this.grid[row][col - 1].type === type && this.grid[row][col - 2].type === type);
      }

      // Check vertical (top 2)
      if (row >= 2 && this.grid[row - 1][col] && this.grid[row - 2][col]) {
        matchV = (this.grid[row - 1][col].type === type && this.grid[row - 2][col].type === type);
      }

      if (!matchH && !matchV) return type;
      attempts++;
    }
    // Fallback (shouldn't normally reach)
    return this.veggieTypes[0];
  };

  // --- Cell Access ---

  Board.prototype.getCell = function(row, col) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null;
    return this.grid[row][col];
  };

  Board.prototype.isAdjacent = function(r1, c1, r2, c2) {
    return (Math.abs(r1 - r2) + Math.abs(c1 - c2)) === 1;
  };

  // --- Swap ---

  Board.prototype.swap = function(r1, c1, r2, c2) {
    var temp = this.grid[r1][c1];
    this.grid[r1][c1] = this.grid[r2][c2];
    this.grid[r2][c2] = temp;
  };

  // --- Match Detection ---

  /**
   * Find all matches on the board.
   * Returns array of match objects:
   *   { cells: [{row,col},...], type: veggie_type, length: N, direction: 'h'|'v'|'L'|'T' }
   * Handles 3+, 4, 5, L-shape, T-shape
   */
  Board.prototype.findMatches = function() {
    var horizontal = [];
    var vertical = [];

    // Horizontal runs
    for (var r = 0; r < this.rows; r++) {
      var c = 0;
      while (c < this.cols) {
        if (!this.grid[r][c]) { c++; continue; }
        var type = this.grid[r][c].type;
        if (!type || type === 'rainbow') { c++; continue; }
        var run = [{ row: r, col: c }];
        var nc = c + 1;
        while (nc < this.cols && this.grid[r][nc] && this.grid[r][nc].type === type) {
          run.push({ row: r, col: nc });
          nc++;
        }
        if (run.length >= 3) {
          horizontal.push({ cells: run, type: type, direction: 'h' });
        }
        c = nc;
      }
    }

    // Vertical runs
    for (var c2 = 0; c2 < this.cols; c2++) {
      var r2 = 0;
      while (r2 < this.rows) {
        if (!this.grid[r2][c2]) { r2++; continue; }
        var type2 = this.grid[r2][c2].type;
        if (!type2 || type2 === 'rainbow') { r2++; continue; }
        var run2 = [{ row: r2, col: c2 }];
        var nr = r2 + 1;
        while (nr < this.rows && this.grid[nr][c2] && this.grid[nr][c2].type === type2) {
          run2.push({ row: nr, col: c2 });
          nr++;
        }
        if (run2.length >= 3) {
          vertical.push({ cells: run2, type: type2, direction: 'v' });
        }
        r2 = nr;
      }
    }

    // Merge overlapping H+V matches into L/T shapes
    var matches = [];
    var usedH = new Array(horizontal.length);
    var usedV = new Array(vertical.length);

    for (var hi = 0; hi < horizontal.length; hi++) {
      for (var vi = 0; vi < vertical.length; vi++) {
        if (usedH[hi] || usedV[vi]) continue;
        if (horizontal[hi].type !== vertical[vi].type) continue;

        // Check for shared cell
        var shared = false;
        for (var a = 0; a < horizontal[hi].cells.length; a++) {
          for (var b = 0; b < vertical[vi].cells.length; b++) {
            if (horizontal[hi].cells[a].row === vertical[vi].cells[b].row &&
                horizontal[hi].cells[a].col === vertical[vi].cells[b].col) {
              shared = true;
              break;
            }
          }
          if (shared) break;
        }

        if (shared) {
          // Merge into L/T match
          var cellMap = {};
          var allCells = [];
          var mergeCells = horizontal[hi].cells.concat(vertical[vi].cells);
          for (var k = 0; k < mergeCells.length; k++) {
            var key = mergeCells[k].row + ',' + mergeCells[k].col;
            if (!cellMap[key]) {
              cellMap[key] = true;
              allCells.push(mergeCells[k]);
            }
          }
          matches.push({
            cells: allCells,
            type: horizontal[hi].type,
            direction: allCells.length >= 5 ? 'T' : 'L',
            hLen: horizontal[hi].cells.length,
            vLen: vertical[vi].cells.length
          });
          usedH[hi] = true;
          usedV[vi] = true;
        }
      }
    }

    // Add remaining unmerged matches
    for (var hi2 = 0; hi2 < horizontal.length; hi2++) {
      if (!usedH[hi2]) {
        var h = horizontal[hi2];
        h.length = h.cells.length;
        matches.push(h);
      }
    }
    for (var vi2 = 0; vi2 < vertical.length; vi2++) {
      if (!usedV[vi2]) {
        var v = vertical[vi2];
        v.length = v.cells.length;
        matches.push(v);
      }
    }

    // Ensure length property on merged
    for (var mi = 0; mi < matches.length; mi++) {
      if (!matches[mi].length) matches[mi].length = matches[mi].cells.length;
    }

    return matches;
  };

  // --- Special Gem Creation ---

  /**
   * Determine what special (if any) should be created for a match
   * @param {Object} match - match object from findMatches
   * @param {Object} swapPos - {row, col} of the player's moved piece (for placement)
   * Returns: { type: special_type, position: {row, col} } or null
   *
   * GDD rules:
   * - Horizontal 4-match -> stripe_h (clears entire row when activated)
   * - Vertical 4-match -> stripe_v (clears entire column when activated)
   * - 5+ match or L/T with 5+ cells -> rainbow
   */
  Board.prototype.determineSpecial = function(match, swapPos) {
    var len = match.cells.length;

    // 5+ cells or L/T with 5+ unique cells => rainbow
    if (len >= 5) {
      var pos = this._findSpecialPosition(match, swapPos);
      return { type: CONFIG.SPECIAL.RAINBOW, position: pos, veggieType: null };
    }

    // L/T shape with <5 cells: just score bonus, no special
    if (match.direction === 'L' || match.direction === 'T') {
      return null;
    }

    if (len === 4) {
      // 4-match: stripe in SAME direction as the match
      // Horizontal 4-match -> stripe_h (clears row)
      // Vertical 4-match -> stripe_v (clears column)
      var pos3 = this._findSpecialPosition(match, swapPos);
      var specialType;
      if (match.direction === 'h') {
        specialType = CONFIG.SPECIAL.STRIPE_H;
      } else {
        specialType = CONFIG.SPECIAL.STRIPE_V;
      }
      return { type: specialType, position: pos3, veggieType: match.type };
    }

    return null; // match_3, no special
  };

  Board.prototype._findSpecialPosition = function(match, swapPos) {
    // Place special at the swapped position if it's part of the match, otherwise center
    if (swapPos) {
      for (var i = 0; i < match.cells.length; i++) {
        if (match.cells[i].row === swapPos.row && match.cells[i].col === swapPos.col) {
          return { row: swapPos.row, col: swapPos.col };
        }
      }
    }
    // Fallback: center of match
    var midIdx = Math.floor(match.cells.length / 2);
    return { row: match.cells[midIdx].row, col: match.cells[midIdx].col };
  };

  // --- Remove Matches ---

  /**
   * Process matches: remove cells, create specials, return info
   * @param {Array} matches
   * @param {Object} swapPos - optional, the cell the player moved
   * Returns { removed: [{row,col,type,special},...], specials: [{row,col,type,special},...], scoreEvents: [...] }
   */
  Board.prototype.processMatches = function(matches, swapPos) {
    var removed = [];
    var specials = [];
    var scoreEvents = [];
    var removedMap = {};

    for (var mi = 0; mi < matches.length; mi++) {
      var match = matches[mi];

      // Determine if special should be created
      var specialInfo = this.determineSpecial(match, swapPos);

      // Score event
      var eventType;
      if (match.direction === 'L' || match.direction === 'T') {
        eventType = 'match_L_T';
      } else if (match.cells.length >= 5) {
        eventType = 'match_5';
      } else if (match.cells.length === 4) {
        eventType = 'match_4';
      } else {
        eventType = 'match_3';
      }
      scoreEvents.push(eventType);

      // Mark cells for removal
      for (var ci = 0; ci < match.cells.length; ci++) {
        var cell = match.cells[ci];
        var key = cell.row + ',' + cell.col;

        // Don't remove the cell that becomes a special
        if (specialInfo && cell.row === specialInfo.position.row && cell.col === specialInfo.position.col) {
          continue;
        }

        if (!removedMap[key]) {
          removedMap[key] = true;
          var gridCell = this.grid[cell.row][cell.col];
          if (gridCell) {
            removed.push({
              row: cell.row,
              col: cell.col,
              type: gridCell.type,
              special: gridCell.special
            });
          }
        }
      }

      // Create special
      if (specialInfo) {
        var sp = specialInfo.position;
        if (specialInfo.type === CONFIG.SPECIAL.RAINBOW) {
          this.grid[sp.row][sp.col] = { type: 'rainbow', special: CONFIG.SPECIAL.RAINBOW };
        } else {
          this.grid[sp.row][sp.col] = {
            type: specialInfo.veggieType || match.type,
            special: specialInfo.type
          };
        }
        specials.push({
          row: sp.row,
          col: sp.col,
          type: this.grid[sp.row][sp.col].type,
          special: specialInfo.type
        });
      }
    }

    // Actually clear removed cells
    for (var ri = 0; ri < removed.length; ri++) {
      this.grid[removed[ri].row][removed[ri].col] = null;
    }

    return { removed: removed, specials: specials, scoreEvents: scoreEvents };
  };

  // --- Special Activation ---

  /**
   * Activate a special gem's effect
   * @param {number} row
   * @param {number} col
   * @param {string} targetType - for rainbow: the type to clear. null for stripes.
   * Returns: { removed: [{row,col,type},...], scoreEvent: string }
   */
  Board.prototype.activateSpecial = function(row, col, targetType) {
    var cell = this.grid[row][col];
    if (!cell) return { removed: [], scoreEvent: null };

    var removed = [];
    var scoreEvent = null;

    if (cell.special === CONFIG.SPECIAL.STRIPE_H) {
      // Clear entire row
      scoreEvent = 'special_stripe_activate';
      for (var c = 0; c < this.cols; c++) {
        if (this.grid[row][c]) {
          removed.push({ row: row, col: c, type: this.grid[row][c].type });
          this.grid[row][c] = null;
        }
      }
    } else if (cell.special === CONFIG.SPECIAL.STRIPE_V) {
      // Clear entire column
      scoreEvent = 'special_stripe_activate';
      for (var r = 0; r < this.rows; r++) {
        if (this.grid[r][col]) {
          removed.push({ row: r, col: col, type: this.grid[r][col].type });
          this.grid[r][col] = null;
        }
      }
    } else if (cell.special === CONFIG.SPECIAL.RAINBOW) {
      // Clear all of targetType
      scoreEvent = 'special_rainbow_activate';
      this.grid[row][col] = null;
      removed.push({ row: row, col: col, type: 'rainbow' });
      if (targetType && targetType !== 'rainbow') {
        for (var r2 = 0; r2 < this.rows; r2++) {
          for (var c2 = 0; c2 < this.cols; c2++) {
            if (this.grid[r2][c2] && this.grid[r2][c2].type === targetType) {
              removed.push({ row: r2, col: c2, type: this.grid[r2][c2].type });
              this.grid[r2][c2] = null;
            }
          }
        }
      }
    }

    return { removed: removed, scoreEvent: scoreEvent };
  };

  // --- Gravity / Fill ---

  /**
   * Apply gravity: drop cells down to fill gaps.
   * Returns array of moves: { fromRow, fromCol, toRow, toCol }
   */
  Board.prototype.applyGravity = function() {
    var moves = [];
    for (var c = 0; c < this.cols; c++) {
      var writeRow = this.rows - 1;
      for (var r = this.rows - 1; r >= 0; r--) {
        if (this.grid[r][c] !== null) {
          if (r !== writeRow) {
            this.grid[writeRow][c] = this.grid[r][c];
            this.grid[r][c] = null;
            moves.push({ fromRow: r, fromCol: c, toRow: writeRow, toCol: c });
          }
          writeRow--;
        }
      }
    }
    return moves;
  };

  /**
   * Fill empty cells at the top with new random veggies.
   * Returns array of new cells: { row, col, type, fromRow (negative, for animation) }
   */
  Board.prototype.fillEmpty = function() {
    var newCells = [];
    for (var c = 0; c < this.cols; c++) {
      var emptyCount = 0;
      for (var r = 0; r < this.rows; r++) {
        if (this.grid[r][c] === null) {
          emptyCount++;
        }
      }
      // Fill from top
      var fillIdx = 0;
      for (var r2 = 0; r2 < this.rows; r2++) {
        if (this.grid[r2][c] === null) {
          var type = this.veggieTypes[Math.floor(Math.random() * this.veggieTypes.length)];
          this.grid[r2][c] = { type: type, special: CONFIG.SPECIAL.NONE };
          newCells.push({
            row: r2,
            col: c,
            type: type,
            fromRow: -(emptyCount - fillIdx) // negative row = above board
          });
          fillIdx++;
        }
      }
    }
    return newCells;
  };

  // --- Hint System ---

  /**
   * Find one valid move (swap that produces a match)
   * Returns: { r1, c1, r2, c2 } or null if no valid moves
   */
  Board.prototype.findValidMove = function() {
    for (var r = 0; r < this.rows; r++) {
      for (var c = 0; c < this.cols; c++) {
        if (!this.grid[r][c]) continue;

        // Try swap right
        if (c + 1 < this.cols && this.grid[r][c + 1]) {
          this.swap(r, c, r, c + 1);
          var matches = this.findMatches();
          this.swap(r, c, r, c + 1); // swap back
          if (matches.length > 0) return { r1: r, c1: c, r2: r, c2: c + 1 };
        }
        // Try swap down
        if (r + 1 < this.rows && this.grid[r + 1][c]) {
          this.swap(r, c, r + 1, c);
          var matches2 = this.findMatches();
          this.swap(r, c, r + 1, c); // swap back
          if (matches2.length > 0) return { r1: r, c1: c, r2: r + 1, c2: c };
        }
        // Rainbow can swap with anything adjacent
        if (this.grid[r][c].special === CONFIG.SPECIAL.RAINBOW) {
          if (c + 1 < this.cols && this.grid[r][c + 1]) return { r1: r, c1: c, r2: r, c2: c + 1 };
          if (r + 1 < this.rows && this.grid[r + 1][c]) return { r1: r, c1: c, r2: r + 1, c2: c };
          if (c - 1 >= 0 && this.grid[r][c - 1]) return { r1: r, c1: c, r2: r, c2: c - 1 };
          if (r - 1 >= 0 && this.grid[r - 1][c]) return { r1: r, c1: c, r2: r - 1, c2: c };
        }
      }
    }
    return null;
  };

  /**
   * Shuffle the board (keeping specials in place) until at least one valid move exists
   */
  Board.prototype.shuffle = function() {
    var maxAttempts = 50;
    for (var attempt = 0; attempt < maxAttempts; attempt++) {
      // Collect all non-special types
      var types = [];
      var positions = [];
      for (var r = 0; r < this.rows; r++) {
        for (var c = 0; c < this.cols; c++) {
          if (this.grid[r][c] && this.grid[r][c].special === CONFIG.SPECIAL.NONE) {
            types.push(this.grid[r][c].type);
            positions.push({ r: r, c: c });
          }
        }
      }
      // Fisher-Yates shuffle
      for (var i = types.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = types[i];
        types[i] = types[j];
        types[j] = temp;
      }
      // Apply
      for (var k = 0; k < positions.length; k++) {
        this.grid[positions[k].r][positions[k].c].type = types[k];
      }
      // Check for valid moves and no existing matches
      var matches = this.findMatches();
      var validMove = this.findValidMove();
      if (matches.length === 0 && validMove) return;
    }
    // If all attempts fail, reinitialize
    this.initGrid();
  };

  /**
   * Check if the swap between two cells would involve a special gem
   * Returns: { isSpecialSwap: bool, rainbowPos: {row,col}, targetType: string }
   */
  Board.prototype.checkSpecialSwap = function(r1, c1, r2, c2) {
    var cell1 = this.grid[r1][c1];
    var cell2 = this.grid[r2][c2];
    if (!cell1 || !cell2) return { isSpecialSwap: false };

    if (cell1.special === CONFIG.SPECIAL.RAINBOW) {
      return { isSpecialSwap: true, rainbowPos: { row: r1, col: c1 }, targetType: cell2.type };
    }
    if (cell2.special === CONFIG.SPECIAL.RAINBOW) {
      return { isSpecialSwap: true, rainbowPos: { row: r2, col: c2 }, targetType: cell1.type };
    }
    return { isSpecialSwap: false };
  };

  /**
   * Get a snapshot of the board for testing
   */
  Board.prototype.getSnapshot = function() {
    var snap = [];
    for (var r = 0; r < this.rows; r++) {
      snap[r] = [];
      for (var c = 0; c < this.cols; c++) {
        snap[r][c] = this.grid[r][c] ? {
          type: this.grid[r][c].type,
          special: this.grid[r][c].special
        } : null;
      }
    }
    return snap;
  };

  return Board;
})();
