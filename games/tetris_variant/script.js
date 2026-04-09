const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const holdCanvas = document.getElementById('hold-canvas');
const holdCtx = holdCanvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const HOLD_BLOCK_SIZE = 25;

let board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
let score = 0;
let lines = 0;
let level = 1;

let bag = [];
let nextQueue = [];
let holdPiece = null;
let canHold = true;
let currentPiece = null;

let gameOver = false;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let reqId = null;

const PIECES = {
    'I': { color: '#00FFFF', shapes: [
        [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
        [[0,0,1,0], [0,0,1,0], [0,0,1,0], [0,0,1,0]],
        [[0,0,0,0], [0,0,0,0], [1,1,1,1], [0,0,0,0]],
        [[0,1,0,0], [0,1,0,0], [0,1,0,0], [0,1,0,0]]
    ]},
    'J': { color: '#0000FF', shapes: [
        [[1,0,0], [1,1,1], [0,0,0]],
        [[0,1,1], [0,1,0], [0,1,0]],
        [[0,0,0], [1,1,1], [0,0,1]],
        [[0,1,0], [0,1,0], [1,1,0]]
    ]},
    'L': { color: '#FFA500', shapes: [
        [[0,0,1], [1,1,1], [0,0,0]],
        [[0,1,0], [0,1,0], [0,1,1]],
        [[0,0,0], [1,1,1], [1,0,0]],
        [[1,1,0], [0,1,0], [0,1,0]]
    ]},
    'O': { color: '#FFFF00', shapes: [
        [[1,1], [1,1]],
        [[1,1], [1,1]],
        [[1,1], [1,1]],
        [[1,1], [1,1]]
    ]},
    'S': { color: '#00FF00', shapes: [
        [[0,1,1], [1,1,0], [0,0,0]],
        [[0,1,0], [0,1,1], [0,0,1]],
        [[0,0,0], [0,1,1], [1,1,0]],
        [[1,0,0], [1,1,0], [0,1,0]]
    ]},
    'T': { color: '#800080', shapes: [
        [[0,1,0], [1,1,1], [0,0,0]],
        [[0,1,0], [0,1,1], [0,1,0]],
        [[0,0,0], [1,1,1], [0,1,0]],
        [[0,1,0], [1,1,0], [0,1,0]]
    ]},
    'Z': { color: '#FF0000', shapes: [
        [[1,1,0], [0,1,1], [0,0,0]],
        [[0,0,1], [0,1,1], [0,1,0]],
        [[0,0,0], [1,1,0], [0,1,1]],
        [[0,1,0], [1,1,0], [1,0,0]]
    ]}
};

const KICKS = {
    'JLSTZ': {
        '0-1': [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]],
        '1-0': [[0,0], [1,0], [1,1], [0,-2], [1,-2]],
        '1-2': [[0,0], [1,0], [1,1], [0,-2], [1,-2]],
        '2-1': [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]],
        '2-3': [[0,0], [1,0], [1,-1], [0,2], [1,2]],
        '3-2': [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
        '3-0': [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
        '0-3': [[0,0], [1,0], [1,-1], [0,2], [1,2]]
    },
    'I': {
        '0-1': [[0,0], [-2,0], [1,0], [-2,1], [1,-2]],
        '1-0': [[0,0], [2,0], [-1,0], [2,-1], [-1,2]],
        '1-2': [[0,0], [-1,0], [2,0], [-1,-2], [2,1]],
        '2-1': [[0,0], [1,0], [-2,0], [1,2], [-2,-1]],
        '2-3': [[0,0], [2,0], [-1,0], [2,-1], [-1,2]],
        '3-2': [[0,0], [-2,0], [1,0], [-2,1], [1,-2]],
        '3-0': [[0,0], [1,0], [-2,0], [1,2], [-2,-1]],
        '0-3': [[0,0], [-1,0], [2,0], [-1,-2], [2,1]]
    }
};

function fillQueue() {
    while (nextQueue.length < 5) {
        let newBag = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
        for (let i = newBag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newBag[i], newBag[j]] = [newBag[j], newBag[i]];
        }
        nextQueue.push(...newBag);
    }
}

function getNextPiece() {
    fillQueue();
    return nextQueue.shift();
}

