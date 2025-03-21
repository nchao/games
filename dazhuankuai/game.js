// 获取Canvas元素和上下文
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const modal = document.getElementById('modal');
const restartBtn = document.getElementById('restart-btn');

// 控制变量
let rightPressed = false;
let leftPressed = false;
let mouseX = 0;
let soundEnabled = false; // 音乐开关，默认关闭

// 游戏状态变量
let gameRunning = false;
let gamePaused = false;
let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
let level = 1;
let combo = 0;
let lastBrickHitTime = 0;
let backgroundHue = 0;

// 游戏对象
let paddle = {
    x: canvas.width / 2 - 60,
    y: canvas.height - 30,
    width: 120,
    height: 15,
    dx: 8,
    originalWidth: 120,
    shrinkTimer: 0,
    extendTimer: 0
};

let balls = [];
let particles = [];
let comboTexts = [];
let bricks = [];
let ballTrails = [];

// 砖块类型和颜色
const BRICK_TYPES = {
    NORMAL: 0,
    SPEED: 1,  // 黄色砖块：击碎后小球速度+10%
    SHRINK: 2, // 蓝色砖块：使挡板宽度临时缩短20%
    SPLIT: 3,  // 红色砖块：分裂为2个小球
    RAINBOW: 4, // 彩虹砖块：击碎后清除周围两层砖块
    EXTEND: 5  // 绿色砖块：使挡板宽度临时增加20%
};

// 声音系统
const sounds = {
    background: new Howl({
        src: ['https://assets.codepen.io/21542/howler-demo-bg-music.mp3'],
        loop: true,
        volume: 0.5
    }),
    paddle: new Howl({
        src: ['https://assets.codepen.io/21542/howler-demo-bg-music.mp3'],
        volume: 0.3
    }),
    brick: new Howl({
        src: ['https://assets.codepen.io/21542/howler-demo-shot.mp3'],
        volume: 0.3
    }),
    wall: new Howl({
        src: ['https://assets.codepen.io/21542/howler-demo-shot.mp3'],
        volume: 0.2
    }),
    gameOver: new Howl({
        src: ['https://assets.codepen.io/21542/howler-demo-music.mp3'],
        volume: 0.5
    })
};

// 播放声音的辅助函数
function playSound(sound) {
    if (soundEnabled) {
        sound.play();
    }
}

// 初始化游戏
function init() {
    // 重置游戏状态
    gameRunning = true;
    gamePaused = false;
    score = 0;
    level = 1;
    combo = 0;
    lastBrickHitTime = 0;
    backgroundHue = 0;
    
    // 重置挡板
    paddle = {
        x: canvas.width / 2 - 60,
        y: canvas.height - 30,
        width: 120,
        height: 15,
        dx: 8,
        originalWidth: 120,
        shrinkTimer: 0,
        extendTimer: 0
    };
    
    // 创建初始小球
    balls = [{
        x: canvas.width / 2,
        y: paddle.y - 10,
        radius: 8,
        dx: 4,
        dy: -4,
        speed: Math.sqrt(4*4 + 4*4),
        trail: []
    }];
    
    // 清空其他数组
    particles = [];
    comboTexts = [];
    ballTrails = [];
    
    // 创建砖块
    createBricks();
    
    // 隐藏模态框
    modal.style.display = 'none';
    
    // 播放背景音乐
    playSound(sounds.background);
    
    // 开始游戏循环
    requestAnimationFrame(gameLoop);
}

