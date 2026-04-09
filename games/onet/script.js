const R = 8;
const C = 12;
const ROWS = R + 2;
const COLS = C + 2;

const EMOJIS = ['🍎','🍌','🍇','🍉','🍓','🍒','🍑','🍍','🥝','🍅','🍆','🥑','🥦','🌽','🥕','🍄','🍔','🍟','🍕','🌭'];

let board = [];
let selected = null;
let isAnimating = false;

function initGame() {
    document.getElementById('modal').style.display = 'none';
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';
    boardEl.style.gridTemplateColumns = `repeat(${COLS}, 45px)`;
    boardEl.style.gridTemplateRows = `repeat(${ROWS}, 45px)`;

    let items = [];
    let numPairs = (R * C) / 2;
    for (let i = 0; i < numPairs; i++) {
        let emoji = EMOJIS[i % EMOJIS.length];
        items.push(emoji, emoji);
    }
    items.sort(() => Math.random() - 0.5);

    board = [];
    for (let r = 0; r < ROWS; r++) {
        board[r] = [];
        for (let c = 0; c < COLS; c++) {
            const cell = document.createElement('div');
            cell.id = `cell-${r}-${c}`;
            cell.className = 'cell';
            
            if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
                board[r][c] = 0;
                cell.classList.add('empty');
            } else {
                board[r][c] = items.pop();
                cell.textContent = board[r][c];
                cell.addEventListener('click', () => onCellClick(r, c));
            }
            boardEl.appendChild(cell);
        }
    }
    
    selected = null;
    isAnimating = false;
    clearPath();
    
    ensurePlayable();
}

function getCellCenter(r, c) {
    const cell = document.getElementById(`cell-${r}-${c}`);
    if (!cell) return {x: 0, y: 0};
    return {
        x: cell.offsetLeft + cell.offsetWidth / 2,
        y: cell.offsetTop + cell.offsetHeight / 2
    };
}

function getStraightPath(p1, p2) {
    if (p1.r !== p2.r && p1.c !== p2.c) return null;
    if (p1.r === p2.r) {
        let minC = Math.min(p1.c, p2.c);
        let maxC = Math.max(p1.c, p2.c);
        for (let c = minC + 1; c < maxC; c++) {
            if (board[p1.r][c] !== 0) return null;
        }
        return [p1, p2];
    } else {
        let minR = Math.min(p1.r, p2.r);
        let maxR = Math.max(p1.r, p2.r);
        for (let r = minR + 1; r < maxR; r++) {
            if (board[r][p1.c] !== 0) return null;
        }
        return [p1, p2];
    }
}

function get1TurnPath(p1, p2) {
    // corner 1: (p1.r, p2.c)
    if (board[p1.r][p2.c] === 0) {
        let path1 = getStraightPath(p1, {r: p1.r, c: p2.c});
        let path2 = getStraightPath({r: p1.r, c: p2.c}, p2);
        if (path1 && path2) return [p1, {r: p1.r, c: p2.c}, p2];
    }
    // corner 2: (p2.r, p1.c)
    if (board[p2.r][p1.c] === 0) {
        let path1 = getStraightPath(p1, {r: p2.r, c: p1.c});
        let path2 = getStraightPath({r: p2.r, c: p1.c}, p2);
        if (path1 && path2) return [p1, {r: p2.r, c: p1.c}, p2];
    }
    return null;
}

function get2TurnPath(p1, p2) {
    // scan horizontally from p1
    for (let dir of [-1, 1]) {
        let c = p1.c + dir;
        while (c >= 0 && c < COLS) {
            if (board[p1.r][c] !== 0) break;
            let path1Turn = get1TurnPath({r: p1.r, c}, p2);
            if (path1Turn) {
                return [p1, {r: p1.r, c}, ...path1Turn.slice(1)];
            }
            c += dir;
        }
    }
    // scan vertically from p1
    for (let dir of [-1, 1]) {
        let r = p1.r + dir;
        while (r >= 0 && r < ROWS) {
            if (board[r][p1.c] !== 0) break;
            let path1Turn = get1TurnPath({r, c: p1.c}, p2);
            if (path1Turn) {
                return [p1, {r, c: p1.c}, ...path1Turn.slice(1)];
            }
            r += dir;
        }
    }
    return null;
}

