/**
 * 打砖块游戏主逻辑
 */

// 游戏配置
const CONFIG = {
    canvas: {
        width: 800,
        height: 600
    },
    paddle: {
        width: 120,
        height: 15,
        speed: 10,
        color: '#3498db',
        maxWidth: 200  // 添加最大宽度限制
    },
    ball: {
        radius: 8,
        speed: 6,
        color: '#ffffff'
    },
    brick: {
        rows: 5,
        cols: 10,
        width: 70,
        height: 20,
        padding: 5,
        colors: {
            normal: '#e74c3c',
            special: '#f1c40f',
            power: '#2ecc71',
            rainbow: '#9b59b6',
            bomb: '#e67e22',
            extend: '#1abc9c'  // 添加新的加长砖块颜色
        }
    },
    combo: {
        window: 500,
        multiplier: 1.5
    }
};

// 游戏状态
const gameState = {
    score: 0,
    combo: 1,
    lastHitTime: 0,
    isPaused: false,
    isGameOver: false,
    level: 1
};

// 游戏对象
class GameObject {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    getBounds() {
        return {
            left: this.x,
            right: this.x + this.width,
            top: this.y,
            bottom: this.y + this.height
        };
    }

    draw(ctx) {
        // 由子类实现
    }

    update() {
        // 由子类实现
    }
}

// 挡板类
class Paddle extends GameObject {
    constructor() {
        const x = (CONFIG.canvas.width - CONFIG.paddle.width) / 2;
        const y = CONFIG.canvas.height - CONFIG.paddle.height - 10;
        super(x, y, CONFIG.paddle.width, CONFIG.paddle.height);
        this.color = CONFIG.paddle.color;
        this.speed = CONFIG.paddle.speed;
        this.power = 100;
        this.powerTimer = null;
        this.extendTimer = null;
    }

    move(direction) {
        const newX = this.x + direction * this.speed;
        if (newX >= 0 && newX <= CONFIG.canvas.width - this.width) {
            this.x = newX;
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, 5);
        ctx.fill();
    }

    shrink() {
        if (this.powerTimer) clearTimeout(this.powerTimer);
        this.width *= 0.8;
        this.power = 100;
        this.powerTimer = setTimeout(() => {
            this.width = CONFIG.paddle.width;
            this.power = 100;
        }, 5000);
    }

    extend() {
        if (this.extendTimer) clearTimeout(this.extendTimer);
        const newWidth = Math.min(this.width * 1.5, CONFIG.paddle.maxWidth);
        this.width = newWidth;
        this.extendTimer = setTimeout(() => {
            this.width = CONFIG.paddle.width;
        }, 5000);
    }
}

// 球类
class Ball extends GameObject {
    constructor() {
        const x = CONFIG.canvas.width / 2;
        const y = CONFIG.canvas.height - 50;
        super(x, y, CONFIG.ball.radius * 2, CONFIG.ball.radius * 2);
        this.radius = CONFIG.ball.radius;
        this.color = CONFIG.ball.color;
        this.speed = CONFIG.ball.speed;
        this.dx = this.speed;
        this.dy = -this.speed;
        this.trail = [];
        this.isActive = true;
    }

    update() {
        if (!this.isActive) return;

        // 更新位置
        this.x += this.dx;
        this.y += this.dy;

        // 添加拖尾效果
        effectsManager.trail.addTrail(this.x, this.y, this.radius, this.color);

        // 边界碰撞检测
        if (this.x <= 0 || this.x >= CONFIG.canvas.width - this.width) {
            this.dx *= -1;
        }
        if (this.y <= 0) {
            this.dy *= -1;
        }

        // 检查是否掉落
        if (this.y >= CONFIG.canvas.height) {
            this.isActive = false;
        }
    }

    draw(ctx) {
        if (!this.isActive) return;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x + this.radius, this.y + this.radius, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    speedUp() {
        this.speed *= 1.2;
        this.dx = Math.sign(this.dx) * this.speed;
        this.dy = Math.sign(this.dy) * this.speed;
    }

    split() {
        const newBall = new Ball();
        newBall.x = this.x;
        newBall.y = this.y;
        newBall.dx = this.dx * Math.cos(degToRad(45));
        newBall.dy = this.dy * Math.sin(degToRad(45));
        return newBall;
    }
}

// 砖块类
class Brick extends GameObject {
    constructor(x, y, type = 'normal') {
        super(x, y, CONFIG.brick.width, CONFIG.brick.height);
        this.type = type;
        this.color = CONFIG.brick.colors[type];
        this.id = generateUUID();
        this.isDestroyed = false;
        this.row = Math.floor((y - 50) / (CONFIG.brick.height + CONFIG.brick.padding));  // 添加行号属性
    }