// 创建砖块
function createBricks() {
    bricks = [];
    
    // 根据关卡调整砖块数量
    const rows = level === 1 ? 6 : 8; // 增加一层砖块
    const cols = level === 1 ? 10 : 12;
    
    const brickWidth = (canvas.width - (cols + 1) * 5) / cols;
    const brickHeight = 25;
    
    // 计算总砖块数量
    const totalBricks = rows * cols;
    // 计算需要留出的空隙数量（约10%）
    const gapsCount = Math.round(totalBricks * 0.1);
    
    // 创建一个包含所有砖块位置的数组
    const positions = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            positions.push({row: r, col: c});
        }
    }
    
    // 随机选择要留出空隙的位置
    const gapPositions = [];
    for (let i = 0; i < gapsCount; i++) {
        if (positions.length > 0) {
            const randomIndex = Math.floor(Math.random() * positions.length);
            gapPositions.push(positions[randomIndex]);
            positions.splice(randomIndex, 1);
        }
    }
    
    // 初始化砖块数组
    for (let r = 0; r < rows; r++) {
        bricks[r] = [];
        for (let c = 0; c < cols; c++) {
            // 检查当前位置是否是空隙
            const isGap = gapPositions.some(pos => pos.row === r && pos.col === c);
            
            // 如果是空隙，则设置status为0
            if (isGap) {
                // 计算砖块位置
                const brickX = (c * (brickWidth + 5)) + 5;
                const brickY = (r * (brickHeight + 5)) + 40;
                
                // 创建空隙砖块对象（status为0表示不存在）
                bricks[r][c] = {
                    x: brickX,
                    y: brickY,
                    width: brickWidth,
                    height: brickHeight,
                    status: 0, // 0表示被击碎或不存在
                    type: BRICK_TYPES.NORMAL,
                    hue: r * 30 + 180,
                    scale: 1,
                    rainbowHue: 0
                };
            } else {
                // 随机确定砖块类型
                let type = BRICK_TYPES.NORMAL;
                const rand = Math.random();
                
                if (rand < 0.05) {
                    type = BRICK_TYPES.RAINBOW; // 5%概率为彩虹方块
                } else if (rand < 0.25) {
                    type = BRICK_TYPES.SPLIT; // 20%概率为红色分裂砖块
                } else if (rand < 0.40) {
                    type = BRICK_TYPES.SHRINK; // 15%概率为蓝色收缩砖块
                } else if (rand < 0.60) {
                    type = BRICK_TYPES.SPEED; // 20%概率为黄色加速砖块
                } else if (rand < 0.75) {
                    type = BRICK_TYPES.EXTEND; // 15%概率为绿色加长砖块
                }
                
                // 计算砖块位置
                const brickX = (c * (brickWidth + 5)) + 5;
                const brickY = (r * (brickHeight + 5)) + 40;
                
                // 创建砖块对象
                bricks[r][c] = {
                    x: brickX,
                    y: brickY,
                    width: brickWidth,
                    height: brickHeight,
                    status: 1, // 1表示存在，0表示被击碎
                    type: type,
                    hue: r * 30 + 180, // 每行不同HSL色相值
                    scale: 1, // 用于震动效果
                    rainbowHue: 0 // 用于彩虹方块的颜色变化
                };
            }
        }
    }
}

// 绘制背景
function drawBackground() {
    // 创建渐变背景
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `hsl(${backgroundHue}, 70%, 10%)`);
    gradient.addColorStop(1, `hsl(${backgroundHue + 60}, 70%, 5%)`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 更新背景色相值
    backgroundHue = (backgroundHue + 0.5) % 360;
}

// 绘制圆角矩形的辅助函数
function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
}

// 绘制挡板
function drawPaddle() {
    // 绘制挡板
    ctx.fillStyle = '#4488ff';
    drawRoundedRect(ctx, paddle.x, paddle.y, paddle.width, paddle.height, 7);
    
    // 绘制挡板长度进度条
    const progressWidth = (paddle.width / paddle.originalWidth) * 100;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(canvas.width / 2 - 50, canvas.height - 10, 100, 5);
    ctx.fillStyle = '#44ff44';
    ctx.fillRect(canvas.width / 2 - 50, canvas.height - 10, progressWidth, 5);
}

