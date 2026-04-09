document.addEventListener('DOMContentLoaded', () => {
    const gridContainer = document.getElementById('grid-container');
    const tileContainer = document.getElementById('tile-container');
    const scoreElement = document.getElementById('score');
    const messageElement = document.getElementById('game-message');
    const messageText = messageElement.querySelector('p');

    const SIZE = 4;
    let board = []; // 存储 { value, element }
    let score = 0;
    let isGameOver = false;
    let isMoving = false;

    // 动态获取 CSS 中的尺寸变量
    function getSpacing() {
        return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--grid-spacing')) || 15;
    }
    
    function getCellSize() {
        return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cell-size')) || 100;
    }

    function getPosition(r, c) {
        const spacing = getSpacing();
        const cellSize = getCellSize();
        return {
            top: spacing + r * (cellSize + spacing),
            left: spacing + c * (cellSize + spacing)
        };
    }

    // 窗口大小改变时重新计算位置（用于移动端响应式）
    window.addEventListener('resize', () => {
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (board[r][c]) {
                    const pos = getPosition(r, c);
                    board[r][c].element.style.transform = `translate(${pos.left}px, ${pos.top}px)`;
                }
            }
        }
    });

    function init() {
        // 初始化背景网格 (只执行一次)
        if (gridContainer.children.length === 0) {
            for (let i = 0; i < SIZE * SIZE; i++) {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell');
                gridContainer.appendChild(cell);
            }
        }

        board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
        score = 0;
        isGameOver = false;
        updateScore(0);
        tileContainer.innerHTML = '';
        messageElement.classList.remove('game-over', 'game-won');
        
        // 初始生成两个数字
        addRandomTile();
        addRandomTile();
    }

    function addRandomTile() {
        const emptyCells = [];
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (!board[r][c]) {
                    emptyCells.push({ r, c });
                }
            }
        }
        if (emptyCells.length === 0) return;
        
        const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const value = Math.random() < 0.9 ? 2 : 4;
        
        const tile = document.createElement('div');
        tile.className = `tile tile-${value} tile-new`;
        tile.textContent = value;
        
        const pos = getPosition(r, c);
        tile.style.transform = `translate(${pos.left}px, ${pos.top}px)`;
        tileContainer.appendChild(tile);
        
        board[r][c] = { value, element: tile };
    }

    function updateScore(add) {
        score += add;
        scoreElement.textContent = score;
    }

    // 键盘事件处理
    document.addEventListener('keydown', (e) => {
        if (isMoving || isGameOver) return;
        
        // 阻止方向键滚动页面
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
            e.preventDefault();
        }

        let moved = false;
        switch (e.key) {
            case 'ArrowUp': case 'w': moved = moveTiles(-1, 0); break;
            case 'ArrowDown': case 's': moved = moveTiles(1, 0); break;
            case 'ArrowLeft': case 'a': moved = moveTiles(0, -1); break;
            case 'ArrowRight': case 'd': moved = moveTiles(0, 1); break;
            default: return;
        }

        if (moved) {
            isMoving = true;
            setTimeout(() => {
                addRandomTile();
                checkGameOver();
                isMoving = false;
            }, 150); // 等待 CSS 动画完成 (0.15s)
        }
    });

    // 触控事件处理（支持移动端滑动）
    let touchStartX = 0;
    let touchStartY = 0;
    document.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, {passive: false});

    document.addEventListener('touchend', e => {
        if (isMoving || isGameOver) return;
        let touchEndX = e.changedTouches[0].screenX;
        let touchEndY = e.changedTouches[0].screenY;
        
        let dx = touchEndX - touchStartX;
        let dy = touchEndY - touchStartY;
        
        // 忽略轻击
        if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return; 
        
        let moved = false;
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) moved = moveTiles(0, 1); // 右
            else moved = moveTiles(0, -1); // 左
        } else {
            if (dy > 0) moved = moveTiles(1, 0); // 下
            else moved = moveTiles(-1, 0); // 上
        }
        
        if (moved) {
            isMoving = true;
            setTimeout(() => {
                addRandomTile();
                checkGameOver();
                isMoving = false;
            }, 150);
        }
    });

    function moveTiles(dr, dc) {
        let moved = false;
        // 记录本回合已合并过的位置
        const mergedThisTurn = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
        
        // 决定遍历顺序，保证移动方向的最前端先处理
        const rOrder = dr === 1 ? [3, 2, 1, 0] : [0, 1, 2, 3];
        const cOrder = dc === 1 ? [3, 2, 1, 0] : [0, 1, 2, 3];
        
        for (let r of rOrder) {
            for (let c of cOrder) {
                if (!board[r][c]) continue;
                
                let currR = r;
                let currC = c;
                let nextR = currR + dr;
                let nextC = currC + dc;
                
                // 尽可能向目标方向滑动
                while (
                    nextR >= 0 && nextR < SIZE && 
                    nextC >= 0 && nextC < SIZE && 
                    !board[nextR][nextC]
                ) {
                    currR = nextR;
                    currC = nextC;
                    nextR += dr;
                    nextC += dc;
                }
                
                // 检查是否能合并
                if (
                    nextR >= 0 && nextR < SIZE && 
                    nextC >= 0 && nextC < SIZE && 
                    board[nextR][nextC].value === board[r][c].value && 
                    !mergedThisTurn[nextR][nextC]
                ) {
                    // 合并逻辑
                    const sourceTile = board[r][c];
                    const targetTile = board[nextR][nextC];
                    
                    board[r][c] = null;
                    const newValue = targetTile.value * 2;
                    board[nextR][nextC] = { value: newValue, element: targetTile.element };
                    mergedThisTurn[nextR][nextC] = true;
                    
                    // 动画: 源图块滑向目标位置
                    const pos = getPosition(nextR, nextC);
                    sourceTile.element.style.transform = `translate(${pos.left}px, ${pos.top}px)`;
                    sourceTile.element.style.zIndex = '1'; // 滑动时位于底层
                    
                    updateScore(newValue);
                    if (newValue === 2048) {
                        setTimeout(() => {
                            if(!isGameOver) {
                                messageText.textContent = '你赢了!';
                                messageElement.classList.add('game-won');
                            }
                        }, 200);
                    }
                    
                    // 动画结束后移除源节点并更新目标节点的值
                    setTimeout(() => {
                        sourceTile.element.remove();
                        targetTile.element.textContent = newValue;
                        targetTile.element.className = `tile tile-${newValue > 2048 ? 'super' : newValue} tile-merged`;
                    }, 150);
                    
                    moved = true;
                } else if (currR !== r || currC !== c) {
                    // 仅移动
                    board[currR][currC] = board[r][c];
                    board[r][c] = null;
                    
                    const pos = getPosition(currR, currC);
                    board[currR][currC].element.style.transform = `translate(${pos.left}px, ${pos.top}px)`;
                    // 移除旧动画类名
                    board[currR][currC].element.className = `tile tile-${board[currR][currC].value > 2048 ? 'super' : board[currR][currC].value}`;
                    moved = true;
                } else {
                    // 未发生移动，重置动画类名避免重新触发
                    board[r][c].element.className = `tile tile-${board[r][c].value > 2048 ? 'super' : board[r][c].value}`;
                }
            }
        }
        
        return moved;
    }

    function checkGameOver() {
        // 是否有空格
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (!board[r][c]) return;
            }
        }
        
        // 是否有可合并的相邻方块
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                const val = board[r][c].value;
                if (r < SIZE - 1 && board[r+1][c].value === val) return;
                if (c < SIZE - 1 && board[r][c+1].value === val) return;
            }
        }
        
        isGameOver = true;
        messageText.textContent = '游戏结束!';
        messageElement.classList.add('game-over');
    }

    document.getElementById('restart-btn').addEventListener('click', init);
    document.querySelector('.retry-button').addEventListener('click', init);

    // 启动游戏
    init();
});