    draw(ctx) {
        if (this.isDestroyed) return;
        
        const scale = effectsManager.brickScale.getScale(this.id);
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.scale(scale, scale);
        ctx.translate(-(this.x + this.width/2), -(this.y + this.height/2));
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, 3);
        ctx.fill();
        
        ctx.restore();
    }

    destroy(triggerEffects = true) {
        if (this.isDestroyed) return;
        
        this.isDestroyed = true;
        effectsManager.brickScale.addBrick(this.id, 10);
        effectsManager.particles.createExplosion(
            this.x + this.width/2,
            this.y + this.height/2,
            this.color
        );
        effectsManager.sound.play('brick');
        
        // 更新连击系统
        const now = Date.now();
        if (now - gameState.lastHitTime < CONFIG.combo.window) {
            gameState.combo++;
            effectsManager.text.addText(
                `+${gameState.combo}x`,
                this.x + this.width/2,
                this.y,
                '#ffcc00',
                20,
                30
            );
            effectsManager.sound.play('combo');
        } else {
            gameState.combo = 1;
        }
        gameState.lastHitTime = now;
        
        // 更新分数
        let scoreMultiplier = 1;
        switch(this.type) {
            case 'special':
                scoreMultiplier = 1.5;
                break;
            case 'power':
                scoreMultiplier = 2;
                break;
            case 'rainbow':
                scoreMultiplier = 3;
                break;
            case 'bomb':
                scoreMultiplier = 4;
                break;
            case 'extend':
                scoreMultiplier = 2;
                break;
        }
        gameState.score += 100 * gameState.combo * scoreMultiplier;
        document.getElementById('score').textContent = formatScore(gameState.score);
        document.getElementById('combo-multiplier').textContent = gameState.combo;
        
        return triggerEffects ? this.type : null;
    }
}

