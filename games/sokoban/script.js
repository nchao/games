const LEVELS = [
    [
        "#####",
        "#@$.#",
        "#####"
    ],
    [
        "  ####",
        "###  #",
        "#    #",
        "# .#$###",
        "###@   #",
        "  #  $ #",
        "  #  . #",
        "  ######"
    ],
    [
        "  #####",
        "###   #",
        "# . # #",
        "# #$$.#",
        "#   @ #",
        "#######"
    ],
    [
        "  ####",
        "###  ####",
        "#     $ #",
        "# #  #$ #",
        "# . .#@ #",
        "#########"
    ]
];

const TILE = {
    WALL: '#',
    FLOOR: ' ',
    TARGET: '.',
    BOX: '$',
    PLAYER: '@',
    BOX_ON_TARGET: '*',
    PLAYER_ON_TARGET: '+'
};

let currentLevelIndex = 0;
let grid = [];
let playerPos = { x: 0, y: 0 };
let undoStack = [];
let isLevelComplete = false;

const boardEl = document.getElementById('board');
const levelNumEl = document.getElementById('level-num');
const messageEl = document.getElementById('message');
const btnUndo = document.getElementById('btn-undo');
const btnReset = document.getElementById('btn-reset');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');

function initGame() {
    loadLevel(0);
}

function loadLevel(index) {
    currentLevelIndex = index;
    const levelStr = LEVELS[index];
    grid = [];
    undoStack = [];
    isLevelComplete = false;
    messageEl.textContent = '';

    let maxWidth = 0;
    for (let y = 0; y < levelStr.length; y++) {
        const row = levelStr[y].split('');
        if (row.length > maxWidth) maxWidth = row.length;
        grid.push(row);
        for (let x = 0; x < row.length; x++) {
            if (row[x] === TILE.PLAYER || row[x] === TILE.PLAYER_ON_TARGET) {
                playerPos = { x, y };
            }
        }
    }

    // Pad rows with spaces (floors/empty space) to maxWidth
    for (let y = 0; y < grid.length; y++) {
        while (grid[y].length < maxWidth) {
            grid[y].push(' '); // Assuming space outside map is empty/floor
        }
    }

    boardEl.style.gridTemplateColumns = `repeat(${maxWidth}, 40px)`;
    boardEl.style.gridTemplateRows = `repeat(${grid.length}, 40px)`;
    levelNumEl.textContent = currentLevelIndex + 1;
    
    updateButtons();
    render();
}

function render() {
    boardEl.innerHTML = '';
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            
            const tile = grid[y][x];
            
            // Render specific tiles
            if (tile === TILE.WALL) {
                cell.classList.add('wall');
            } else if (tile === TILE.FLOOR || tile === ' ') {
                cell.classList.add('floor');
            } else if (tile === TILE.TARGET) {
                cell.classList.add('target');
            } else if (tile === TILE.BOX) {
                cell.classList.add('floor', 'box');
            } else if (tile === TILE.BOX_ON_TARGET) {
                cell.classList.add('target', 'box-on-target');
            } else if (tile === TILE.PLAYER) {
                cell.classList.add('floor', 'player');
            } else if (tile === TILE.PLAYER_ON_TARGET) {
                cell.classList.add('target', 'player-on-target');
            }
            
            boardEl.appendChild(cell);
        }
    }
}

function getTile(x, y) {
    if (y < 0 || y >= grid.length || x < 0 || x >= grid[y].length) return TILE.WALL;
    return grid[y][x];
}

function setTile(x, y, tile) {
    grid[y][x] = tile;
}

function isWalkable(x, y) {
    const t = getTile(x, y);
    return t === TILE.FLOOR || t === TILE.TARGET || t === ' ';
}

function isBox(x, y) {
    const t = getTile(x, y);
    return t === TILE.BOX || t === TILE.BOX_ON_TARGET;
}

function move(dx, dy) {
    if (isLevelComplete) return;

    const nx = playerPos.x + dx;
    const ny = playerPos.y + dy;
    
    const targetTile = getTile(nx, ny);
    
    if (targetTile === TILE.WALL) return;

    let moved = false;

    // Save state for undo
    const state = {
        grid: grid.map(row => [...row]),
        playerPos: { ...playerPos }
    };

    if (isWalkable(nx, ny)) {
        // Just move the player
        updatePlayerPos(nx, ny);
        moved = true;
    } else if (isBox(nx, ny)) {
        // Try to push the box
        const nnx = nx + dx;
        const nny = ny + dy;
        
        if (isWalkable(nnx, nny)) {
            // Move box
            const boxCurrentTile = getTile(nx, ny);
            const boxNextTile = getTile(nnx, nny);
            
            setTile(nx, ny, boxCurrentTile === TILE.BOX_ON_TARGET ? TILE.TARGET : TILE.FLOOR);
            setTile(nnx, nny, boxNextTile === TILE.TARGET ? TILE.BOX_ON_TARGET : TILE.BOX);
            
            // Move player
            updatePlayerPos(nx, ny);
            
            moved = true;
        }
    }

    if (moved) {
        undoStack.push(state);
        render();
        updateButtons();
        checkWin();
    }
}

function updatePlayerPos(nx, ny) {
    const playerCurrentTile = getTile(playerPos.x, playerPos.y);
    setTile(playerPos.x, playerPos.y, playerCurrentTile === TILE.PLAYER_ON_TARGET ? TILE.TARGET : TILE.FLOOR);
    
    const playerNextTile = getTile(nx, ny);
    setTile(nx, ny, playerNextTile === TILE.TARGET ? TILE.PLAYER_ON_TARGET : TILE.PLAYER);
    
    playerPos = { x: nx, y: ny };
}

function undo() {
    if (undoStack.length === 0 || isLevelComplete) return;
    const state = undoStack.pop();
    grid = state.grid.map(row => [...row]);
    playerPos = { ...state.playerPos };
    render();
    updateButtons();
}

function checkWin() {
    let won = true;
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            if (grid[y][x] === TILE.BOX) {
                won = false;
                break;
            }
        }
    }
    
    if (won) {
        isLevelComplete = true;
        messageEl.textContent = '🎉 恭喜通关！ 🎉';
        updateButtons();
    }
}

function updateButtons() {
    btnUndo.disabled = undoStack.length === 0 || isLevelComplete;
    btnPrev.disabled = currentLevelIndex === 0;
    btnNext.disabled = currentLevelIndex === LEVELS.length - 1;
}

window.addEventListener('keydown', (e) => {
    // Prevent default scrolling for arrow keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
    }

    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            move(0, -1);
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            move(0, 1);
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            move(-1, 0);
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            move(1, 0);
            break;
        case 'z':
        case 'Z':
            if (e.ctrlKey || e.metaKey) undo();
            break;
    }
});

btnUndo.addEventListener('click', undo);
btnReset.addEventListener('click', () => loadLevel(currentLevelIndex));
btnPrev.addEventListener('click', () => {
    if (currentLevelIndex > 0) loadLevel(currentLevelIndex - 1);
});
btnNext.addEventListener('click', () => {
    if (currentLevelIndex < LEVELS.length - 1) loadLevel(currentLevelIndex + 1);
});

// Initialize game on load
window.onload = initGame;