function spawnPiece(type = null) {
    if (!type) {
        type = getNextPiece();
    }
    
    currentPiece = {
        type: type,
        state: 0,
        shape: PIECES[type].shapes[0],
        x: type === 'O' ? 4 : 3,
        y: type === 'I' ? -1 : 0
    };
    
    if (!isValid(currentPiece.shape, currentPiece.x, currentPiece.y)) {
        currentPiece.y--;
        if (!isValid(currentPiece.shape, currentPiece.x, currentPiece.y)) {
            gameOver = true;
            document.getElementById('game-over').style.display = 'flex';
        }
    }
    dropCounter = 0;
    drawNext();
    drawHold();
}

function hold() {
    if (!canHold) return;
    if (holdPiece === null) {
        holdPiece = currentPiece.type;
        spawnPiece();
    } else {
        let temp = currentPiece.type;
        spawnPiece(holdPiece);
        holdPiece = temp;
    }
    canHold = false;
    drawHold();
}

function isValid(shape, cx, cy) {
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c]) {
                let x = cx + c;
                let y = cy + r;
                if (x < 0 || x >= COLS || y >= ROWS) return false;
                if (y >= 0 && board[y][x]) return false;
            }
        }
    }
    return true;
}

function rotate(dir) { // 1 right, -1 left
    if (currentPiece.type === 'O') return;
    
    let nextState = (currentPiece.state + dir + 4) % 4;
    let shape = PIECES[currentPiece.type].shapes[nextState];
    let kickType = currentPiece.type === 'I' ? 'I' : 'JLSTZ';
    let kickKey = `${currentPiece.state}-${nextState}`;
    
    let kicks = KICKS[kickType][kickKey];
    
    for (let i = 0; i < kicks.length; i++) {
        let [dx, dy] = kicks[i];
        if (isValid(shape, currentPiece.x + dx, currentPiece.y + dy)) {
            currentPiece.x += dx;
            currentPiece.y += dy;
            currentPiece.state = nextState;
            currentPiece.shape = shape;
            return;
        }
    }
}

function move(dx) {
    if (isValid(currentPiece.shape, currentPiece.x + dx, currentPiece.y)) {
        currentPiece.x += dx;
    }
}

function softDrop() {
    if (isValid(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) {
        currentPiece.y++;
        dropCounter = 0;
        return true;
    }
    return false;
}

function hardDrop() {
    while (softDrop()) {}
    lockPiece();
}

function lockPiece() {
    for (let r = 0; r < currentPiece.shape.length; r++) {
        for (let c = 0; c < currentPiece.shape[r].length; c++) {
            if (currentPiece.shape[r][c]) {
                if (currentPiece.y + r < 0) {
                    gameOver = true;
                    document.getElementById('game-over').style.display = 'flex';
                    return;
                }
                board[currentPiece.y + r][currentPiece.x + c] = PIECES[currentPiece.type].color;
            }
        }
    }
    clearLines();
    spawnPiece();
    canHold = true;
}

function clearLines() {
    let linesCleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
        let isFull = true;
        for (let c = 0; c < COLS; c++) {
            if (!board[r][c]) {
                isFull = false;
                break;
            }
        }
        if (isFull) {
            board.splice(r, 1);
            board.unshift(Array(COLS).fill(0));
            linesCleared++;
            r++; // Check same row again
        }
    }
    
    if (linesCleared > 0) {
        lines += linesCleared;
        document.getElementById('lines').innerText = lines;
        
        let points = 0;
        if (linesCleared === 1) points = 100 * level;
        if (linesCleared === 2) points = 300 * level;
        if (linesCleared === 3) points = 500 * level;
        if (linesCleared === 4) points = 800 * level;
        score += points;
        document.getElementById('score').innerText = score;
        
        level = Math.floor(lines / 10) + 1;
        document.getElementById('level').innerText = level;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
    }
}

function drawBlock(context, x, y, size, color) {
    context.fillStyle = color;
    context.fillRect(x * size, y * size, size, size);
    context.strokeStyle = 'rgba(0,0,0,0.5)';
    context.strokeRect(x * size, y * size, size, size);
    
    // 3D effect
    context.fillStyle = 'rgba(255,255,255,0.3)';
    context.fillRect(x * size, y * size, size, size * 0.2);
    context.fillStyle = 'rgba(0,0,0,0.3)';
    context.fillRect(x * size, y * size + size * 0.8, size, size * 0.2);
    context.fillRect(x * size + size * 0.8, y * size, size * 0.2, size);
}

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines
    ctx.strokeStyle = '#222';
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            ctx.strokeRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        }
    }

    // Draw settled blocks
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c]) {
                drawBlock(ctx, c, r, BLOCK_SIZE, board[r][c]);
            }
        }
    }
}