// 绘制小球
function drawBalls() {
    // 先绘制拖尾效果
    for (let i = 0; i < balls.length; i++) {
        const ball = balls[i];
        
        // 更新拖尾数组
        ball.trail.push({x: ball.x, y: ball.y});
        if (ball.trail.length > 5) {
            ball.trail.shift();
        }
        
        // 绘制拖尾
        for (let j = 0; j < ball.trail.length; j++) {
            const alpha = j / ball.trail.length * 0.5;
            ctx.beginPath();
            ctx.arc(ball.trail[j].x, ball.trail[j].y, ball.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fill();
            ctx.closePath();
        }
    }
    
    // 绘制小球
    for (let i = 0; i < balls.length; i++) {
        ctx.beginPath();
        ctx.arc(balls[i].x, balls[i].y, balls[i].radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.closePath();
    }
}

// 绘制砖块
function drawBricks() {
    for (let r = 0; r < bricks.length; r++) {
        for (let c = 0; c < bricks[r].length; c++) {
            const brick = bricks[r][c];
            
            if (brick.status === 1) {
                // 应用缩放效果
                const scaledWidth = brick.width * brick.scale;
                const scaledHeight = brick.height * brick.scale;
                const offsetX = (brick.width - scaledWidth) / 2;
                const offsetY = (brick.height - scaledHeight) / 2;
                
                // 根据砖块类型设置颜色
                if (brick.type === BRICK_TYPES.RAINBOW) {
                    // 彩虹方块使用渐变色
                    brick.rainbowHue = (brick.rainbowHue + 2) % 360; // 颜色循环变化
                    const gradient = ctx.createLinearGradient(
                        brick.x + offsetX, 
                        brick.y + offsetY, 
                        brick.x + offsetX + scaledWidth, 
                        brick.y + offsetY + scaledHeight
                    );
                    
                    // 添加彩虹色渐变
                    gradient.addColorStop(0, `hsl(${brick.rainbowHue}, 100%, 50%)`);
                    gradient.addColorStop(0.2, `hsl(${(brick.rainbowHue + 72) % 360}, 100%, 50%)`);
                    gradient.addColorStop(0.4, `hsl(${(brick.rainbowHue + 144) % 360}, 100%, 50%)`);
                    gradient.addColorStop(0.6, `hsl(${(brick.rainbowHue + 216) % 360}, 100%, 50%)`);
                    gradient.addColorStop(0.8, `hsl(${(brick.rainbowHue + 288) % 360}, 100%, 50%)`);
                    gradient.addColorStop(1, `hsl(${brick.rainbowHue}, 100%, 50%)`);
                    
                    ctx.fillStyle = gradient;
                } else {
                    // 其他类型砖块使用固定颜色
                    let color;
                    switch(brick.type) {
                        case BRICK_TYPES.SPEED:
                            color = `hsl(60, 100%, 50%)`; // 黄色
                            break;
                        case BRICK_TYPES.SHRINK:
                            color = `hsl(210, 100%, 50%)`; // 蓝色
                            break;
                        case BRICK_TYPES.SPLIT:
                            color = `hsl(0, 100%, 50%)`; // 红色
                            break;
                        case BRICK_TYPES.EXTEND:
                            color = `hsl(120, 100%, 50%)`; // 绿色
                            break;
                        default:
                            color = `hsl(180, 100%, 50%)`; // 普通砖块使用青色
                    }
                    ctx.fillStyle = color;
                }
                
                drawRoundedRect(
                    ctx,
                    brick.x + offsetX, 
                    brick.y + offsetY, 
                    scaledWidth, 
                    scaledHeight, 
                    5
                );
                
                // 砖块震动效果恢复
                if (brick.scale > 1) {
                    brick.scale -= 0.01;
                    if (brick.scale < 1) brick.scale = 1;
                }
            }
        }
    }
}

// 绘制粒子
function drawParticles() {
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        // 更新粒子位置和透明度
        p.x += p.dx;
        p.y += p.dy;
        p.alpha -= 0.02;
        
        // 绘制粒子
        if (p.alpha > 0) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.alpha})`;
            ctx.fill();
            ctx.closePath();
        }
    }
    
    // 移除透明度为0的粒子
    particles = particles.filter(p => p.alpha > 0);
}

// 绘制连击文本
function drawComboTexts() {
    for (let i = 0; i < comboTexts.length; i++) {
        const text = comboTexts[i];
        
        // 更新文本位置和透明度
        text.y -= 1;
        text.alpha -= 0.02;
        text.scale += 0.03;
        
        // 绘制文本
        if (text.alpha > 0) {
            ctx.font = `${20 * text.scale}px Arial`;
            ctx.fillStyle = `rgba(255, 255, 255, ${text.alpha})`;
            ctx.strokeStyle = `rgba(0, 0, 0, ${text.alpha})`;
            ctx.lineWidth = 1;
            ctx.textAlign = 'center';
            ctx.fillText(text.value, text.x, text.y);
            ctx.strokeText(text.value, text.x, text.y);
        }
    }
    
    // 移除透明度为0的文本
    comboTexts = comboTexts.filter(t => t.alpha > 0);
}

// 绘制分数
function drawScore() {
    // 绘制分数
    ctx.font = '24px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.textAlign = 'left';
    ctx.fillText(`分数: ${score}`, 20, 30);
    ctx.strokeText(`分数: ${score}`, 20, 30);
    
    // 绘制最高分
    ctx.textAlign = 'right';
    ctx.fillText(`最高分: ${highScore}`, canvas.width - 20, 30);
    ctx.strokeText(`最高分: ${highScore}`, canvas.width - 20, 30);
    
    // 绘制连击倍数
    if (combo > 1) {
        ctx.textAlign = 'center';
        ctx.font = '20px Arial';
        ctx.fillStyle = `hsl(${combo * 30}, 100%, 50%)`;
        ctx.fillText(`连击 x${combo.toFixed(1)}`, canvas.width - 80, 60);
        ctx.strokeText(`连击 x${combo.toFixed(1)}`, canvas.width - 80, 60);
        
        // 绘制连击气泡图标
        ctx.beginPath();
        ctx.arc(canvas.width - 130, 55, 15, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${combo * 30}, 100%, 50%)`;
        ctx.fill();
        ctx.closePath();
    }
}

