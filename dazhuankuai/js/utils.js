/**
 * 游戏工具函数集
 */

// 碰撞检测 - 圆形与矩形
function circleRectCollision(circle, rect) {
    // 找到圆心最近的矩形上的点
    let closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
    let closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
    
    // 计算圆心到最近点的距离
    let distanceX = circle.x - closestX;
    let distanceY = circle.y - closestY;
    let distanceSquared = distanceX * distanceX + distanceY * distanceY;
    
    // 如果距离小于半径，则发生碰撞
    return distanceSquared < (circle.radius * circle.radius);
}

// 随机数生成 - 整数范围
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 随机数生成 - 浮点数范围
function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

// 角度转弧度
function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

// 弧度转角度
function radToDeg(radians) {
    return radians * 180 / Math.PI;
}

// HSL颜色转字符串
function hslToString(h, s, l) {
    return `hsl(${h}, ${s}%, ${l}%)`;
}

// 生成UUID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// 线性插值函数
function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}

// 向量标准化
function normalizeVector(vector) {
    const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    if (magnitude === 0) return { x: 0, y: 0 };
    return { x: vector.x / magnitude, y: vector.y / magnitude };
}

// 格式化分数显示
function formatScore(score) {
    return score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// 节流函数 - 限制函数在特定时间内只能调用一次
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 延迟执行函数
function debounce(func, delay) {
    let debounceTimer;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(context, args), delay);
    };
}

// 存储游戏数据到localStorage
function saveGameData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// 从localStorage读取游戏数据
function loadGameData(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}

// 比较两个值并返回最大值
function getHighScore(currentScore) {
    const highScore = loadGameData('highScore') || 0;
    const newHighScore = Math.max(currentScore, highScore);
    saveGameData('highScore', newHighScore);
    return newHighScore;
}

// 对象深拷贝
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
} 