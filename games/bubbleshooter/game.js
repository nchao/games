const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

const BUBBLE_RADIUS = 20;
const MAX_COLS = 15;
const MAX_ROWS = 20; 
// Colors: Red, Blue, Green, Yellow, Purple, Orange
const COLORS = ['#FF4136', '#0074D9', '#2ECC40', '#FFDC00', '#B10DC9', '#FF851B'];

let grid = [];
let currentBubble = null;
let nextBubbleColor = null;
let score = 0;
let currentLevel = 1;
const MAX_LEVELS = 15;
let mouseX = canvas.width / 2;
let mouseY = 0;
let dropAnimations = [];
let animationId;

function init(isNextLevel = false) {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    // Initialize empty grid
    grid = Array(MAX_ROWS).fill(null).map(() => Array(MAX_COLS).fill(null));
    if (!isNextLevel) {
        score = 0;
        currentLevel = 1;
    }
    updateScore(0);
    dropAnimations = [];
    
    // Fill top rows based on level (starts at 3 rows, increases every 3 levels)
    const startRows = Math.min(8, 2 + Math.floor((currentLevel + 2) / 3));
    
    for (let r = 0; r < startRows; r++) {
        const maxCols = (r % 2 !== 0) ? MAX_COLS - 1 : MAX_COLS;
        for (let c = 0; c < maxCols; c++) {
            grid[r][c] = {
                color: getRandomColor()
            };
        }
    }
    
    nextBubbleColor = getRandomColor();
    spawnBubble();
    gameLoop();
}

function getRandomColor() {
    // Number of colors increases with level (max 6)
    const numColors = Math.min(COLORS.length, 3 + Math.floor(currentLevel / 4));
    const levelColors = COLORS.slice(0, numColors);
    return levelColors[Math.floor(Math.random() * levelColors.length)];
}

function spawnBubble() {
    currentBubble = {
        x: canvas.width / 2,
        y: canvas.height - BUBBLE_RADIUS - 20,
        color: nextBubbleColor,
        vx: 0,
        vy: 0,
        isFlying: false
    };
    nextBubbleColor = getRandomColor();
}

// Check if a cell is valid in the hexagonal grid
function isValidCell(r, c) {
    if (r < 0 || r >= MAX_ROWS) return false;
    const maxCols = (r % 2 !== 0) ? MAX_COLS - 1 : MAX_COLS;
    if (c < 0 || c >= maxCols) return false;
    return true;
}

// Get screen coordinates (center) of a grid cell
function getGridCenter(r, c) {
    const isOdd = r % 2 !== 0;
    // Each column is spaced by 2 * BUBBLE_RADIUS, odd rows shift right by BUBBLE_RADIUS
    const x = c * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS + (isOdd ? BUBBLE_RADIUS : 0);
    // Rows are spaced by BUBBLE_RADIUS * sqrt(3)
    const y = r * BUBBLE_RADIUS * Math.sqrt(3) + BUBBLE_RADIUS;
    return { x, y };
}

// Get adjacent cells in the hexagonal grid
function getNeighbors(r, c) {
    const isOdd = r % 2 !== 0;
    const neighbors = [
        [r, c - 1], [r, c + 1], // Left, Right
        [r - 1, isOdd ? c : c - 1], [r - 1, isOdd ? c + 1 : c], // Top-Left, Top-Right
        [r + 1, isOdd ? c : c - 1], [r + 1, isOdd ? c + 1 : c]  // Bottom-Left, Bottom-Right
    ];
    return neighbors.filter(([nr, nc]) => isValidCell(nr, nc));
}

// Mouse movement for aiming
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
});

// Touch movement for aiming
canvas.addEventListener('touchmove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
    mouseY = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    e.preventDefault();
}, {passive: false});

// Click to shoot
canvas.addEventListener('click', () => {
    if (currentBubble && !currentBubble.isFlying) {
        shootBubble();
    }
});

// Touch end to shoot
canvas.addEventListener('touchend', (e) => {
    if (currentBubble && !currentBubble.isFlying) {
        shootBubble();
    }
    e.preventDefault();
}, {passive: false});

function shootBubble() {
    const dx = mouseX - currentBubble.x;
    const dy = mouseY - currentBubble.y;
    const angle = Math.atan2(dy, dx);
    const speed = 15;
    
    // Prevent shooting downwards or perfectly horizontal
    if (angle > -0.1) return;
    
    currentBubble.vx = Math.cos(angle) * speed;
    currentBubble.vy = Math.sin(angle) * speed;
    currentBubble.isFlying = true;
}

