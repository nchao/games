const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const statusElement = document.getElementById('status');
const startBtn = document.getElementById('startBtn');

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let snake = [];
let dx = 0;
let dy = 0;

let food = { x: 0, y: 0 };
let obstacles = [];
let specialItem = null; // { x, y, type, timer }

let score = 0;
let gameLoop;
let baseSpeed = 150;
let currentSpeed = baseSpeed;
let isGameOver = false;
let isPlaying = false;
let changingDirection = false;

let effectTimeout = null;

const TYPES = {
    SPEED_UP: 'speed_up',
    SLOW_DOWN: 'slow_down'
};

function initGame() {
    snake = [
        { x: 10, y: 10 },
        { x: 10, y: 11 },
        { x: 10, y: 12 }
    ];
    dx = 0;
    dy = -1;
    score = 0;
    currentSpeed = baseSpeed;
    isGameOver = false;
    isPlaying = true;
    changingDirection = false;
    obstacles = [];
    specialItem = null;
    clearTimeout(effectTimeout);
    
    scoreElement.innerText = score;
    statusElement.innerText = '状态: 正常';
    statusElement.style.color = '#f1c40f';
    startBtn.innerText = '重新开始';

    // 生成随机障碍物
    for (let i = 0; i < 8; i++) {
        obstacles.push(getRandomEmptyPosition());
    }

    placeFood();
    
    if (gameLoop) clearTimeout(gameLoop);
    update();
}

function getRandomEmptyPosition() {
    let x, y;
    let empty = false;
    while (!empty) {
        x = Math.floor(Math.random() * tileCount);
        y = Math.floor(Math.random() * tileCount);
        empty = isPositionEmpty(x, y);
    }
    return { x, y };
}

function isPositionEmpty(x, y) {
    // 检查是否与蛇身重叠
    for (let segment of snake) {
        if (segment.x === x && segment.y === y) return false;
    }
    // 检查是否与障碍物重叠
    for (let obs of obstacles) {
        if (obs.x === x && obs.y === y) return false;
    }
    // 检查是否与食物重叠
    if (food && food.x === x && food.y === y) return false;
    // 检查是否与特殊道具重叠
    if (specialItem && specialItem.x === x && specialItem.y === y) return false;
    
    return true;
}

function placeFood() {
    food = getRandomEmptyPosition();
}

function spawnSpecialItem() {
    if (!specialItem && Math.random() < 0.15) { // 15% 的概率生成道具
        const pos = getRandomEmptyPosition();
        const type = Math.random() < 0.5 ? TYPES.SPEED_UP : TYPES.SLOW_DOWN;
        specialItem = { ...pos, type, timer: 40 }; // 存在40个步长
    }
}

function update() {
    if (isGameOver) return;

    changingDirection = false;

    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    // 穿墙机制 (Wrap around)
    if (head.x < 0) head.x = tileCount - 1;
    if (head.x >= tileCount) head.x = 0;
    if (head.y < 0) head.y = tileCount - 1;
    if (head.y >= tileCount) head.y = 0;

    // 碰撞检测：撞到自己
    for (let i = 0; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOver();
            return;
        }
    }

    // 碰撞检测：撞到障碍物
    for (let obs of obstacles) {
        if (head.x === obs.x && head.y === obs.y) {
            gameOver();
            return;
        }
    }

    snake.unshift(head);

    // 碰撞检测：吃到食物
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.innerText = score;
        placeFood();
        spawnSpecialItem();
    } else {
        snake.pop(); // 没吃到食物，尾部收缩
    }

    // 碰撞检测：吃到特殊道具
    if (specialItem && head.x === specialItem.x && head.y === specialItem.y) {
        applySpecialItem(specialItem.type);
        specialItem = null;
    }

    // 更新特殊道具生命周期
    if (specialItem) {
        specialItem.timer--;
        if (specialItem.timer <= 0) {
            specialItem = null;
        }
    } else {
        // 如果当前没有道具，偶尔随机生成
        if (Math.random() < 0.02) {
            spawnSpecialItem();
        }
    }

    draw();
    gameLoop = setTimeout(update, currentSpeed);
}

function applySpecialItem(type) {
    clearTimeout(effectTimeout);
    score += 20;
    scoreElement.innerText = score;

    if (type === TYPES.SPEED_UP) {
        currentSpeed = baseSpeed / 2;
        statusElement.innerText = '状态: ⚡ 加速中!';
        statusElement.style.color = '#3498db';
    } else if (type === TYPES.SLOW_DOWN) {
        currentSpeed = baseSpeed * 1.5;
        statusElement.innerText = '状态: 🐌 减速中!';
        statusElement.style.color = '#e67e22';
    }

    // 5秒后恢复原速
    effectTimeout = setTimeout(() => {
        currentSpeed = baseSpeed;
        statusElement.innerText = '状态: 正常';
        statusElement.style.color = '#f1c40f';
    }, 5000);
}

function gameOver() {
    isGameOver = true;
    isPlaying = false;
    statusElement.innerText = '游戏结束! 撞到障碍物或自己了。';
    statusElement.style.color = '#e74c3c';
}

function draw() {
    // 清空画布
    ctx.fillStyle = '#ecf0f1';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制障碍物
    ctx.fillStyle = '#2c3e50';
    for (let obs of obstacles) {
        ctx.fillRect(obs.x * gridSize, obs.y * gridSize, gridSize, gridSize);
    }

    // 绘制特殊道具
    if (specialItem) {
        if (specialItem.type === TYPES.SPEED_UP) {
            ctx.fillStyle = '#3498db'; // 蓝色
        } else {
            ctx.fillStyle = '#f1c40f'; // 黄色
        }
        ctx.beginPath();
        ctx.arc(specialItem.x * gridSize + gridSize / 2, specialItem.y * gridSize + gridSize / 2, gridSize / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // 绘制食物
    ctx.fillStyle = '#e74c3c'; // 红色
    ctx.beginPath();
    ctx.arc(food.x * gridSize + gridSize / 2, food.y * gridSize + gridSize / 2, gridSize / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    // 绘制蛇
    for (let i = 0; i < snake.length; i++) {
        // 蛇头颜色略深
        ctx.fillStyle = i === 0 ? '#27ae60' : '#2ecc71';
        ctx.fillRect(snake[i].x * gridSize, snake[i].y * gridSize, gridSize - 1, gridSize - 1);
    }
}

document.addEventListener('keydown', (e) => {
    if (!isPlaying || isGameOver || changingDirection) return;

    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (dy !== 1) { dx = 0; dy = -1; changingDirection = true; }
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            if (dy !== -1) { dx = 0; dy = 1; changingDirection = true; }
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            if (dx !== 1) { dx = -1; dy = 0; changingDirection = true; }
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            if (dx !== -1) { dx = 1; dy = 0; changingDirection = true; }
            break;
    }
});

startBtn.addEventListener('click', () => {
    initGame();
});

// 初始画面绘制
draw();