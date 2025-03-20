document.addEventListener('DOMContentLoaded', () => {
    // 常量定义
    const COLS = 10;
    const ROWS = 20;
    const CELL_SIZE = 30;
    const EMPTY_CELL = 'empty';
    
    // 方块形状定义 - 使用相对坐标表示每种方块的形状
    const SHAPES = {
        'I': [
            [0, 0], [0, 1], [0, 2], [0, 3]
        ],
        'J': [
            [0, 0], [1, 0], [1, 1], [1, 2]
        ],
        'L': [
            [0, 2], [1, 0], [1, 1], [1, 2]
        ],
        'O': [
            [0, 0], [0, 1], [1, 0], [1, 1]
        ],
        'S': [
            [0, 1], [0, 2], [1, 0], [1, 1]
        ],
        'T': [
            [0, 1], [1, 0], [1, 1], [1, 2]
        ],
        'Z': [
            [0, 0], [0, 1], [1, 1], [1, 2]
        ]
    };
    
    // 游戏状态变量
    let gameBoard = createBoard(COLS, ROWS);
    let currentPiece = null;
    let nextPiece = null;
    let gameInterval = null;
    let gameSpeed = 1000; // 初始速度为1秒
    let isPaused = false;
    let isGameOver = false;
    let score = 0;
    let level = 1;
    let linesCleared = 0;
    let previousLevel = 1; // 用于检测等级变化
    
    // DOM元素
    const gameBoardElement = document.getElementById('game-board');
    const nextPieceElement = document.getElementById('next-piece');
    const scoreElement = document.getElementById('score');
    const levelElement = document.getElementById('level');
    const linesElement = document.getElementById('lines');
    const startButton = document.getElementById('start-btn');
    const pauseButton = document.getElementById('pause-btn');
    const restartButton = document.getElementById('restart-btn');
    const introPanel = document.getElementById('intro-panel');
    const startGameIntroButton = document.getElementById('start-game-intro');
    
    // 初始化方块预览颜色
    initPiecePreview();
    
    // 初始化介绍面板中的方块颜色
    function initPiecePreview() {
        const pieceTypes = Object.keys(SHAPES);
        const previewElements = document.querySelectorAll('.piece-preview');
        
        // 给每个预览方块设置对应的样式
        previewElements.forEach((element, index) => {
            if(index < pieceTypes.length) {
                // 添加对应方块的类名 (piece-I, piece-J 等)
                element.classList.add(`piece-${pieceTypes[index]}`);
            }
        });
    }
    
    // 初始化游戏
    function init() {
        // 创建游戏面板
        drawBoard();
        drawNextPieceBoard();
        
        // 事件监听
        document.addEventListener('keydown', handleKeyPress);
        startButton.addEventListener('click', startGame);
        pauseButton.addEventListener('click', togglePause);
        restartButton.addEventListener('click', restartGame);
        startGameIntroButton.addEventListener('click', () => {
            introPanel.classList.add('hidden');
            startGame();
        });
        
        // 禁用暂停按钮
        pauseButton.disabled = true;
    }
    
    // 创建空的游戏板状态
    function createBoard(cols, rows) {
        return Array.from({ length: rows }, () =>
            Array.from({ length: cols }, () => EMPTY_CELL)
        );
    }
    
    // 绘制游戏板
    function drawBoard() {
        gameBoardElement.innerHTML = '';
        
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                if (gameBoard[row][col] === EMPTY_CELL) {
                    cell.classList.add(EMPTY_CELL);
                } else {
                    cell.classList.add('filled');
                    cell.classList.add(`piece-${gameBoard[row][col]}`);
                }
                gameBoardElement.appendChild(cell);
            }
        }
        
        // 如果有当前方块，绘制它
        if (currentPiece) {
            currentPiece.shape.forEach(([row, col]) => {
                const boardRow = row + currentPiece.position.row;
                const boardCol = col + currentPiece.position.col;
                
                if (boardRow >= 0 && boardRow < ROWS && boardCol >= 0 && boardCol < COLS) {
                    const cellIndex = boardRow * COLS + boardCol;
                    const cell = gameBoardElement.children[cellIndex];
                    
                    cell.classList.remove(EMPTY_CELL);
                    cell.classList.add('filled');
                    cell.classList.add(`piece-${currentPiece.type}`);
                    
                    // 当前移动的方块添加移动过渡效果
                    cell.classList.add('moving-piece');
                }
            });
        }
    }
    
    // 绘制下一个方块预览区域
    function drawNextPieceBoard() {
        nextPieceElement.innerHTML = '';
        
        // 创建4x4的网格
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.classList.add(EMPTY_CELL);
                nextPieceElement.appendChild(cell);
            }
        }
        
        // 如果有下一个方块，绘制它
        if (nextPiece) {
            const offsetRow = nextPiece.type === 'I' ? 1 : 0;
            const offsetCol = nextPiece.type === 'I' ? 0 : 1;
            
            nextPiece.shape.forEach(([row, col]) => {
                const previewRow = row + offsetRow;
                const previewCol = col + offsetCol;
                
                if (previewRow >= 0 && previewRow < 4 && previewCol >= 0 && previewCol < 4) {
                    const cellIndex = previewRow * 4 + previewCol;
                    const cell = nextPieceElement.children[cellIndex];
                    
                    cell.classList.remove(EMPTY_CELL);
                    cell.classList.add('filled');
                    cell.classList.add(`piece-${nextPiece.type}`);
                    cell.classList.add('new-piece'); // 添加新方块出现动画
                }
            });
        }
    }
    
    // 创建随机方块
    function createRandomPiece() {
        const pieceTypes = Object.keys(SHAPES);
        const randomType = pieceTypes[Math.floor(Math.random() * pieceTypes.length)];
        
        return {
            type: randomType,
            shape: SHAPES[randomType],
            position: {
                row: -1, // 从顶部开始，略微偏上，这样最上面的方块会先出现
                col: Math.floor(COLS / 2) - 1
            }
        };
    }
    
    // 检查碰撞
    function checkCollision(shape, position) {
        return shape.some(([row, col]) => {
            const boardRow = row + position.row;
            const boardCol = col + position.col;
            
            // 检查是否超出边界
            const isOutOfBounds = 
                boardCol < 0 || 
                boardCol >= COLS || 
                boardRow >= ROWS;
            
            // 检查是否与已有方块碰撞（只检查不在负坐标的格子）
            const hasCollision = 
                boardRow >= 0 && 
                gameBoard[boardRow] && 
                gameBoard[boardRow][boardCol] !== EMPTY_CELL;
            
            return isOutOfBounds || hasCollision;
        });
    }
    
    // 旋转方块
    function rotatePiece(piece) {
        // O方块不需要旋转
        if (piece.type === 'O') return piece;
        
        const rotatedShape = piece.shape.map(([row, col]) => {
            // 对于I方块，需要特殊处理
            if (piece.type === 'I') {
                return [col, 3 - row]; // I方块特殊旋转逻辑
            } else {
                return [col, 2 - row]; // 其他方块通用旋转逻辑
            }
        });
        
        const newPiece = {
            ...piece,
            shape: rotatedShape
        };
        
        // 如果旋转后与边界或其他方块碰撞，尝试移动（踢墙）
        if (checkCollision(rotatedShape, piece.position)) {
            // 尝试向左移动
            newPiece.position = { ...piece.position, col: piece.position.col - 1 };
            if (!checkCollision(rotatedShape, newPiece.position)) {
                // 添加旋转动画效果
                addRotateEffect();
                return newPiece;
            }
            
            // 尝试向右移动
            newPiece.position = { ...piece.position, col: piece.position.col + 1 };
            if (!checkCollision(rotatedShape, newPiece.position)) {
                // 添加旋转动画效果
                addRotateEffect();
                return newPiece;
            }
            
            // 尝试向上移动（针对部分特殊情况）
            newPiece.position = { ...piece.position, row: piece.position.row - 1 };
            if (!checkCollision(rotatedShape, newPiece.position)) {
                // 添加旋转动画效果
                addRotateEffect();
                return newPiece;
            }
            
            // 如果所有调整都失败，保持原样
            return piece;
        }
        
        // 添加旋转动画效果
        addRotateEffect();
        return newPiece;
    }
    
    // 添加旋转动画效果
    function addRotateEffect() {
        // 这里可以添加视觉效果或音效，表示方块旋转
        // 例如可以对游戏板添加轻微的闪烁或变换
        const flash = document.createElement('div');
        flash.style.position = 'absolute';
        flash.style.width = '100%';
        flash.style.height = '100%';
        flash.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        flash.style.pointerEvents = 'none';
        flash.style.zIndex = '5';
        gameBoardElement.style.position = 'relative';
        gameBoardElement.appendChild(flash);
        
        setTimeout(() => {
            gameBoardElement.removeChild(flash);
        }, 100);
    }
    
    // 移动方块
    function movePiece(piece, direction) {
        const newPosition = { ...piece.position };
        
        switch (direction) {
            case 'left':
                newPosition.col -= 1;
                break;
            case 'right':
                newPosition.col += 1;
                break;
            case 'down':
                newPosition.row += 1;
                break;
        }
        
        if (!checkCollision(piece.shape, newPosition)) {
            piece.position = newPosition;
            return true;
        }
        
        // 如果是向下移动且发生碰撞，方块已到底
        if (direction === 'down') {
            // 添加震动效果
            addShakeEffect();
            
            placePiece(piece);
            checkLines();
            
            if (isGameOver) {
                endGame();
                return false;
            }
            
            createNewPiece();
        }
        
        return false;
    }
    
    // 添加震动效果
    function addShakeEffect() {
        gameBoardElement.classList.add('shake');
        setTimeout(() => {
            gameBoardElement.classList.remove('shake');
        }, 150);
    }
    
    // 使方块快速落下
    function dropPiece() {
        if (isPaused || isGameOver) return;
        
        let dropDistance = 0;
        while (movePiece(currentPiece, 'down')) {
            dropDistance++;
            // 持续下落直到碰撞
        }
        
        // 如果下落距离大于某个值，添加更强的震动效果
        if (dropDistance > 10) {
            // 添加更强的震动
            gameBoardElement.style.animation = 'shake 0.3s ease-in-out';
            setTimeout(() => {
                gameBoardElement.style.animation = '';
            }, 300);
        }
    }
    
    // 放置方块（融入游戏板）
    function placePiece(piece) {
        piece.shape.forEach(([row, col]) => {
            const boardRow = row + piece.position.row;
            const boardCol = col + piece.position.col;
            
            // 如果放置位置超出顶部，游戏结束
            if (boardRow < 0) {
                isGameOver = true;
                return;
            }
            
            gameBoard[boardRow][boardCol] = piece.type;
        });
    }
    
    // 检查并清除完整的行
    function checkLines() {
        let linesRemoved = 0;
        const linesToClear = []; // 存储要清除的行号
        
        // 找出要清除的行
        for (let row = ROWS - 1; row >= 0; row--) {
            if (gameBoard[row].every(cell => cell !== EMPTY_CELL)) {
                linesToClear.push(row);
                linesRemoved++;
            }
        }
        
        if (linesToClear.length > 0) {
            // 先播放消行动画
            playClearAnimation(linesToClear, () => {
                // 动画完成后，实际清除行并更新分数
                for (let row of linesToClear) {
                    gameBoard.splice(row, 1);
                    gameBoard.unshift(Array(COLS).fill(EMPTY_CELL));
                }
                updateScore(linesRemoved);
                drawBoard();
                
                // 对于消除4行（俄罗斯方块），添加特殊的庆祝动画
                if (linesRemoved === 4) {
                    celebrateTetris();
                }
            });
        }
    }
    
    // 播放消行动画
    function playClearAnimation(rows, callback) {
        // 为每一行添加动画
        rows.forEach(row => {
            for (let col = 0; col < COLS; col++) {
                const cellIndex = row * COLS + col;
                const cell = gameBoardElement.children[cellIndex];
                cell.classList.add('clear-animation');
            }
        });
        
        // 设置动画完成后的回调
        setTimeout(() => {
            callback();
        }, 300); // 与动画持续时间一致
    }
    
    // 消除四行的庆祝动画（俄罗斯方块）
    function celebrateTetris() {
        // 创建一个全屏的闪光效果
        const flashElement = document.createElement('div');
        flashElement.style.position = 'fixed';
        flashElement.style.top = '0';
        flashElement.style.left = '0';
        flashElement.style.width = '100%';
        flashElement.style.height = '100%';
        flashElement.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
        flashElement.style.zIndex = '100';
        flashElement.style.pointerEvents = 'none';
        flashElement.style.transition = 'opacity 0.5s ease-out';
        
        document.body.appendChild(flashElement);
        
        // 淡出闪光效果
        setTimeout(() => {
            flashElement.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(flashElement);
            }, 500);
        }, 100);
        
        // 可以在这里添加声音效果或其他视觉效果
    }
    
    // 计算并更新分数
    function updateScore(lines) {
        // 保存原分数用于动画
        const oldScore = score;
        const oldLevel = level;
        
        // 分数计算规则：基础分数 * 行数 * 等级
        const basePoints = [0, 40, 100, 300, 1200]; // 0, 1, 2, 3, 4 行的基础分数
        score += basePoints[lines] * level;
        linesCleared += lines;
        
        // 每清除10行，提高一个等级
        level = Math.floor(linesCleared / 10) + 1;
        
        // 更新速度 (限制最快速度为100ms)
        gameSpeed = Math.max(100, 1000 - (level - 1) * 100);
        
        // 如果有活动的游戏间隔，重置它以应用新速度
        if (gameInterval) {
            clearInterval(gameInterval);
            gameInterval = setInterval(gameLoop, gameSpeed);
        }
        
        // 更新显示并添加动画
        scoreElement.textContent = score;
        
        // 分数增加动画
        if (score > oldScore) {
            scoreElement.classList.add('score-increase');
            setTimeout(() => {
                scoreElement.classList.remove('score-increase');
            }, 300);
        }
        
        // 等级提升动画
        if (level > oldLevel) {
            levelElement.textContent = level;
            levelElement.classList.add('level-up');
            
            // 播放等级提升动画
            setTimeout(() => {
                levelElement.classList.remove('level-up');
            }, 500);
        } else {
            levelElement.textContent = level;
        }
        
        linesElement.textContent = linesCleared;
    }
    
    // 处理键盘输入
    function handleKeyPress(e) {
        if (isPaused || isGameOver || !currentPiece) return;
        
        switch (e.key) {
            case 'ArrowLeft':
                movePiece(currentPiece, 'left');
                break;
            case 'ArrowRight':
                movePiece(currentPiece, 'right');
                break;
            case 'ArrowDown':
                movePiece(currentPiece, 'down');
                break;
            case 'ArrowUp':
                currentPiece = rotatePiece(currentPiece);
                break;
            case ' ': // 空格键
                dropPiece();
                break;
            case 'p': // P键暂停
                togglePause();
                break;
        }
        
        drawBoard();
    }
    
    // 游戏主循环
    function gameLoop() {
        if (isPaused || isGameOver) return;
        
        movePiece(currentPiece, 'down');
        drawBoard();
    }
    
    // 生成新方块
    function createNewPiece() {
        currentPiece = nextPiece || createRandomPiece();
        nextPiece = createRandomPiece();
        
        // 如果新方块一出现就碰撞，游戏结束
        if (checkCollision(currentPiece.shape, currentPiece.position)) {
            isGameOver = true;
            endGame();
        }
        
        drawNextPieceBoard();
    }
    
    // 开始游戏
    function startGame() {
        if (gameInterval || isGameOver) return;
        
        // 重置游戏状态
        resetGameState();
        
        // 创建首个方块
        createNewPiece();
        
        // 启动游戏循环
        gameInterval = setInterval(gameLoop, gameSpeed);
        
        // 更新按钮状态
        startButton.disabled = true;
        pauseButton.disabled = false;
        
        // 添加游戏开始动画
        gameBoardElement.style.animation = 'fadeIn 0.5s ease-in-out';
        setTimeout(() => {
            gameBoardElement.style.animation = '';
        }, 500);
    }
    
    // 暂停/继续游戏
    function togglePause() {
        if (isGameOver) return;
        
        isPaused = !isPaused;
        pauseButton.textContent = isPaused ? '继续游戏' : '暂停游戏';
        
        if (!isPaused && !gameInterval) {
            gameInterval = setInterval(gameLoop, gameSpeed);
        }
    }
    
    // 重新开始游戏
    function restartGame() {
        // 清除当前游戏循环
        if (gameInterval) {
            clearInterval(gameInterval);
            gameInterval = null;
        }
        
        // 移除游戏结束动画
        gameBoardElement.classList.remove('game-over');
        
        // 重置游戏状态
        resetGameState();
        
        // 重绘面板
        drawBoard();
        drawNextPieceBoard();
        
        // 更新按钮状态
        startButton.disabled = false;
        pauseButton.disabled = true;
        pauseButton.textContent = '暂停游戏';
    }
    
    // 重置游戏状态
    function resetGameState() {
        gameBoard = createBoard(COLS, ROWS);
        currentPiece = null;
        nextPiece = null;
        isGameOver = false;
        isPaused = false;
        score = 0;
        level = 1;
        linesCleared = 0;
        gameSpeed = 1000;
        
        // 更新显示
        scoreElement.textContent = score;
        levelElement.textContent = level;
        linesElement.textContent = linesCleared;
    }
    
    // 游戏结束
    function endGame() {
        clearInterval(gameInterval);
        gameInterval = null;
        
        // 添加游戏结束动画
        gameBoardElement.classList.add('game-over');
        
        // 更新按钮状态
        startButton.disabled = false;
        pauseButton.disabled = true;
        
        // 弹出游戏结束消息
        setTimeout(() => {
            alert(`游戏结束！你的最终得分是：${score}`);
        }, 500);
    }
    
    // 初始化游戏
    init();
});