const ROWS = 10;
const COLS = 10;
const MINES = 10;

let board = [];
let isGameOver = false;
let isFirstClick = true;
let flagsPlaced = 0;
let revealedCount = 0;
let timer = 0;
let timerInterval = null;
let isFlagMode = false;

const boardElement = document.getElementById('board');
const minesCountElement = document.getElementById('mines-count');
const restartBtn = document.getElementById('restart-btn');
const timerElement = document.getElementById('timer');

function initGame() {
    document.getElementById('modal').style.display = 'none';
    boardElement.style.gridTemplateColumns = `repeat(${COLS}, 30px)`;
    boardElement.style.gridTemplateRows = `repeat(${ROWS}, 30px)`;
    boardElement.innerHTML = '';
    
    board = [];
    isGameOver = false;
    isFirstClick = true;
    flagsPlaced = 0;
    revealedCount = 0;
    timer = 0;
    updateMinesCount();
    updateTimer();
    
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;

    for (let r = 0; r < ROWS; r++) {
        const row = [];
        for (let c = 0; c < COLS; c++) {
            const cell = {
                r,
                c,
                isMine: false,
                isRevealed: false,
                isFlagged: false,
                neighborMines: 0,
                element: document.createElement('div')
            };
            
            cell.element.classList.add('cell');
            cell.element.addEventListener('click', () => handleLeftClick(r, c));
            cell.element.addEventListener('contextmenu', (e) => handleRightClick(e, r, c));
            
            boardElement.appendChild(cell.element);
            row.push(cell);
        }
        board.push(row);
    }
}

function placeMines(firstClickR, firstClickC) {
    let minesPlaced = 0;
    while (minesPlaced < MINES) {
        const r = Math.floor(Math.random() * ROWS);
        const c = Math.floor(Math.random() * COLS);
        
        if (!board[r][c].isMine && !(r === firstClickR && c === firstClickC)) {
            board[r][c].isMine = true;
            minesPlaced++;
        }
    }
    
    // Calculate neighbors
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c].isMine) continue;
            let count = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr;
                    const nc = c + dc;
                    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc].isMine) {
                        count++;
                    }
                }
            }
            board[r][c].neighborMines = count;
        }
    }
}

function handleLeftClick(r, c) {
    if (isGameOver) return;
    const cell = board[r][c];
    if (cell.isFlagged || cell.isRevealed) return;

    if (isFlagMode) {
        handleRightClick({preventDefault: () => {}}, r, c);
        return;
    }

    if (isFirstClick) {
        isFirstClick = false;
        placeMines(r, c);
        startTimer();
    }

    if (cell.isMine) {
        gameOver(false);
        return;
    }

    revealCell(r, c);
    checkWin();
}

function handleRightClick(e, r, c) {
    e.preventDefault();
    if (isGameOver) return;

    const cell = board[r][c];
    if (cell.isRevealed) return;

    if (!cell.isFlagged && flagsPlaced < MINES) {
        cell.isFlagged = true;
        cell.element.classList.add('flagged');
        cell.element.textContent = '🚩';
        flagsPlaced++;
    } else if (cell.isFlagged) {
        cell.isFlagged = false;
        cell.element.classList.remove('flagged');
        cell.element.textContent = '';
        flagsPlaced--;
    }
    updateMinesCount();
}

function revealCell(r, c) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    const cell = board[r][c];
    if (cell.isRevealed || cell.isFlagged) return;

    cell.isRevealed = true;
    cell.element.classList.add('revealed');
    revealedCount++;

    if (cell.neighborMines > 0) {
        cell.element.textContent = cell.neighborMines;
        cell.element.dataset.mines = cell.neighborMines;
    } else {
        // Flood fill for 0 neighbor mines
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr !== 0 || dc !== 0) {
                    revealCell(r + dr, c + dc);
                }
            }
        }
    }
}

function checkWin() {
    if (revealedCount === ROWS * COLS - MINES) {
        gameOver(true);
    }
}

function gameOver(isWin) {
    isGameOver = true;
    if (timerInterval) clearInterval(timerInterval);

    // Reveal all mines
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = board[r][c];
            if (cell.isMine) {
                if (!cell.isFlagged) {
                    cell.element.classList.add('revealed');
                    cell.element.textContent = '💣';
                    if (!isWin) cell.element.classList.add('mine');
                }
            } else if (cell.isFlagged) {
                // Incorrectly flagged
                cell.element.textContent = '❌';
            }
        }
    }

    setTimeout(() => {
        const modal = document.getElementById('modal');
        const modalMessage = document.getElementById('modal-message');
        modalMessage.textContent = isWin ? '恭喜你，你赢了！' : '游戏结束，你踩到雷了！';
        modalMessage.style.color = isWin ? '#4CAF50' : 'red';
        modal.style.display = 'flex';
    }, 100);
}

function updateMinesCount() {
    minesCountElement.textContent = `剩余雷数: ${MINES - flagsPlaced}`;
}

function updateTimer() {
    timerElement.textContent = `时间: ${timer}`;
}

function startTimer() {
    timerInterval = setInterval(() => {
        timer++;
        updateTimer();
    }, 1000);
}

restartBtn.addEventListener('click', initGame);
document.getElementById('modal-restart-btn').addEventListener('click', initGame);

// Mobile toggle flag mode support
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    const toggleBtn = document.getElementById('mobile-toggle-btn');
    toggleBtn.style.display = 'inline-block';
    
    toggleBtn.addEventListener('click', () => {
        isFlagMode = !isFlagMode;
        if (isFlagMode) {
            toggleBtn.innerHTML = '当前模式: 🚩 标记 (点击切换为 🔍 翻开)';
            toggleBtn.style.backgroundColor = '#FF9800';
        } else {
            toggleBtn.innerHTML = '当前模式: 🔍 翻开 (点击切换为 🚩 标记)';
            toggleBtn.style.backgroundColor = '#2196F3';
        }
    });
}

// Start game initially
initGame();