// 游戏类
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.paddle = new Paddle();
        this.balls = [new Ball()];
        this.bricks = [];
        this.keys = {};
        this.lastTime = 0;
        this.accumulator = 0;
        this.timeStep = 1000 / 60; // 60 FPS

        this.init();
    }

    init() {
        // 初始化砖块
        this.createBricks();
        
        // 事件监听
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
        window.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        
        // 开始游戏循环
        this.gameLoop();
        
        // 开始背景音乐
        effectsManager.sound.startBackground();
    }

    createBricks() {
        const { rows, cols, width, height, padding } = CONFIG.brick;
        const startX = (CONFIG.canvas.width - (cols * (width + padding))) / 2;
        const startY = 50;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = startX + col * (width + padding);
                const y = startY + row * (height + padding);
                
                // 增加特殊砖块概率
                let type = 'normal';
                const rand = Math.random();
                if (rand < 0.4) { // 增加到40%概率生成特殊砖块
                    const specialRand = Math.random();
                    if (specialRand < 0.3) type = 'special';      // 加速砖块
                    else if (specialRand < 0.6) type = 'power';    // 分裂砖块
                    else if (specialRand < 0.8) type = 'rainbow';  // 彩虹砖块
                    else if (specialRand < 0.9) type = 'bomb';     // 炸弹砖块
                    else type = 'extend';                          // 加长砖块
                }
                
                this.bricks.push(new Brick(x, y, type));
            }
        }
    }

    handleKeyDown(e) {
        this.keys[e.key] = true;
        if (e.key === ' ') {
            gameState.isPaused = !gameState.isPaused;
        }
    }

    handleKeyUp(e) {
        this.keys[e.key] = false;
    }

    handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const direction = (x - this.paddle.x) / this.paddle.width;
        this.paddle.move(direction * 2);
    }

    update(deltaTime) {
        if (gameState.isPaused || gameState.isGameOver) return;

        // 更新挡板
        if (this.keys['ArrowLeft']) this.paddle.move(-1);
        if (this.keys['ArrowRight']) this.paddle.move(1);

        // 更新所有球
        this.balls.forEach(ball => {
            ball.update();

            // 球与挡板碰撞
            if (circleRectCollision(ball, this.paddle)) {
                ball.dy = -Math.abs(ball.dy);
                effectsManager.sound.play('hit');
                
                // 根据碰撞位置改变水平速度
                const hitPos = (ball.x - this.paddle.x) / this.paddle.width;
                const angle = (hitPos - 0.5) * Math.PI / 3;
                ball.dx = ball.speed * Math.sin(angle);
            }

            // 球与砖块碰撞
            this.bricks.forEach(brick => {
                if (!brick.isDestroyed && circleRectCollision(ball, brick)) {
                    ball.dy *= -1;
                    const brickType = brick.destroy(true);
                    
                    // 只有直接由球碰撞的砖块才触发特殊效果
                    if (brickType) {
                        this.triggerBrickEffect(brick, brickType, ball);
                    }
                }
            });
        });

        // 检查是否所有球都失效
        if (this.balls.every(ball => !ball.isActive)) {
            gameState.isGameOver = true;
        }

        // 更新特效
        effectsManager.particles.update();
        effectsManager.trail.update();
        effectsManager.text.update();
        effectsManager.shake.update();
        effectsManager.brickScale.update();

        // 检查关卡完成
        if (this.bricks.every(brick => brick.isDestroyed)) {
            this.nextLevel();
        }
    }

    nextLevel() {
        gameState.level++;
        this.bricks = [];
        this.createBricks();
        
        // 重置球的位置和速度
        this.balls.forEach(ball => {
            ball.x = CONFIG.canvas.width / 2;
            ball.y = CONFIG.canvas.height - 50;
            ball.dx = ball.speed;
            ball.dy = -ball.speed;
        });
    }

    draw() {
        // 清空画布
        this.ctx.fillStyle = '#121212';
        this.ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);

        // 应用屏幕震动效果
        const shakeOffset = effectsManager.shake.getOffset();
        this.ctx.translate(shakeOffset.x, shakeOffset.y);

        // 绘制游戏对象
        this.bricks.forEach(brick => brick.draw(this.ctx));
        this.balls.forEach(ball => ball.draw(this.ctx));
        this.paddle.draw(this.ctx);

        // 绘制特效
        effectsManager.particles.draw(this.ctx);
        effectsManager.trail.draw(this.ctx);
        effectsManager.text.draw(this.ctx);

        // 重置变换
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);

        // 绘制游戏结束画面
        if (gameState.isGameOver) {
            this.drawGameOver();
        }
    }

    drawGameOver() {
        const modal = document.getElementById('gameOverModal');
        const finalScore = document.getElementById('final-score');
        const highScore = document.getElementById('high-score');
        
        finalScore.textContent = formatScore(gameState.score);
        highScore.textContent = formatScore(getHighScore(gameState.score));
        
        modal.style.display = 'flex';
        effectsManager.sound.stopBackground();
        effectsManager.sound.play('gameOver');
    }

    gameLoop(currentTime = 0) {
        if (this.lastTime) {
            const deltaTime = currentTime - this.lastTime;
            this.accumulator += deltaTime;

            while (this.accumulator >= this.timeStep) {
                this.update(this.timeStep);
                this.accumulator -= this.timeStep;
            }
        }

        this.lastTime = currentTime;
        this.draw();
        requestAnimationFrame(time => this.gameLoop(time));
    }

    // 新增方法，处理砖块特殊效果
    triggerBrickEffect(brick, brickType, ball) {
        switch(brickType) {
            case 'special':
                ball.speedUp();
                break;
            case 'power':
                this.paddle.shrink();
                const newBall = ball.split();
                this.balls.push(newBall);
                break;
            case 'rainbow':
                // 彩虹砖块效果：清除周围砖块，但不触发它们的特殊效果
                this.bricks.forEach(nearbyBrick => {
                    if (!nearbyBrick.isDestroyed) {
                        const dx = nearbyBrick.x - brick.x;
                        const dy = nearbyBrick.y - brick.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance < 100) {
                            nearbyBrick.destroy(false);  // 不触发连锁效果
                        }
                    }
                });
                break;
            case 'bomb':
                // 炸弹砖块效果：清除同一行的砖块，但不触发它们的特殊效果
                this.bricks.forEach(nearbyBrick => {
                    if (!nearbyBrick.isDestroyed && nearbyBrick.row === brick.row) {
                        nearbyBrick.destroy(false);  // 不触发连锁效果
                    }
                });
                break;
            case 'extend':
                this.paddle.extend();
                break;
        }
    }
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    
    // 重新开始按钮事件
    document.getElementById('restartButton').addEventListener('click', () => {
        location.reload();
    });
}); 