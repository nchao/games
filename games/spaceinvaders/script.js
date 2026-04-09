const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 游戏状态
let score = 0;
let gameOver = false;
let isWin = false;
let currentLevel = 1;
const MAX_LEVELS = 15;

// 玩家飞船设置
const player = {
    width: 50,
    height: 20,
    x: canvas.width / 2 - 25,
    y: canvas.height - 40,
    speed: 6,
    dx: 0,
    color: '#2ecc71'
};

// 子弹设置
const bullets = [];
const bulletSpeed = 8;
const bulletWidth = 4;
const bulletHeight = 15;

// 敌人设置
const enemies = [];
let enemyRowCount = 3;
let enemyColumnCount = 8;
const enemyWidth = 40;
const enemyHeight = 30;
const enemyPadding = 15;
const enemyOffsetTop = 60;
let enemyOffsetLeft = 0;

let enemyDirection = 1; // 1 为向右, -1 为向左
let enemySpeed = 1.5;
const enemyDropDistance = 20;

// 初始化敌人网格
function initEnemies() {
    enemyRowCount = Math.min(6, 2 + Math.floor(currentLevel / 3));
    enemyColumnCount = Math.min(12, 6 + Math.floor(currentLevel / 2));
    enemySpeed = 1.0 + (currentLevel * 0.3);
    
    enemyOffsetLeft = (canvas.width - (enemyColumnCount * (enemyWidth + enemyPadding) - enemyPadding)) / 2;

    for (let c = 0; c < enemyColumnCount; c++) {
        for (let r = 0; r < enemyRowCount; r++) {
            enemies.push({
                x: enemyOffsetLeft + c * (enemyWidth + enemyPadding),
                y: enemyOffsetTop + r * (enemyHeight + enemyPadding),
                width: enemyWidth,
                height: enemyHeight,
                status: 1, // 1 表示存活, 0 表示已被击毁
                color: r % 2 === 0 ? '#e74c3c' : '#9b59b6'
            });
        }
    }
}
initEnemies();

// 按键状态
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    Space: false
};

// 监听键盘按下
document.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft') keys.ArrowLeft = true;
    if (e.code === 'ArrowRight') keys.ArrowRight = true;
    if (e.code === 'Space') {
        if (!keys.Space && !gameOver && !isWin) {
            shoot();
        }
        keys.Space = true;
    }
    // 重新开始游戏
    if (e.code === 'Enter' && (gameOver || isWin)) {
        resetGame();
    }
});

// 监听键盘抬起
document.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft') keys.ArrowLeft = false;
    if (e.code === 'ArrowRight') keys.ArrowRight = false;
    if (e.code === 'Space') keys.Space = false;
});

// Mobile virtual buttons support
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    document.getElementById('mobile-controls').style.display = 'flex';
    document.getElementById('mobile-hint').style.display = 'block';

    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnShoot = document.getElementById('btn-shoot');

    btnLeft.addEventListener('touchstart', (e) => { keys.ArrowLeft = true; e.preventDefault(); });
    btnLeft.addEventListener('touchend', (e) => { keys.ArrowLeft = false; e.preventDefault(); });
    
    btnRight.addEventListener('touchstart', (e) => { keys.ArrowRight = true; e.preventDefault(); });
    btnRight.addEventListener('touchend', (e) => { keys.ArrowRight = false; e.preventDefault(); });

    btnShoot.addEventListener('touchstart', (e) => { 
        if (!gameOver && !isWin) shoot(); 
        if (gameOver || isWin) resetGame();
        e.preventDefault(); 
    });
}

// 射击功能
function shoot() {
    bullets.push({
        x: player.x + player.width / 2 - bulletWidth / 2,
        y: player.y,
        width: bulletWidth,
        height: bulletHeight,
        color: '#f1c40f'
    });
}

// 重新开始游戏
function resetGame(isNextLevel = false) {
    if (!isNextLevel) {
        score = 0;
        currentLevel = 1;
    }
    gameOver = false;
    isWin = false;
    player.x = canvas.width / 2 - player.width / 2;
    bullets.length = 0;
    enemies.length = 0;
    enemyDirection = 1;
    initEnemies();
}

