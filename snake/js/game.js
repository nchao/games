class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 设置画布大小
        this.canvas.width = 400;
        this.canvas.height = 400;
        
        // 游戏网格设置
        this.gridSize = 20;
        this.tileCount = this.canvas.width / this.gridSize;
        
        // 游戏速度设置
        this.gameSpeedSelect = document.getElementById('gameSpeed');
        this.gameSpeed = parseInt(this.gameSpeedSelect.value);
        
        // 初始化游戏状态
        this.reset();
        
        // 绑定按键事件
        this.bindControls();
        
        // 初始化UI元素
        this.initUI();
        
        // 绑定触控事件
        this.bindTouchControls();
    }

    reset() {
        // 蛇的初始位置和速度
        this.snake = [{x: 5, y: 5}];
        this.velocity = {x: 1, y: 0};  // 设置初始向右移动
        this.nextVelocity = {x: 1, y: 0};  // 设置初始向右移动
        
        // 食物位置
        this.food = this.generateFood();
        
        // 游戏状态
        this.score = 0;
        this.gameOver = false;
        this.isPaused = false;
        
        // 更新UI
        this.updateScore();
        document.getElementById('gameOver').style.display = 'none';
    }

    bindTouchControls() {
        const touchButtons = {
            'upBtn': {x: 0, y: -1},
            'downBtn': {x: 0, y: 1},
            'leftBtn': {x: -1, y: 0},
            'rightBtn': {x: 1, y: 0}
        };

        Object.keys(touchButtons).forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    if (this.gameOver || this.isPaused) return;
                    const direction = touchButtons[btnId];
                    
                    // 确保不能直接反向移动
                    if ((direction.x !== 0 && this.velocity.x !== -direction.x) ||
                        (direction.y !== 0 && this.velocity.y !== -direction.y)) {
                        this.nextVelocity = direction;
                    }
                });
            }
        });
    }

    initUI() {
        // 获取UI元素
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.restartBtn = document.getElementById('restartBtn');
        this.playAgainBtn = document.getElementById('playAgainBtn');
        
        // 绑定按钮事件
        this.startBtn.addEventListener('click', () => this.start());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        this.restartBtn.addEventListener('click', () => this.restart());
        this.playAgainBtn.addEventListener('click', () => this.restart());
        
        // 初始化最高分
        this.highScore = localStorage.getItem('snakeHighScore') || 0;
        document.getElementById('highScore').textContent = this.highScore;
    }

    bindControls() {
        document.addEventListener('keydown', (e) => {
            if (this.gameOver) return;
            
            switch(e.key) {
                case 'ArrowUp':
                    if (this.velocity.y !== 1) this.nextVelocity = {x: 0, y: -1};
                    break;
                case 'ArrowDown':
                    if (this.velocity.y !== -1) this.nextVelocity = {x: 0, y: 1};
                    break;
                case 'ArrowLeft':
                    if (this.velocity.x !== 1) this.nextVelocity = {x: -1, y: 0};
                    break;
                case 'ArrowRight':
                    if (this.velocity.x !== -1) this.nextVelocity = {x: 1, y: 0};
                    break;
                case ' ':  // 空格键
                    this.togglePause();
                    break;
            }
        });

        // 速度控制
        this.gameSpeedSelect.addEventListener('change', () => {
            this.gameSpeed = parseInt(this.gameSpeedSelect.value);
            if (this.gameLoop) {
                clearInterval(this.gameLoop);
                this.gameLoop = setInterval(() => {
                    this.update();
                    this.draw();
                }, this.gameSpeed);
            }
        });
    }

    generateFood() {
        let food;
        do {
            food = {
                x: Math.floor(Math.random() * this.tileCount),
                y: Math.floor(Math.random() * this.tileCount)
            };
        } while (this.snake.some(segment => segment.x === food.x && segment.y === food.y));
        return food;
    }

    update() {
        if (this.gameOver || this.isPaused) return;

        // 更新蛇的方向
        this.velocity = {...this.nextVelocity};
        
        // 移动蛇
        const head = {
            x: this.snake[0].x + this.velocity.x,
            y: this.snake[0].y + this.velocity.y
        };
        
        // 检查碰撞
        if (this.checkCollision(head)) {
            this.endGame();
            return;
        }
        
        this.snake.unshift(head);
        
        // 检查是否吃到食物
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score++;
            this.updateScore();
            this.food = this.generateFood();
        } else {
            this.snake.pop();
        }
    }

    checkCollision(head) {
        // 检查墙壁碰撞
        if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
            return true;
        }
        
        // 检查自身碰撞
        return this.snake.some(segment => segment.x === head.x && segment.y === head.y);
    }

    draw() {
        // 清空画布
        this.ctx.fillStyle = '#fafafa';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制蛇
        this.ctx.fillStyle = '#4CAF50';
        this.snake.forEach(segment => {
            this.ctx.fillRect(
                segment.x * this.gridSize,
                segment.y * this.gridSize,
                this.gridSize - 1,
                this.gridSize - 1
            );
        });
        
        // 绘制食物
        this.ctx.fillStyle = '#f44336';
        this.ctx.fillRect(
            this.food.x * this.gridSize,
            this.food.y * this.gridSize,
            this.gridSize - 1,
            this.gridSize - 1
        );
    }

    updateScore() {
        document.getElementById('score').textContent = this.score;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('snakeHighScore', this.highScore);
            document.getElementById('highScore').textContent = this.highScore;
        }
    }

    start() {
        if (!this.gameLoop) {
            this.reset();
            this.gameLoop = setInterval(() => {
                this.update();
                this.draw();
            }, this.gameSpeed); // 使用用户选择的速度
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        this.pauseBtn.textContent = this.isPaused ? '继续' : '暂停';
        this.pauseBtn.classList.toggle('paused');
    }

    restart() {
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
            this.gameLoop = null;
        }
        this.start();
    }

    endGame() {
        this.gameOver = true;
        clearInterval(this.gameLoop);
        this.gameLoop = null;
        
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOver').style.display = 'block';
    }
}

// 游戏初始化
window.onload = () => {
    new SnakeGame();
};
