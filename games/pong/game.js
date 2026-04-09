const canvas = document.getElementById("pongCanvas");
const ctx = canvas.getContext("2d");

// 挡板属性
const paddleWidth = 10;
const paddleHeight = 100;
const paddleSpeed = 8;

// 玩家（左侧）
const player = {
    x: 0,
    y: canvas.height / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    color: "#FFF",
    score: 0,
    dy: 0
};

// 简单 AI（右侧）
const ai = {
    x: canvas.width - paddleWidth,
    y: canvas.height / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    color: "#FFF",
    score: 0,
    speed: 4.5
};

// 球属性
const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 10,
    speed: 7,
    velocityX: 5,
    velocityY: 5,
    color: "#FFF"
};

// 按键状态跟踪
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    w: false,
    s: false,
    W: false,
    S: false
};

document.addEventListener("keydown", (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
    }
});

document.addEventListener("keyup", (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
    }
});

// Touch controls for mobile
canvas.addEventListener("touchmove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const touchY = e.touches[0].clientY - rect.top;
    
    // Scale touch coordinate to canvas internal resolution
    const scaleY = canvas.height / rect.height;
    const canvasY = touchY * scaleY;
    
    player.y = canvasY - player.height / 2;
    
    // Boundary check
    if (player.y < 0) player.y = 0;
    if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;
    
    e.preventDefault();
}, {passive: false});

// 绘图辅助函数
function drawRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
}

function drawArc(x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
}

function drawNet() {
    for (let i = 0; i <= canvas.height; i += 20) {
        drawRect(canvas.width / 2 - 1, i, 2, 10, "#FFF");
    }
}

function drawText(text, x, y) {
    ctx.fillStyle = "#FFF";
    ctx.font = "45px sans-serif";
    ctx.fillText(text, x, y);
}

function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.speed = 7;
    // 发球给刚才丢分的一方，方向取反
    ball.velocityX = -Math.sign(ball.velocityX) * 5;
    if (ball.velocityX === 0) ball.velocityX = 5;
    ball.velocityY = (Math.random() > 0.5 ? 1 : -1) * 5;
}

// 碰撞检测
function collision(b, p) {
    b.top = b.y - b.radius;
    b.bottom = b.y + b.radius;
    b.left = b.x - b.radius;
    b.right = b.x + b.radius;

    p.top = p.y;
    p.bottom = p.y + p.height;
    p.left = p.x;
    p.right = p.x + p.width;

    return p.left < b.right && p.top < b.bottom && p.right > b.left && p.bottom > b.top;
}

// 游戏逻辑更新
function update() {
    // 玩家移动逻辑
    if (keys.ArrowUp || keys.w || keys.W) {
        player.dy = -paddleSpeed;
    } else if (keys.ArrowDown || keys.s || keys.S) {
        player.dy = paddleSpeed;
    } else {
        player.dy = 0;
    }
    
    player.y += player.dy;
    
    // 玩家边界限制
    if (player.y < 0) player.y = 0;
    if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;

    // AI 移动逻辑（跟随球的 Y 坐标）
    let aiCenter = ai.y + ai.height / 2;
    // 加入死区（deadzone）防止 AI 剧烈抖动
    if (aiCenter < ball.y - 10) {
        ai.y += ai.speed;
    } else if (aiCenter > ball.y + 10) {
        ai.y -= ai.speed;
    }

    // AI 边界限制
    if (ai.y < 0) ai.y = 0;
    if (ai.y + ai.height > canvas.height) ai.y = canvas.height - ai.height;

    // 球移动
    ball.x += ball.velocityX;
    ball.y += ball.velocityY;

    // 球碰上下墙壁反弹
    if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
        ball.velocityY = -ball.velocityY;
    }

    // 计分系统
    if (ball.x - ball.radius < 0) {
        // AI 得分
        ai.score++;
        resetBall();
    } else if (ball.x + ball.radius > canvas.width) {
        // 玩家得分
        player.score++;
        resetBall();
    }

    // 检测当前该判断与哪个挡板发生碰撞
    let currentPaddle = (ball.x < canvas.width / 2) ? player : ai;

    if (collision(ball, currentPaddle)) {
        // 防止球卡在挡板内部，将球向外推移
        if (currentPaddle === player) {
            ball.x = player.x + player.width + ball.radius;
        } else {
            ball.x = ai.x - ball.radius;
        }

        // 计算击球点，相对于挡板中心的偏移
        let collidePoint = (ball.y - (currentPaddle.y + currentPaddle.height / 2));
        
        // 归一化偏移值（范围：-1 到 1）
        collidePoint = collidePoint / (currentPaddle.height / 2);

        // 计算反弹角度（最大 45 度，即 PI/4）
        let angleRad = (Math.PI / 4) * collidePoint;

        // 根据击球的挡板决定 X 方向（左边向右弹为 1，右边向左弹为 -1）
        let direction = (ball.x < canvas.width / 2) ? 1 : -1;
        
        // 基于法线角度更新速度矢量
        ball.velocityX = direction * ball.speed * Math.cos(angleRad);
        ball.velocityY = ball.speed * Math.sin(angleRad);

        // 每次击球稍微增加球速（最高限制在 15）
        if (ball.speed < 15) {
            ball.speed += 0.5;
        }
    }
}

// 渲染游戏画面
function render() {
    // 清除画布
    drawRect(0, 0, canvas.width, canvas.height, "#000");

    // 绘制中场网线
    drawNet();

    // 绘制比分
    drawText(player.score, canvas.width / 4, canvas.height / 5);
    drawText(ai.score, 3 * canvas.width / 4, canvas.height / 5);

    // 绘制挡板
    drawRect(player.x, player.y, player.width, player.height, player.color);
    drawRect(ai.x, ai.y, ai.width, ai.height, ai.color);

    // 绘制球
    drawArc(ball.x, ball.y, ball.radius, ball.color);
}

// 游戏主循环
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// 启动游戏
gameLoop();