// 移动挡板
function movePaddle() {
    // 处理挡板收缩计时器
    if (paddle.shrinkTimer > 0) {
        paddle.shrinkTimer--;
        if (paddle.shrinkTimer === 0) {
            // 恢复挡板原始宽度
            paddle.width = paddle.originalWidth;
        }
    }
    
    // 处理挡板加长计时器
    if (paddle.extendTimer > 0) {
        paddle.extendTimer--;
        if (paddle.extendTimer === 0) {
            paddle.width = paddle.originalWidth;
        }
    }
    
    // 限制挡板在画布范围内
    if (paddle.x < 0) {
        paddle.x = 0;
    } else if (paddle.x + paddle.width > canvas.width) {
        paddle.x = canvas.width - paddle.width;
    }
}

// 移动小球
function moveBalls() {
    for (let i = 0; i < balls.length; i++) {
        const ball = balls[i];
        
        // 更新小球位置
        ball.x += ball.dx;
        ball.y += ball.dy;
        
        // 检测墙壁碰撞
        // 左右墙壁
        if (ball.x - ball.radius < 0 || ball.x + ball.radius > canvas.width) {
            ball.dx = -ball.dx;
            playSound(sounds.wall);
            
            // 添加碰撞粒子效果
            createParticles(ball.x, ball.y, 5, 255, 255, 255);
        }
        
        // 上墙壁
        if (ball.y - ball.radius < 0) {
            ball.dy = -ball.dy;
            playSound(sounds.wall);
            
            // 添加碰撞粒子效果
            createParticles(ball.x, ball.y, 5, 255, 255, 255);
        }
        
        // 检测挡板碰撞
        if (ball.y + ball.radius > paddle.y && 
            ball.y - ball.radius < paddle.y + paddle.height && 
            ball.x > paddle.x && 
            ball.x < paddle.x + paddle.width) {
            
            // 计算碰撞点相对于挡板中心的位置（-0.5到0.5之间）
            const hitPos = (ball.x - (paddle.x + paddle.width / 2)) / paddle.width;
            
            // 根据碰撞位置调整反弹角度（-60度到60度）
            const angle = hitPos * Math.PI / 3;
            
            // 设置新的速度方向，保持速度大小不变
            ball.dx = ball.speed * Math.sin(angle);
            ball.dy = -ball.speed * Math.cos(angle);
            
            // 播放碰撞音效
            playSound(sounds.paddle);
            
            // 添加碰撞粒子效果
            createParticles(ball.x, ball.y, 10, 100, 200, 255);
        }
        
        // 检测底部出界
        if (ball.y + ball.radius > canvas.height) {
            // 移除出界的小球
            balls.splice(i, 1);
            i--;
            
            // 添加爆炸粒子效果
            createParticles(ball.x, ball.y, 20, 255, 100, 100);
            
            // 如果没有小球了，游戏结束
            if (balls.length === 0) {
                gameOver();
            }
        }
        
        // 检测砖块碰撞
        checkBrickCollision(ball);
    }
}

