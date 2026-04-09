const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('start-btn');
const startScreen = document.getElementById('start-screen');
const scoreEl = document.getElementById('score');
const comboEl = document.getElementById('combo');
const feedbackEl = document.getElementById('feedback');

// 游戏配置
const config = {
    keys: ['d', 'f', 'j', 'k'],
    lanes: 4,
    laneWidth: canvas.width / 4,
    hitLineY: 500,
    noteHeight: 20,
    speed: 500, // 像素/秒 (音符下落速度)
    colors: ['#FF5252', '#448AFF', '#448AFF', '#FF5252'], // 轨道颜色
    hitWindow: {
        perfect: 50,  // ms
        great: 100,   // ms
        good: 150     // ms
    }
};

// 状态
let isPlaying = false;
let startTime = 0;
let score = 0;
let combo = 0;
let maxCombo = 0;
let animationId;
let activeNotes = [];
let pressedKeys = {};

// 击打特效数组
let hitEffects = [];

// 生成测试用谱面
function generateBeatmap() {
    const map = [];
    let time = 2000; // 2秒后第一个音符到达判定线
    for (let i = 0; i < 50; i++) {
        map.push({
            id: i,
            time: time,
            lane: Math.floor(Math.random() * config.lanes),
            hit: false,
            missed: false
        });
        // 随机间隔 300ms 到 800ms
        time += Math.floor(Math.random() * 500) + 300;
    }
    return map;
}

let beatmap = [];

// 初始化游戏
function initGame() {
    score = 0;
    combo = 0;
    maxCombo = 0;
    updateScoreBoard();
    beatmap = generateBeatmap();
    // 深拷贝谱面到活跃音符数组
    activeNotes = beatmap.map(note => ({ ...note }));
    hitEffects = [];
    
    isPlaying = true;
    startTime = Date.now();
    startScreen.style.display = 'none';
    
    // 重置反馈
    feedbackEl.style.opacity = 0;
    
    // 开始循环
    requestAnimationFrame(gameLoop);
}

// 更新计分板
function updateScoreBoard() {
    scoreEl.textContent = score;
    comboEl.textContent = combo;
    if (combo > maxCombo) {
        maxCombo = combo;
    }
}

// 显示打击反馈
function showFeedback(text, type) {
    feedbackEl.textContent = text;
    feedbackEl.className = `feedback-${type}`;
    feedbackEl.style.opacity = 1;
    feedbackEl.style.transform = 'translate(-50%, -50%) scale(1.2)';
    
    setTimeout(() => {
        feedbackEl.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 50);

    clearTimeout(feedbackEl.timeoutId);
    feedbackEl.timeoutId = setTimeout(() => {
        feedbackEl.style.opacity = 0;
    }, 400);
}

// 键盘按下
window.addEventListener('keydown', (e) => {
    if (!isPlaying) return;
    const key = e.key.toLowerCase();
    const laneIndex = config.keys.indexOf(key);
    
    if (laneIndex !== -1 && !pressedKeys[key]) {
        pressedKeys[key] = true;
        handleHit(laneIndex);
    }
});

// 键盘抬起
window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (pressedKeys[key]) {
        pressedKeys[key] = false;
    }
});

// 处理击打逻辑
function handleHit(laneIndex) {
    const currentTime = Date.now() - startTime;
    
    // 寻找当前轨道中未处理的音符，且在判定区间内
    // 只找最前面的一个
    let targetNote = null;
    for (let i = 0; i < activeNotes.length; i++) {
        const note = activeNotes[i];
        if (note.lane === laneIndex && !note.hit && !note.missed) {
            // 如果音符在判定区间内（无论是提前还是延后）
            if (Math.abs(note.time - currentTime) <= config.hitWindow.good + 50) {
                targetNote = note;
                break;
            }
        }
    }
    
    if (targetNote) {
        const timeDiff = Math.abs(targetNote.time - currentTime);
        
        if (timeDiff <= config.hitWindow.good) {
            targetNote.hit = true;
            combo++;
            
            if (timeDiff <= config.hitWindow.perfect) {
                score += 300;
                showFeedback('Perfect!', 'perfect');
            } else if (timeDiff <= config.hitWindow.great) {
                score += 100;
                showFeedback('Great', 'great');
            } else {
                score += 50;
                showFeedback('Good', 'good');
            }
            
            updateScoreBoard();
            addHitEffect(laneIndex);
        } else {
            // 太早击打（Bad/Miss）
            targetNote.missed = true;
            combo = 0;
            updateScoreBoard();
            showFeedback('Miss', 'miss');
        }
    }
}

