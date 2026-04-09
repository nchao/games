const games = [
    { id: '2048', name: '2048', icon: '🔢', desc: '4×4网格滑动合并，挑战2048！' },
    { id: 'flappybird', name: 'Flappy Bird', icon: '🐦', desc: '控制小鸟穿梭水管，经典物理跳跃。' },
    { id: 'pong', name: 'Pong 乒乓', icon: '🏓', desc: '经典双挡板弹球，人机对战挑战。' },
    { id: 'spaceinvaders', name: '太空侵略者', icon: '👾', desc: '保卫地球，消灭不断逼近的外星阵列。' },
    { id: 'bubbleshooter', name: '打泡泡', icon: '🫧', desc: '同色消除，连通块掉落，经典泡泡龙玩法。' },
    { id: 'onet', name: '连连看 (Onet)', icon: '🔗', desc: '寻找相同图案，路径拐点≤2的连线消除。' },
    { id: 'minesweeper', name: '扫雷', icon: '💣', desc: '经典扫雷，逻辑推理，首次点击绝不踩雷。' },
    { id: 'sokoban', name: '推箱子', icon: '📦', desc: '经典解谜，推动箱子到达目标点，支持撤销。' },
    { id: 'rhythmclicker', name: '节奏点击', icon: '🎵', desc: '跟随音乐节奏，在判定线精准点击音符。' },
    { id: 'snake_variant', name: '贪吃蛇变体', icon: '🐍', desc: '穿墙机制、障碍物与特殊道具的贪吃蛇。' },
    { id: 'tetris_variant', name: '俄罗斯方块', icon: '🧱', desc: '支持 Hold 与 SRS 超级旋转的现代方块。' },
    { id: 'breakout_variant', name: '打砖块变体', icon: '🏏', desc: '包含多球、激光道具的强化版打砖块。' }
];

document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('game-grid');
    
    games.forEach(game => {
        const card = document.createElement('a');
        card.href = `games/${game.id}/index.html`;
        card.className = 'game-card';
        
        card.innerHTML = `
            <div class="game-icon">${game.icon}</div>
            <h2 class="game-title">${game.name}</h2>
            <p class="game-desc">${game.desc}</p>
        `;
        
        grid.appendChild(card);
    });
});