// 检测砖块碰撞
function checkBrickCollision(ball) {
    for (let r = 0; r < bricks.length; r++) {
        for (let c = 0; c < bricks[r].length; c++) {
            const brick = bricks[r][c];
            
            if (brick.status === 1) {
                // 检测小球与砖块的碰撞
                if (ball.x + ball.radius > brick.x && 
                    ball.x - ball.radius < brick.x + brick.width && 
                    ball.y + ball.radius > brick.y && 
                    ball.y - ball.radius < brick.y + brick.height) {
                    
                    // 确定碰撞方向并反弹
                    // 计算小球中心到砖块各边的距离
                    const distX = Math.abs(ball.x - (brick.x + brick.width / 2));
                    const distY = Math.abs(ball.y - (brick.y + brick.height / 2));
                    
                    // 如果X方向距离更大，则是左右碰撞
                    if (distX / brick.width > distY / brick.height) {
                        ball.dx = -ball.dx;
                    } else {
                        ball.dy = -ball.dy;
                    }
                    
                    // 标记砖块为已击碎
                    brick.status = 0;
                    
                    // 增加分数
                    updateScore();
                    
                    // 应用砖块特殊效果
                    applyBrickEffect(brick, ball);
                    
                    // 播放碰撞音效
                    playSound(sounds.brick);
                    
                    // 添加砖块爆炸粒子效果
                    // 根据砖块类型设置不同颜色
                    let r, g, b;
                    switch(brick.type) {
                        case BRICK_TYPES.SPEED:
                            r = 255; g = 255; b = 0; // 黄色
                            break;
                        case BRICK_TYPES.SHRINK:
                            r = 0; g = 100; b = 255; // 蓝色
                            break;
                        case BRICK_TYPES.SPLIT:
                            r = 255; g = 0; b = 0; // 红色
                            break;
                        case BRICK_TYPES.RAINBOW:
                            r = 255; g = 255; b = 255; // 白色
                            break;
                        default:
                            // 普通砖块使用蓝色
                            r = 0; g = 100; b = 255; // 蓝色
                    }
                    createParticles(brick.x + brick.width/2, brick.y + brick.height/2, 15, r, g, b);
                    
                    // 检查是否所有砖块都被击碎
                    checkLevelComplete();
                    
                    // 由于已经发生碰撞，不需要检查其他砖块
                    return;
                }
            }
        }
    }
}

// HSL转RGB辅助函数
function hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
        r = g = b = l; // 灰色
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// 应用砖块特殊效果
function applyBrickEffect(brick, ball) {
    switch(brick.type) {
        case BRICK_TYPES.SPEED:
            // 增加小球速度10%
            ball.speed *= 1.1;
            ball.dx = (ball.dx / Math.abs(ball.dx)) * ball.speed * Math.sin(Math.atan2(ball.dy, ball.dx));
            ball.dy = (ball.dy / Math.abs(ball.dy)) * ball.speed * Math.cos(Math.atan2(ball.dy, ball.dx));
            
            // 添加速度提升文本效果
            comboTexts.push({
                value: "速度+10%",
                x: brick.x + brick.width / 2,
                y: brick.y,
                alpha: 1,
                scale: 1
            });
            break;
            
        case BRICK_TYPES.SHRINK:
            // 缩小挡板宽度20%，持续5秒
            paddle.width = paddle.originalWidth * 0.8;
            paddle.shrinkTimer = 300; // 60fps * 5秒
            
            // 添加挡板缩小文本效果
            comboTexts.push({
                value: "挡板缩小!",
                x: brick.x + brick.width / 2,
                y: brick.y,
                alpha: 1,
                scale: 1
            });
            break;
            
        case BRICK_TYPES.SPLIT:
            // 分裂小球
            // 创建一个新的小球，方向与原小球相反
            balls.push({
                x: ball.x,
                y: ball.y,
                radius: ball.radius,
                dx: -ball.dx,
                dy: ball.dy,
                speed: ball.speed,
                trail: []
            });
            
            // 添加分裂文本效果
            comboTexts.push({
                value: "小球分裂!",
                x: brick.x + brick.width / 2,
                y: brick.y,
                alpha: 1,
                scale: 1
            });
            break;
            
        case BRICK_TYPES.EXTEND:
            // 增加挡板宽度20%，持续5秒
            paddle.width = paddle.originalWidth * 1.2;
            paddle.extendTimer = 300; // 60fps * 5秒
            
            // 添加挡板加长文本效果
            comboTexts.push({
                value: "挡板加长!",
                x: brick.x + brick.width / 2,
                y: brick.y,
                alpha: 1,
                scale: 1
            });
            break;
            
        case BRICK_TYPES.RAINBOW:
            // 彩虹方块效果：清除周围两层砖块
            clearSurroundingBricks(brick);
            
            // 添加彩虹方块效果文本
            comboTexts.push({
                value: "彩虹爆炸!",
                x: brick.x + brick.width / 2,
                y: brick.y,
                alpha: 1,
                scale: 1.5
            });
            break;
    }
}