function update() {
    // Handle dropping bubbles animation
    for (let i = dropAnimations.length - 1; i >= 0; i--) {
        const b = dropAnimations[i];
        b.vy += 0.5; // gravity
        b.y += b.vy;
        b.x += b.vx;
        if (b.y > canvas.height + BUBBLE_RADIUS) {
            dropAnimations.splice(i, 1);
        }
    }

    if (!currentBubble || !currentBubble.isFlying) return;

    // Move bubble
    currentBubble.x += currentBubble.vx;
    currentBubble.y += currentBubble.vy;

    // Bounce off side walls
    if (currentBubble.x - BUBBLE_RADIUS <= 0) {
        currentBubble.x = BUBBLE_RADIUS;
        currentBubble.vx *= -1;
    } else if (currentBubble.x + BUBBLE_RADIUS >= canvas.width) {
        currentBubble.x = canvas.width - BUBBLE_RADIUS;
        currentBubble.vx *= -1;
    }

    let collided = false;
    
    // Check top wall collision
    if (currentBubble.y - BUBBLE_RADIUS <= 0) {
        currentBubble.y = BUBBLE_RADIUS;
        collided = true;
    } else {
        // Check collision with other bubbles
        for (let r = 0; r < MAX_ROWS; r++) {
            const maxCols = (r % 2 !== 0) ? MAX_COLS - 1 : MAX_COLS;
            for (let c = 0; c < maxCols; c++) {
                if (grid[r][c]) {
                    const center = getGridCenter(r, c);
                    const dist = Math.hypot(currentBubble.x - center.x, currentBubble.y - center.y);
                    // Slight overlap allowance to prevent early snapping
                    if (dist < BUBBLE_RADIUS * 2 - 2) {
                        collided = true;
                        break;
                    }
                }
            }
            if (collided) break;
        }
    }

    if (collided) {
        snapBubble();
    }
}

function snapBubble() {
    let minR = -1, minC = -1, minDist = Infinity;
    
    // Find the nearest valid empty grid cell to the collision point
    for (let r = 0; r < MAX_ROWS; r++) {
        const maxCols = (r % 2 !== 0) ? MAX_COLS - 1 : MAX_COLS;
        for (let c = 0; c < maxCols; c++) {
            if (!grid[r][c]) {
                const center = getGridCenter(r, c);
                const dist = Math.hypot(currentBubble.x - center.x, currentBubble.y - center.y);
                if (dist < minDist) {
                    minDist = dist;
                    minR = r;
                    minC = c;
                }
            }
        }
    }

    if (minR !== -1 && minC !== -1) {
        grid[minR][minC] = { color: currentBubble.color };
        processMatches(minR, minC, currentBubble.color);
        
        // Game over check: bubbles reached bottom rows
        if (minR >= MAX_ROWS - 2) {
            setTimeout(() => {
                document.getElementById('final-score').textContent = score;
                document.getElementById('modal').style.display = 'flex';
            }, 100);
            return;
        }
    }
    
    spawnBubble();
}

function processMatches(r, c, color) {
    // 1. Find connected bubbles of the same color using Flood Fill / BFS
    const matchCluster = findMatches(r, c, color);
    
    if (matchCluster.length >= 3) {
        // Eliminate matched bubbles
        matchCluster.forEach(([mr, mc]) => {
            grid[mr][mc] = null;
            addDropAnimation(mr, mc, color);
        });
        updateScore(matchCluster.length * 10);
        
        // 2. Find hanging bubbles and drop them using Flood Fill / BFS
        const floating = findFloating();
        floating.forEach(([fr, fc]) => {
            const floatingColor = grid[fr][fc].color;
            grid[fr][fc] = null;
            addDropAnimation(fr, fc, floatingColor);
        });
        updateScore(floating.length * 20);
    }
    
    // Check level clear
    let hasBubbles = false;
    for (let r = 0; r < MAX_ROWS; r++) {
        const maxCols = (r % 2 !== 0) ? MAX_COLS - 1 : MAX_COLS;
        for (let c = 0; c < maxCols; c++) {
            if (grid[r][c]) {
                hasBubbles = true;
                break;
            }
        }
        if (hasBubbles) break;
    }
    
    if (!hasBubbles) {
        if (currentLevel < MAX_LEVELS) {
            currentLevel++;
            setTimeout(() => {
                init(true); // next level
            }, 1000);
        } else {
            setTimeout(() => {
                document.getElementById('final-score').textContent = score + " (通关！)";
                document.getElementById('modal').style.display = 'flex';
            }, 1000);
        }
    }
}

function addDropAnimation(r, c, color) {
    const center = getGridCenter(r, c);
    dropAnimations.push({
        x: center.x,
        y: center.y,
        color: color,
        vx: (Math.random() - 0.5) * 6, // random horizontal scatter
        vy: (Math.random() * -3) - 2    // slight jump up before falling
    });
}

