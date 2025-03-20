/**
 * 游戏特效系统
 */

// 粒子类
class Particle {
    constructor(x, y, color, speed, angle, size, life) {
        this.x = x;
        this.y = y;
        this.originalSize = size;
        this.size = size;
        this.color = color;
        this.speed = speed;
        this.angle = angle;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = life;
        this.maxLife = life;
        this.alive = true;
    }

    update() {
        if (!this.alive) return;

        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        this.size = this.originalSize * (this.life / this.maxLife);

        if (this.life <= 0) {
            this.alive = false;
        }
    }

    draw(ctx) {
        if (!this.alive) return;

        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// 粒子系统
class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    createExplosion(x, y, color, count = 20) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = randomFloat(1, 3);
            const size = randomFloat(2, 5);
            const life = randomInt(20, 40);
            this.particles.push(new Particle(x, y, color, speed, angle, size, life));
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (!this.particles[i].alive) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        for (const particle of this.particles) {
            particle.draw(ctx);
        }
    }
}

// 拖尾效果
class TrailEffect {
    constructor(maxTrails = 5) {
        this.maxTrails = maxTrails;
        this.trails = [];
    }

    addTrail(x, y, radius, color) {
        this.trails.unshift({ x, y, radius, color, alpha: 0.7 });
        if (this.trails.length > this.maxTrails) {
            this.trails.pop();
        }
    }

    update() {
        for (let i = 0; i < this.trails.length; i++) {
            this.trails[i].alpha *= 0.85; // 逐渐减少透明度
        }
    }

    draw(ctx) {
        for (let i = 0; i < this.trails.length; i++) {
            const trail = this.trails[i];
            ctx.globalAlpha = trail.alpha;
            ctx.fillStyle = trail.color;
            ctx.beginPath();
            ctx.arc(trail.x, trail.y, trail.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
}

// 文字动画效果
class TextEffect {
    constructor() {
        this.texts = [];
    }

    addText(text, x, y, color, size, duration) {
        this.texts.push({
            text,
            x,
            y,
            color,
            size,
            alpha: 1,
            scale: 1,
            life: duration,
            maxLife: duration
        });
    }

    update() {
        for (let i = this.texts.length - 1; i >= 0; i--) {
            const text = this.texts[i];
            text.life--;
            text.y -= 1;
            
            if (text.life > text.maxLife * 0.7) {
                text.scale = lerp(1, 1.5, (text.maxLife - text.life) / (text.maxLife * 0.3));
            } else {
                text.alpha = text.life / (text.maxLife * 0.7);
            }
            
            if (text.life <= 0) {
                this.texts.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        for (const text of this.texts) {
            ctx.save();
            ctx.globalAlpha = text.alpha;
            ctx.fillStyle = text.color;
            ctx.font = `${text.size * text.scale}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // 添加文字描边
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.strokeText(text.text, text.x, text.y);
            
            ctx.fillText(text.text, text.x, text.y);
            ctx.restore();
        }
    }
}

// 屏幕震动效果
class ScreenShake {
    constructor() {
        this.shakeAmount = 0;
        this.shakeDuration = 0;
        this.shakeIntensity = 0;
    }

    shake(intensity, duration) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
        this.shakeAmount = intensity;
    }

    update() {
        if (this.shakeDuration > 0) {
            this.shakeDuration--;
            this.shakeAmount = this.shakeIntensity * (this.shakeDuration / 10);
        } else {
            this.shakeAmount = 0;
        }
    }

    getOffset() {
        if (this.shakeAmount === 0) return { x: 0, y: 0 };
        
        return {
            x: (Math.random() * 2 - 1) * this.shakeAmount,
            y: (Math.random() * 2 - 1) * this.shakeAmount
        };
    }
}

// 砖块缩放效果
class BrickScaleEffect {
    constructor() {
        this.bricks = new Map();
    }

    addBrick(id, duration, startScale = 1.1, endScale = 1.0) {
        this.bricks.set(id, {
            life: duration,
            maxLife: duration,
            startScale,
            endScale,
            currentScale: startScale
        });
    }

    update() {
        for (const [id, brick] of this.bricks.entries()) {
            brick.life--;
            const progress = 1 - brick.life / brick.maxLife;
            brick.currentScale = lerp(brick.startScale, brick.endScale, progress);
            
            if (brick.life <= 0) {
                this.bricks.delete(id);
            }
        }
    }

    getScale(id) {
        return this.bricks.has(id) ? this.bricks.get(id).currentScale : 1;
    }
}

// 音效管理器
class SoundManager {
    constructor() {
        this.sounds = {
            hit: new Howl({
                src: ['https://assets.codepen.io/21542/howler-sfx-levelup.mp3'],
                volume: 0.5
            }),
            brick: new Howl({
                src: ['https://assets.codepen.io/21542/howler-sfx-explosion.mp3'],
                volume: 0.3
            }),
            combo: new Howl({
                src: ['https://assets.codepen.io/21542/howler-sfx-coin.mp3'],
                volume: 0.4
            }),
            gameOver: new Howl({
                src: ['https://assets.codepen.io/21542/howler-sfx-gameover.mp3'],
                volume: 0.7
            }),
            background: new Howl({
                src: ['https://assets.codepen.io/21542/howler-sfx-bg-music.mp3'],
                volume: 0.2,
                loop: true
            })
        };
    }

    play(sound) {
        if (this.sounds[sound]) {
            this.sounds[sound].play();
        }
    }

    stopBackground() {
        this.sounds.background.stop();
    }

    startBackground() {
        this.sounds.background.play();
    }
}

// 创建全局特效对象
const effectsManager = {
    particles: new ParticleSystem(),
    trail: new TrailEffect(),
    text: new TextEffect(),
    shake: new ScreenShake(),
    brickScale: new BrickScaleEffect(),
    sound: new SoundManager()
};