// 更新游戏逻辑
function update() {
    if (gameOver || isWin) return;

    // 1. 移动玩家
    if (keys.ArrowLeft) player.dx = -player.speed;
    else if (keys.ArrowRight) player.dx = player.speed;
    else player.dx = 0;

    player.x += player.dx;

    // 玩家边界碰撞检测
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

    // 2. 移动子弹
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y -= bulletSpeed;
        // 移除超出屏幕的子弹
        if (bullets[i].y < 0) {
            bullets.splice(i, 1);
        }
    }

    // 3. 移动敌人
    let hitWall = false;
    let bottomMostEnemyY = 0;
    
    // 检查敌人是否触碰左右边界
    for (let i = 0; i < enemies.length; i++) {
        let e = enemies[i];
        if (e.status === 1) {
            e.x += enemySpeed * enemyDirection;
            if (e.x + e.width >= canvas.width - 10 || e.x <= 10) {
                hitWall = true;
            }
            if (e.y + e.height > bottomMostEnemyY) {
                bottomMostEnemyY = e.y + e.height;
            }
        }
    }

    // 如果碰到墙壁，全体下移并反向，同时略微增加速度
    if (hitWall) {
        enemyDirection *= -1;
        enemySpeed += 0.2; // 难度递增
        for (let i = 0; i < enemies.length; i++) {
            if (enemies[i].status === 1) {
                enemies[i].y += enemyDropDistance;
            }
        }
    }

    // 4. 碰撞检测
    // 子弹与敌人碰撞
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        let bulletHit = false;
        
        for (let j = 0; j < enemies.length; j++) {
            let e = enemies[j];
            if (e.status === 1) {
                // AABB 碰撞检测
                if (b.x < e.x + e.width &&
                    b.x + b.width > e.x &&
                    b.y < e.y + e.height &&
                    b.y + b.height > e.y) {
                    
                    e.status = 0; // 击毁敌人
                    bulletHit = true;
                    score += 10;
                    break;
                }
            }
        }
        if (bulletHit) {
            bullets.splice(i, 1); // 移除击中敌人的子弹
        }
    }

    // 检查是否胜利 (所有敌人都被击毁)
    const aliveEnemies = enemies.filter(e => e.status === 1).length;
    if (aliveEnemies === 0) {
        if (currentLevel < MAX_LEVELS) {
            currentLevel++;
            resetGame(true);
        } else {
            isWin = true;
        }
    }

    // 敌人与玩家碰撞，或敌人到达底部
    for (let j = 0; j < enemies.length; j++) {
        let e = enemies[j];
        if (e.status === 1) {
            // 碰到玩家
            if (e.x < player.x + player.width &&
                e.x + e.width > player.x &&
                e.y < player.y + player.height &&
                e.y + e.height > player.y) {
                gameOver = true;
            }
            // 到达底部
            if (e.y + e.height >= canvas.height) {
                gameOver = true;
            }
        }
    }
}

// 绘制图形
function draw() {
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制玩家飞船
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    // 飞船炮塔
    ctx.fillRect(player.x + player.width / 2 - 10, player.y - 10, 20, 10);
    ctx.fillRect(player.x + player.width / 2 - 3, player.y - 15, 6, 5);

    // 绘制子弹
    for (let i = 0; i < bullets.length; i++) {
        ctx.fillStyle = bullets[i].color;
        ctx.fillRect(bullets[i].x, bullets[i].y, bullets[i].width, bullets[i].height);
    }

    // 绘制敌人
    for (let i = 0; i < enemies.length; i++) {
        let e = enemies[i];
        if (e.status === 1) {
            ctx.fillStyle = e.color;
            ctx.fillRect(e.x, e.y, e.width, e.height);
            
            // 给敌人加点简单的装饰 (眼睛)
            ctx.fillStyle = '#000';
            ctx.fillRect(e.x + 8, e.y + 8, 6, 6);
            ctx.fillRect(e.x + e.width - 14, e.y + 8, 6, 6);
        }
    }

    // 绘制分数
    ctx.fillStyle = '#fff';
    ctx.font = '20px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`分数: ${score}`, 20, 30);
    ctx.textAlign = 'right';
    ctx.fillText(`第 ${currentLevel} 关 / 共 ${MAX_LEVELS} 关`, canvas.width - 20, 30);

    // 绘制游戏结束或胜利画面
    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 50px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
        
        ctx.fillStyle = '#fff';
        ctx.font = '20px "Segoe UI"';
        ctx.fillText('按 Enter 键重新开始', canvas.width / 2, canvas.height / 2 + 50);
    } else if (isWin) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#2ecc71';
        ctx.font = 'bold 50px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.fillText('YOU WIN!', canvas.width / 2, canvas.height / 2);
        
        ctx.fillStyle = '#fff';
        ctx.font = '20px "Segoe UI"';
        ctx.fillText(`最终得分: ${score}`, canvas.width / 2, canvas.height / 2 + 40);
        ctx.fillText('按 Enter 键重新开始', canvas.width / 2, canvas.height / 2 + 80);
    }
}

// 主游戏循环
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// 启动游戏
gameLoop();