function drawGhost() {
    if (!currentPiece) return;
    let ghostY = currentPiece.y;
    while (isValid(currentPiece.shape, currentPiece.x, ghostY + 1)) {
        ghostY++;
    }
    
    ctx.globalAlpha = 0.3;
    for (let r = 0; r < currentPiece.shape.length; r++) {
        for (let c = 0; c < currentPiece.shape[r].length; c++) {
            if (currentPiece.shape[r][c] && ghostY + r >= 0) {
                drawBlock(ctx, currentPiece.x + c, ghostY + r, BLOCK_SIZE, PIECES[currentPiece.type].color);
            }
        }
    }
    ctx.globalAlpha = 1.0;
}

function drawCurrent() {
    if (!currentPiece) return;
    for (let r = 0; r < currentPiece.shape.length; r++) {
        for (let c = 0; c < currentPiece.shape[r].length; c++) {
            if (currentPiece.shape[r][c] && currentPiece.y + r >= 0) {
                drawBlock(ctx, currentPiece.x + c, currentPiece.y + r, BLOCK_SIZE, PIECES[currentPiece.type].color);
            }
        }
    }
}

function drawMiniPiece(context, type, centerY) {
    if (!type) return;
    let shape = PIECES[type].shapes[0];
    let color = PIECES[type].color;
    
    let size = HOLD_BLOCK_SIZE;
    
    // Calculate bounding box
    let minC = shape[0].length, maxC = -1;
    let minR = shape.length, maxR = -1;
    
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c]) {
                if (c < minC) minC = c;
                if (c > maxC) maxC = c;
                if (r < minR) minR = r;
                if (r > maxR) maxR = r;
            }
        }
    }
    
    let width = (maxC - minC + 1) * size;
    let height = (maxR - minR + 1) * size;
    
    let startX = (context.canvas.width - width) / 2;
    let startY = centerY - height / 2;
    
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c]) {
                // c - minC and r - minR adjusts the piece to (0,0) of the bounding box
                drawBlock(context, (startX / size) + (c - minC), (startY / size) + (r - minR), size, color);
            }
        }
    }
}

function drawHold() {
    holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
    if (holdPiece) {
        drawMiniPiece(holdCtx, holdPiece, holdCanvas.height / 2);
    }
}

function drawNext() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    for (let i = 0; i < 5; i++) {
        if (nextQueue[i]) {
            drawMiniPiece(nextCtx, nextQueue[i], 40 + i * 80);
        }
    }
}

function draw() {
    drawBoard();
    drawGhost();
    drawCurrent();
}

function update(time = 0) {
    if (gameOver) return;
    
    let deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;
    
    if (dropCounter > dropInterval) {
        if (!softDrop()) {
            lockPiece();
        }
    }
    
    draw();
    reqId = requestAnimationFrame(update);
}

function resetGame() {
    board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
    score = 0;
    lines = 0;
    level = 1;
    document.getElementById('score').innerText = score;
    document.getElementById('lines').innerText = lines;
    document.getElementById('level').innerText = level;
    
    nextQueue = [];
    holdPiece = null;
    canHold = true;
    gameOver = false;
    document.getElementById('game-over').style.display = 'none';
    
    fillQueue();
    spawnPiece();
    lastTime = performance.now();
    
    if (reqId) cancelAnimationFrame(reqId);
    update(lastTime);
}

document.addEventListener('keydown', e => {
    if (gameOver) return;
    
    // Prevent default scrolling for game keys
    if(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
    }

    switch(e.code) {
        case 'ArrowLeft': move(-1); break;
        case 'ArrowRight': move(1); break;
        case 'ArrowDown': softDrop(); break;
        case 'Space': hardDrop(); break;
        case 'ArrowUp':
        case 'KeyX': rotate(1); break;
        case 'KeyZ': rotate(-1); break;
        case 'KeyC':
        case 'ShiftLeft':
        case 'ShiftRight': hold(); break;
    }
    draw();
});

// Start game
resetGame();