// Flood Fill / BFS to find same-color cluster
function findMatches(startR, startC, color) {
    const visited = Array(MAX_ROWS).fill(0).map(() => Array(MAX_COLS).fill(false));
    const cluster = [];
    const queue = [[startR, startC]];
    visited[startR][startC] = true;

    while (queue.length > 0) {
        const [r, c] = queue.shift();
        cluster.push([r, c]);

        const neighbors = getNeighbors(r, c);
        for (const [nr, nc] of neighbors) {
            if (grid[nr][nc] && grid[nr][nc].color === color && !visited[nr][nc]) {
                visited[nr][nc] = true;
                queue.push([nr, nc]);
            }
        }
    }

    return cluster;
}

// BFS from the top row to find all anchored bubbles, then return the rest (floating)
function findFloating() {
    const visited = Array(MAX_ROWS).fill(0).map(() => Array(MAX_COLS).fill(false));
    const queue = [];
    
    // Add all bubbles in the top row (row 0) as anchors
    for (let c = 0; c < MAX_COLS; c++) {
        if (grid[0][c]) {
            queue.push([0, c]);
            visited[0][c] = true;
        }
    }
    
    // BFS to find all connected bubbles
    while (queue.length > 0) {
        const [r, c] = queue.shift();
        const neighbors = getNeighbors(r, c);
        for (const [nr, nc] of neighbors) {
            if (grid[nr][nc] && !visited[nr][nc]) {
                visited[nr][nc] = true;
                queue.push([nr, nc]);
            }
        }
    }
    
    // Collect bubbles that were not visited (not connected to top)
    const floating = [];
    for (let r = 0; r < MAX_ROWS; r++) {
        const maxCols = (r % 2 !== 0) ? MAX_COLS - 1 : MAX_COLS;
        for (let c = 0; c < maxCols; c++) {
            if (grid[r][c] && !visited[r][c]) {
                floating.push([r, c]);
            }
        }
    }
    
    return floating;
}

function updateScore(points) {
    score += points;
    scoreElement.textContent = score;
    const levelDisplay = document.getElementById('level-display');
    if (levelDisplay) levelDisplay.textContent = `第 ${currentLevel} 关`;
}

function drawBubble(x, y, color) {
    ctx.beginPath();
    ctx.arc(x, y, BUBBLE_RADIUS - 1, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    
    // Bubble highlight for 3D effect
    ctx.beginPath();
    ctx.arc(x - 6, y - 6, BUBBLE_RADIUS / 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fill();
    
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.stroke();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw bubbles in grid
    for (let r = 0; r < MAX_ROWS; r++) {
        const maxCols = (r % 2 !== 0) ? MAX_COLS - 1 : MAX_COLS;
        for (let c = 0; c < maxCols; c++) {
            if (grid[r][c]) {
                const center = getGridCenter(r, c);
                drawBubble(center.x, center.y, grid[r][c].color);
            }
        }
    }

    // Draw dropping animations
    for (const b of dropAnimations) {
        drawBubble(b.x, b.y, b.color);
    }

    // Draw aiming dashed line
    if (currentBubble && !currentBubble.isFlying) {
        const dx = mouseX - currentBubble.x;
        const dy = mouseY - currentBubble.y;
        const angle = Math.atan2(dy, dx);
        
        if (angle <= -0.1) {
            ctx.beginPath();
            ctx.moveTo(currentBubble.x, currentBubble.y);
            ctx.lineTo(currentBubble.x + Math.cos(angle) * 150, currentBubble.y + Math.sin(angle) * 150);
            ctx.strokeStyle = 'rgba(44, 62, 80, 0.4)';
            ctx.lineWidth = 4;
            ctx.setLineDash([8, 8]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    // Draw bottom bar separator
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 70);
    ctx.lineTo(canvas.width, canvas.height - 70);
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw "Next" indicator
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('下一个:', 20, canvas.height - 25);
    drawBubble(95, canvas.height - 30, nextBubbleColor);

    // Draw shooter base
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height - BUBBLE_RADIUS - 20, BUBBLE_RADIUS + 10, 0, Math.PI, true);
    ctx.fillStyle = '#95a5a6';
    ctx.fill();
    ctx.closePath();

    // Draw current bubble in shooter
    if (currentBubble) {
        drawBubble(currentBubble.x, currentBubble.y, currentBubble.color);
    }
}

function gameLoop() {
    update();
    draw();
    animationId = requestAnimationFrame(gameLoop);
}

document.getElementById('modal-restart-btn').addEventListener('click', () => {
    document.getElementById('modal').style.display = 'none';
    init();
});

// Start game
init();