function getPath(p1, p2) {
    let p = getStraightPath(p1, p2);
    if (p) return p;
    p = get1TurnPath(p1, p2);
    if (p) return p;
    p = get2TurnPath(p1, p2);
    return p;
}

function onCellClick(r, c) {
    if (isAnimating) return;
    if (board[r][c] === 0) return;
    
    if (!selected) {
        selected = {r, c};
        document.getElementById(`cell-${r}-${c}`).classList.add('selected');
    } else {
        if (selected.r === r && selected.c === c) {
            document.getElementById(`cell-${r}-${c}`).classList.remove('selected');
            selected = null;
            return;
        }
        
        if (board[selected.r][selected.c] === board[r][c]) {
            let path = getPath(selected, {r, c});
            if (path) {
                isAnimating = true;
                drawPath(path);
                
                let sr = selected.r, sc = selected.c;
                board[sr][sc] = 0;
                board[r][c] = 0;
                
                document.getElementById(`cell-${sr}-${sc}`).classList.remove('selected');
                
                setTimeout(() => {
                    let cell1 = document.getElementById(`cell-${sr}-${sc}`);
                    let cell2 = document.getElementById(`cell-${r}-${c}`);
                    
                    if (cell1) {
                        cell1.className = 'cell empty';
                        cell1.textContent = '';
                    }
                    if (cell2) {
                        cell2.className = 'cell empty';
                        cell2.textContent = '';
                    }
                    
                    clearPath();
                    selected = null;
                    isAnimating = false;
                    
                    if (checkWin()) {
                        setTimeout(() => {
                            document.getElementById('modal').style.display = 'flex';
                        }, 100);
                    } else {
                        ensurePlayable();
                    }
                }, 300);
                return;
            }
        }
        
        document.getElementById(`cell-${selected.r}-${selected.c}`).classList.remove('selected');
        selected = {r, c};
        document.getElementById(`cell-${r}-${c}`).classList.add('selected');
    }
}

function drawPath(path) {
    const svg = document.getElementById('path-svg');
    svg.innerHTML = '';
    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute('fill', 'none');
    polyline.setAttribute('stroke', '#ff3366');
    polyline.setAttribute('stroke-width', '4');
    polyline.setAttribute('stroke-linejoin', 'round');
    
    let points = path.map(p => {
        let center = getCellCenter(p.r, p.c);
        return `${center.x},${center.y}`;
    }).join(' ');
    
    polyline.setAttribute('points', points);
    svg.appendChild(polyline);
}

function clearPath() {
    document.getElementById('path-svg').innerHTML = '';
}

function checkWin() {
    for (let r = 1; r <= R; r++) {
        for (let c = 1; c <= C; c++) {
            if (board[r][c] !== 0) return false;
        }
    }
    return true;
}

function hasAvailableMoves() {
    let positions = {};
    for (let r = 1; r <= R; r++) {
        for (let c = 1; c <= C; c++) {
            let item = board[r][c];
            if (item !== 0) {
                if (!positions[item]) positions[item] = [];
                positions[item].push({r, c});
            }
        }
    }
    
    for (let item in positions) {
        let list = positions[item];
        for (let i = 0; i < list.length; i++) {
            for (let j = i + 1; j < list.length; j++) {
                if (getPath(list[i], list[j])) return true;
            }
        }
    }
    return false;
}

function shuffleBoard() {
    let items = [];
    for (let r = 1; r <= R; r++) {
        for (let c = 1; c <= C; c++) {
            if (board[r][c] !== 0) {
                items.push(board[r][c]);
            }
        }
    }
    items.sort(() => Math.random() - 0.5);
    for (let r = 1; r <= R; r++) {
        for (let c = 1; c <= C; c++) {
            if (board[r][c] !== 0) {
                board[r][c] = items.pop();
                document.getElementById(`cell-${r}-${c}`).textContent = board[r][c];
            }
        }
    }
}

function ensurePlayable() {
    let remaining = 0;
    for (let r = 1; r <= R; r++) {
        for (let c = 1; c <= C; c++) {
            if (board[r][c] !== 0) remaining++;
        }
    }
    if (remaining === 0) return;
    
    let shuffles = 0;
    while (!hasAvailableMoves() && shuffles < 10) {
        shuffleBoard();
        shuffles++;
    }
}

document.getElementById('restart-btn').addEventListener('click', initGame);
document.getElementById('modal-restart-btn').addEventListener('click', initGame);

window.onload = initGame;
