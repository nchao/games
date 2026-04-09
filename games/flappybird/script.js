const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GRAVITY = 0.25;
const JUMP = -4.5;
const PIPE_SPEED = 2;
const PIPE_WIDTH = 50;
const PIPE_GAP = 120;
const BIRD_RADIUS = 12;

let bird;
let pipes;
let score;
let gameState; // 'start', 'playing', 'gameover'
let frames;

function init() {
    bird = {
        x: 50,
        y: canvas.height / 2,
        velocity: 0
    };
    pipes = [];
    score = 0;
    gameState = 'start';
    frames = 0;
}

function drawBird() {
    // Body
    ctx.fillStyle = '#f2b705';
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, BIRD_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(bird.x + 4, bird.y - 4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(bird.x + 5, bird.y - 4, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Beak
    ctx.fillStyle = '#e65f33';
    ctx.beginPath();
    ctx.moveTo(bird.x + BIRD_RADIUS - 2, bird.y);
    ctx.lineTo(bird.x + BIRD_RADIUS + 8, bird.y + 4);
    ctx.lineTo(bird.x + BIRD_RADIUS - 2, bird.y + 8);
    ctx.fill();
    ctx.stroke();
}

function updateBird() {
    bird.velocity += GRAVITY;
    bird.y += bird.velocity;
}

function drawPipes() {
    ctx.fillStyle = '#73bf2e';
    ctx.strokeStyle = '#543847';
    ctx.lineWidth = 2;
    
    for (let i = 0; i < pipes.length; i++) {
        let p = pipes[i];
        
        // Top pipe body
        ctx.fillRect(p.x, 0, PIPE_WIDTH, p.top);
        ctx.strokeRect(p.x, 0, PIPE_WIDTH, p.top);
        
        // Top pipe cap
        ctx.fillRect(p.x - 2, p.top - 20, PIPE_WIDTH + 4, 20);
        ctx.strokeRect(p.x - 2, p.top - 20, PIPE_WIDTH + 4, 20);
        
        // Bottom pipe body
        ctx.fillRect(p.x, canvas.height - p.bottom, PIPE_WIDTH, p.bottom);
        ctx.strokeRect(p.x, canvas.height - p.bottom, PIPE_WIDTH, p.bottom);
        
        // Bottom pipe cap
        ctx.fillRect(p.x - 2, canvas.height - p.bottom, PIPE_WIDTH + 4, 20);
        ctx.strokeRect(p.x - 2, canvas.height - p.bottom, PIPE_WIDTH + 4, 20);
    }
}

function updatePipes() {
    if (frames % 100 === 0) {
        let minHeight = 50;
        let maxHeight = canvas.height - 20 - PIPE_GAP - minHeight;
        let topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1) + minHeight);
        let bottomHeight = canvas.height - 20 - PIPE_GAP - topHeight;
        
        pipes.push({
            x: canvas.width,
            top: topHeight,
            bottom: bottomHeight,
            passed: false
        });
    }
    
    for (let i = 0; i < pipes.length; i++) {
        let p = pipes[i];
        p.x -= PIPE_SPEED;
        
        // Collision detection
        let birdLeft = bird.x - BIRD_RADIUS;
        let birdRight = bird.x + BIRD_RADIUS;
        let birdTop = bird.y - BIRD_RADIUS;
        let birdBottom = bird.y + BIRD_RADIUS;
        
        if (birdRight > p.x && birdLeft < p.x + PIPE_WIDTH) {
            if (birdTop < p.top || birdBottom > canvas.height - p.bottom) {
                gameState = 'gameover';
            }
        }
        
        // Score update
        if (p.x + PIPE_WIDTH < birdLeft && !p.passed) {
            score++;
            p.passed = true;
        }
    }
    
    // Remove off-screen pipes
    if (pipes.length > 0 && pipes[0].x + PIPE_WIDTH + 4 < 0) {
        pipes.shift();
    }
}

function drawScore() {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    
    ctx.strokeText(score, canvas.width / 2, 50);
    ctx.fillText(score, canvas.width / 2, 50);
}

function drawGround() {
    ctx.fillStyle = '#ded895';
    ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
    
    ctx.fillStyle = '#73bf2e';
    ctx.fillRect(0, canvas.height - 20, canvas.width, 5);
    
    ctx.strokeStyle = '#543847';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 20);
    ctx.lineTo(canvas.width, canvas.height - 20);
    ctx.stroke();
}

function drawStartScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    
    ctx.strokeText('Flappy Bird', canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillText('Flappy Bird', canvas.width / 2, canvas.height / 2 - 20);
    
    ctx.lineWidth = 2;
    ctx.font = 'bold 16px Arial';
    ctx.strokeText('Click or Space to Start', canvas.width / 2, canvas.height / 2 + 20);
    ctx.fillText('Click or Space to Start', canvas.width / 2, canvas.height / 2 + 20);
}

function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    
    ctx.strokeText('Game Over', canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 20);
    
    ctx.lineWidth = 3;
    ctx.font = 'bold 24px Arial';
    ctx.strokeText('Score: ' + score, canvas.width / 2, canvas.height / 2 + 20);
    ctx.fillText('Score: ' + score, canvas.width / 2, canvas.height / 2 + 20);
    
    ctx.lineWidth = 2;
    ctx.font = 'bold 16px Arial';
    ctx.strokeText('Click or Space to Restart', canvas.width / 2, canvas.height / 2 + 60);
    ctx.fillText('Click or Space to Restart', canvas.width / 2, canvas.height / 2 + 60);
}

function loop() {
    // Clear canvas
    ctx.fillStyle = '#70c5ce';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (gameState === 'start') {
        drawGround();
        drawBird();
        drawStartScreen();
    } else if (gameState === 'playing') {
        updateBird();
        updatePipes();
        
        // Ground and ceiling collision
        if (bird.y + BIRD_RADIUS >= canvas.height - 20 || bird.y - BIRD_RADIUS <= 0) {
            gameState = 'gameover';
        }
        
        drawPipes();
        drawGround();
        drawBird();
        drawScore();
        frames++;
    } else if (gameState === 'gameover') {
        drawPipes();
        drawGround();
        drawBird();
        drawGameOverScreen();
    }
    
    requestAnimationFrame(loop);
}

function jump() {
    if (gameState === 'start') {
        gameState = 'playing';
        bird.velocity = JUMP;
    } else if (gameState === 'playing') {
        bird.velocity = JUMP;
    } else if (gameState === 'gameover') {
        init();
    }
}

document.addEventListener('keydown', function(e) {
    if (e.code === 'Space') {
        jump();
    }
});

canvas.addEventListener('mousedown', jump);
canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    jump();
}, { passive: false });

init();
loop();