// 清除周围两层砖块的函数
function clearSurroundingBricks(targetBrick) {
    // 找到目标砖块在二维数组中的位置
    let targetRow = -1;
    let targetCol = -1;
    
    // 遍历砖块数组找到目标砖块的位置
    for (let r = 0; r < bricks.length; r++) {
        for (let c = 0; c < bricks[r].length; c++) {
            if (bricks[r][c] === targetBrick) {
                targetRow = r;
                targetCol = c;
                break;
            }
        }
        if (targetRow !== -1) break;
    }
    
    // 如果找到了目标砖块
    if (targetRow !== -1 && targetCol !== -1) {
        // 清除周围两层的砖块
        for (let r = Math.max(0, targetRow - 2); r <= Math.min(bricks.length - 1, targetRow + 2); r++) {
            for (let c = Math.max(0, targetCol - 2); c <= Math.min(bricks[r].length - 1, targetCol + 2); c++) {
                // 如果砖块存在且不是目标砖块本身（目标砖块已经在碰撞检测中被清除）
                if (bricks[r][c].status === 1) {
                    // 标记砖块为已击碎
                    bricks[r][c].status = 0;
                    
                    // 增加分数
                    updateScore();
                    
                    // 添加砖块爆炸粒子效果
                    let red, green, blue;
                    switch(bricks[r][c].type) {
                        case BRICK_TYPES.SPEED:
                            red = 255; green = 255; blue = 0; // 黄色
                            break;
                        case BRICK_TYPES.SHRINK:
                            red = 0; green = 100; blue = 255; // 蓝色
                            break;
                        case BRICK_TYPES.SPLIT:
                            red = 255; green = 0; blue = 0; // 红色
                            break;
                        case BRICK_TYPES.RAINBOW:
                            red = 255; green = 255; blue = 255; // 白色
                            break;
                        default:
                            // 普通砖块使用蓝色
                            red = 0; green = 100; blue = 255; // 蓝色
                    }
                    createParticles(bricks[r][c].x + bricks[r][c].width/2, bricks[r][c].y + bricks[r][c].height/2, 10, red, green, blue);
                }
            }
        }
    }
}

// 创建粒子效果
function createParticles(x, y, count, r, g, b) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        
        particles.push({
            x: x,
            y: y,
            radius: Math.random() * 3 + 1,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            alpha: 1,
            r: r,
            g: g,
            b: b
        });
    }
}

// 更新分数
function updateScore() {
    // 计算连击加成
    const now = Date.now();
    if (now - lastBrickHitTime < 1000) { // 1秒内连击
        combo += 0.1;
        if (combo > 5) combo = 5; // 最大5倍连击
    } else {
        combo = 1;
    }
    lastBrickHitTime = now;
    
    // 增加分数（基础10分 * 连击倍数）
    const points = Math.floor(10 * combo);
    score += points;
    
    // 更新最高分
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
    }
    
    // 添加得分文本效果
    if (combo > 1) {
        comboTexts.push({
            value: `+${points}`,
            x: canvas.width / 2,
            y: canvas.height / 2,
            alpha: 1,
            scale: 1
        });
    }
}