// 添加击打特效
function addHitEffect(lane) {
    hitEffects.push({
        lane: lane,
        radius: 10,
        maxRadius: 40,
        alpha: 1
    });
}

// 绘制游戏画面
function draw(currentTime) {
    // 1. 清空画布
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 2. 绘制轨道分隔线和按键高亮
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    for (let i = 0; i < config.lanes; i++) {
        // 轨道分隔线
        if (i > 0) {
            ctx.beginPath();
            ctx.moveTo(i * config.laneWidth, 0);
            ctx.lineTo(i * config.laneWidth, canvas.height);
            ctx.stroke();
        }
        
        // 按键高亮
        const key = config.keys[i];
        if (pressedKeys[key]) {
            const gradient = ctx.createLinearGradient(0, config.hitLineY, 0, canvas.height);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(i * config.laneWidth, config.hitLineY, config.laneWidth, canvas.height - config.hitLineY);
            
            // 整个轨道微亮
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.fillRect(i * config.laneWidth, 0, config.laneWidth, config.hitLineY);
        }
    }
    
    // 3. 绘制判定线
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, config.hitLineY);
    ctx.lineTo(canvas.width, config.hitLineY);
    ctx.stroke();
    
    // 4. 绘制按键提示字母
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < config.lanes; i++) {
        const key = config.keys[i];
        ctx.fillStyle = pressedKeys[key] ? '#FFF' : '#888';
        ctx.fillText(key.toUpperCase(), i * config.laneWidth + config.laneWidth / 2, config.hitLineY + 40);
    }
    
    // 5. 绘制音符
    let allProcessed = true; // 检查是否所有音符都处理完毕
    
    for (let i = 0; i < activeNotes.length; i++) {
        const note = activeNotes[i];
        if (note.hit || note.missed) continue;
        
        allProcessed = false;
        
        // 计算当前Y坐标
        // 距离到达判定线的时间差
        const timeDiff = note.time - currentTime;
        
        // Y坐标 = 判定线Y - (时间差(秒) * 速度(像素/秒))
        const y = config.hitLineY - (timeDiff / 1000) * config.speed;
        
        // 判定 Miss (漏掉未击打，超出了Good判定区间)
        if (timeDiff < -config.hitWindow.good) {
            note.missed = true;
            combo = 0;
            updateScoreBoard();
            showFeedback('Miss', 'miss');
            continue;
        }
        
        // 只绘制在屏幕内的音符 (-50到canvas.height)
        if (y > -50 && y < canvas.height + 50) {
            ctx.fillStyle = config.colors[note.lane];
            const x = note.lane * config.laneWidth + 5;
            const w = config.laneWidth - 10;
            const h = config.noteHeight;
            
            // 绘制圆角矩形
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(x, y - h / 2, w, h, 8);
            } else {
                ctx.rect(x, y - h / 2, w, h);
            }
            ctx.fill();
            
            // 绘制高光
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillRect(x + 5, y - h / 2 + 2, w - 10, h / 3);
        }
    }
    
    // 6. 绘制击打特效
    for (let i = hitEffects.length - 1; i >= 0; i--) {
        const effect = hitEffects[i];
        ctx.beginPath();
        ctx.arc(effect.lane * config.laneWidth + config.laneWidth / 2, config.hitLineY, effect.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${effect.alpha})`;
        ctx.lineWidth = 4;
        ctx.stroke();
        
        effect.radius += 3;
        effect.alpha -= 0.08;
        
        if (effect.alpha <= 0) {
            hitEffects.splice(i, 1);
        }
    }
    
    // 7. 检查游戏结束
    // 最后一个音符的时间
    const lastNoteTime = beatmap.length > 0 ? beatmap[beatmap.length - 1].time : 0;
    if (allProcessed && currentTime > lastNoteTime + 1500) {
        endGame();
    }
}

// 游戏主循环
function gameLoop() {
    if (!isPlaying) return;
    
    const currentTime = Date.now() - startTime;
    draw(currentTime);
    
    animationId = requestAnimationFrame(gameLoop);
}

// 结束游戏
function endGame() {
    isPlaying = false;
    startScreen.style.display = 'flex';
    document.getElementById('start-title').textContent = '游戏结束';
    document.getElementById('start-desc').textContent = `最终得分: ${score} | 最大连击: ${maxCombo}`;
    startBtn.textContent = '重新开始';
}

startBtn.addEventListener('click', initGame);