// 检查关卡是否完成
function checkLevelComplete() {
    let bricksRemaining = 0;
    
    // 计算剩余砖块数量
    for (let r = 0; r < bricks.length; r++) {
        for (let c = 0; c < bricks[r].length; c++) {
            if (bricks[r][c].status === 1) {
                bricksRemaining++;
            }
        }
    }
    
    // 如果没有砖块了，进入下一关
    if (bricksRemaining === 0) {
        level++;
        createBricks();
        
        // 添加关卡完成文本效果
        comboTexts.push({
            value: `关卡 ${level}`,
            x: canvas.width / 2,
            y: canvas.height / 2,
            alpha: 1,
            scale: 2
        });
    }
}

// 游戏结束
function gameOver() {
    gameRunning = false;
    if (soundEnabled) {
        sounds.background.stop();
    }
    playSound(sounds.gameOver);
    
    // 显示游戏结束模态框
    modal.style.display = 'block';
}

// 游戏循环
function gameLoop() {
    if (!gameRunning) return;
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制游戏元素
    drawBackground();
    drawBricks();
    drawPaddle();
    drawBalls();
    drawParticles();
    drawComboTexts();
    drawScore();
    
    // 更新游戏状态
    movePaddle();
    moveBalls();
    
    // 继续游戏循环
    requestAnimationFrame(gameLoop);
}

// 键盘按下事件处理
function keyDownHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        rightPressed = true;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        leftPressed = true;
    } else if (e.key === ' ' || e.key === 'Spacebar') {
        // 空格键开始游戏
        if (!gameRunning) {
            init();
        }
    } else if (e.key === 'p' || e.key === 'P') {
        // P键暂停/继续游戏
        if (gameRunning) {
            gamePaused = !gamePaused;
            if (!gamePaused) {
                requestAnimationFrame(gameLoop);
            }
        }
    }
}

// 键盘松开事件处理
function keyUpHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        rightPressed = false;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        leftPressed = false;
    }
}

// 鼠标移动事件处理
function mouseMoveHandler(e) {
    // 获取鼠标相对于画布的X坐标
    const relativeX = e.clientX - canvas.getBoundingClientRect().left;
    
    // 更新鼠标位置
    mouseX = relativeX;
    
    // 如果鼠标在画布范围内，移动挡板
    if (relativeX > 0 && relativeX < canvas.width) {
        paddle.x = relativeX - paddle.width / 2;
    }
}

// 更新移动挡板函数，支持键盘控制
function movePaddle() {
    // 键盘控制
    if (rightPressed) {
        paddle.x += paddle.dx;
    } else if (leftPressed) {
        paddle.x -= paddle.dx;
    }
    
    // 处理挡板收缩计时器
    if (paddle.shrinkTimer > 0) {
        paddle.shrinkTimer--;
        if (paddle.shrinkTimer === 0) {
            // 恢复挡板原始宽度
            paddle.width = paddle.originalWidth;
        }
    }
    
    // 限制挡板在画布范围内
    if (paddle.x < 0) {
        paddle.x = 0;
    } else if (paddle.x + paddle.width > canvas.width) {
        paddle.x = canvas.width - paddle.width;
    }
}

// 添加事件监听
document.addEventListener('keydown', keyDownHandler);
document.addEventListener('keyup', keyUpHandler);
document.addEventListener('mousemove', mouseMoveHandler);

// 重新开始按钮点击事件
restartBtn.addEventListener('click', init);

// 音乐开关按钮
const soundToggleBtn = document.getElementById('sound-toggle');
soundToggleBtn.addEventListener('click', function() {
    soundEnabled = !soundEnabled;
    soundToggleBtn.textContent = `音乐: ${soundEnabled ? '开启' : '关闭'}`;
    
    // 如果游戏正在运行，根据开关状态处理背景音乐
    if (gameRunning) {
        if (soundEnabled) {
            sounds.background.play();
        } else {
            sounds.background.stop();
        }
    }
});

// 页面加载完成后初始化游戏
window.onload = function() {
    // 显示开始界面
    modal.style.display = 'block';
    document.querySelector('#modal h2').textContent = '打砖块游戏';
    document.querySelector('#restart-btn').textContent = '开始游戏';
};