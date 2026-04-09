const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');

// Game state
let score = 0;
let lives = 3;
let isGameOver = false;
let isGameWon = false;

// Paddle
const paddle = {
    x: canvas.width / 2 - 50,
    y: canvas.height - 20,
    width: 100,
    height: 10,
    speed: 8,
    dx: 0,
    laserActive: false,
    laserTimer: 0
};

// Balls
let balls = [];

function createBall() {
    return {
        x: canvas.width / 2,
        y: canvas.height - 30,
        radius: 6,
        speed: 5,
        dx: 4 * (Math.random() > 0.5 ? 1 : -1),
        dy: -4
    };
}
balls.push(createBall());

// Bricks
const brickRowCount = 5;
const brickColumnCount = 9;
const brickWidth = 75;
const brickHeight = 20;
const brickPadding = 10;
const brickOffsetTop = 50;
const brickOffsetLeft = (canvas.width - (brickColumnCount * (brickWidth + brickPadding) - brickPadding)) / 2;

let bricks = [];
function initBricks() {
    bricks = [];
    for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < brickRowCount; r++) {
            bricks[c][r] = { x: 0, y: 0, status: 1 };
        }
    }
}
initBricks();

// Power-ups
let powerUps = [];
const POWERUP_TYPES = ['multiball', 'laser'];

// Lasers
let lasers = [];

// Controls
let rightPressed = false;
let leftPressed = false;
let spacePressed = false;
let spaceJustPressed = false;

document.addEventListener('keydown', keyDownHandler);
document.addEventListener('keyup', keyUpHandler);

function keyDownHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') rightPressed = true;
    else if (e.key === 'Left' || e.key === 'ArrowLeft') leftPressed = true;
    else if (e.key === ' ' || e.code === 'Space') {
        if (!spacePressed) spaceJustPressed = true;
        spacePressed = true;
    }
}

function keyUpHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') rightPressed = false;
    else if (e.key === 'Left' || e.key === 'ArrowLeft') leftPressed = false;
    else if (e.key === ' ' || e.code === 'Space') spacePressed = false;
}

function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.fillStyle = paddle.laserActive ? '#00ffff' : '#0095DD';
    ctx.fill();
    ctx.closePath();
    
    if (paddle.laserActive) {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(paddle.x, paddle.y - 5, 5, 10);
        ctx.fillRect(paddle.x + paddle.width - 5, paddle.y - 5, 5, 10);
    }
}

function drawBalls() {
    balls.forEach(ball => {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffeb3b';
        ctx.fill();
        ctx.closePath();
    });
}

function drawBricks() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status === 1) {
                const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
                const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;
                ctx.beginPath();
                ctx.rect(brickX, brickY, brickWidth, brickHeight);
                const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5'];
                ctx.fillStyle = colors[r % colors.length];
                ctx.fill();
                ctx.closePath();
            }
        }
    }
}

function drawPowerUps() {
    powerUps.forEach(p => {
        ctx.beginPath();
        ctx.rect(p.x, p.y, p.width, p.height);
        ctx.fillStyle = p.type === 'multiball' ? '#4caf50' : '#00bcd4';
        ctx.fill();
        ctx.closePath();
        
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.type === 'multiball' ? 'M' : 'L', p.x + p.width / 2, p.y + p.height / 2);
    });
}

function drawLasers() {
    ctx.fillStyle = '#ff0000';
    lasers.forEach(l => {
        ctx.beginPath();
        ctx.rect(l.x, l.y, l.width, l.height);
        ctx.fill();
        ctx.closePath();
    });
}

function spawnPowerUp(x, y) {
    if (Math.random() < 0.25) { // 25% chance
        const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
        powerUps.push({
            x: x + brickWidth / 2 - 10,
            y: y,
            width: 20,
            height: 20,
            type: type,
            dy: 2
        });
    }
}

function collisionDetection() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            const b = bricks[c][r];
            if (b.status === 1) {
                // Ball collision
                balls.forEach(ball => {
                    if (
                        ball.x + ball.radius > b.x &&
                        ball.x - ball.radius < b.x + brickWidth &&
                        ball.y + ball.radius > b.y &&
                        ball.y - ball.radius < b.y + brickHeight
                    ) {
                        ball.dy = -ball.dy;
                        b.status = 0;
                        score += 10;
                        scoreElement.innerText = score;
                        spawnPowerUp(b.x, b.y);
                        checkWin();
                    }
                });
                
                // Laser collision
                lasers.forEach((laser, lIndex) => {
                    if (
                        laser.x < b.x + brickWidth &&
                        laser.x + laser.width > b.x &&
                        laser.y < b.y + brickHeight &&
                        laser.y + laser.height > b.y
                    ) {
                        b.status = 0;
                        lasers.splice(lIndex, 1);
                        score += 10;
                        scoreElement.innerText = score;
                        spawnPowerUp(b.x, b.y);
                        checkWin();
                    }
                });
            }
        }
    }
}

function checkWin() {
    let allDestroyed = true;
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status === 1) {
                allDestroyed = false;
                break;
            }
        }
    }
    if (allDestroyed) {
        isGameWon = true;
    }
}

function update() {
    if (isGameOver || isGameWon) return;

    if (rightPressed && paddle.x < canvas.width - paddle.width) {
        paddle.x += paddle.speed;
    } else if (leftPressed && paddle.x > 0) {
        paddle.x -= paddle.speed;
    }

    if (paddle.laserActive && spaceJustPressed) {
        lasers.push({ x: paddle.x + 2, y: paddle.y - 10, width: 3, height: 15, dy: -7 });
        lasers.push({ x: paddle.x + paddle.width - 5, y: paddle.y - 10, width: 3, height: 15, dy: -7 });
    }
    spaceJustPressed = false;

    if (paddle.laserActive) {
        paddle.laserTimer--;
        if (paddle.laserTimer <= 0) {
            paddle.laserActive = false;
        }
    }

    for (let i = balls.length - 1; i >= 0; i--) {
        let ball = balls[i];
        ball.x += ball.dx;
        ball.y += ball.dy;

        if (ball.x + ball.dx > canvas.width - ball.radius || ball.x + ball.dx < ball.radius) {
            ball.dx = -ball.dx;
        }
        if (ball.y + ball.dy < ball.radius) {
            ball.dy = -ball.dy;
        } else if (ball.y + ball.dy > paddle.y - ball.radius && ball.y < paddle.y) {
            if (ball.x > paddle.x && ball.x < paddle.x + paddle.width) {
                ball.y = paddle.y - ball.radius;
                let hitPoint = ball.x - (paddle.x + paddle.width / 2);
                ball.dx = hitPoint * 0.15;
                ball.dy = -Math.abs(ball.dy);
            }
        } else if (ball.y + ball.dy > canvas.height - ball.radius) {
            balls.splice(i, 1);
            if (balls.length === 0) {
                lives--;
                livesElement.innerText = lives;
                if (lives <= 0) {
                    isGameOver = true;
                } else {
                    balls.push(createBall());
                    paddle.x = canvas.width / 2 - paddle.width / 2;
                    paddle.laserActive = false;
                }
            }
        }
    }

    for (let i = powerUps.length - 1; i >= 0; i--) {
        let p = powerUps[i];
        p.y += p.dy;

        if (
            p.x < paddle.x + paddle.width &&
            p.x + p.width > paddle.x &&
            p.y < paddle.y + paddle.height &&
            p.y + p.height > paddle.y
        ) {
            if (p.type === 'multiball') {
                if (balls.length > 0) {
                    let baseBall = balls[0];
                    let b1 = createBall(); b1.x = baseBall.x; b1.y = baseBall.y; b1.dx = baseBall.dx + 1; b1.dy = -Math.abs(baseBall.dy);
                    let b2 = createBall(); b2.x = baseBall.x; b2.y = baseBall.y; b2.dx = baseBall.dx - 1; b2.dy = -Math.abs(baseBall.dy);
                    balls.push(b1, b2);
                } else {
                    balls.push(createBall(), createBall(), createBall());
                }
            } else if (p.type === 'laser') {
                paddle.laserActive = true;
                paddle.laserTimer = 600;
            }
            powerUps.splice(i, 1);
        } else if (p.y > canvas.height) {
            powerUps.splice(i, 1);
        }
    }

    for (let i = lasers.length - 1; i >= 0; i--) {
        let l = lasers[i];
        l.y += l.dy;
        if (l.y < 0) {
            lasers.splice(i, 1);
        }
    }

    collisionDetection();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBricks();
    drawPaddle();
    drawBalls();
    drawPowerUps();
    drawLasers();

    if (isGameOver) {
        ctx.font = '40px Arial';
        ctx.fillStyle = '#ff0000';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
        ctx.font = '20px Arial';
        ctx.fillText('Refresh to play again', canvas.width / 2, canvas.height / 2 + 40);
    } else if (isGameWon) {
        ctx.font = '40px Arial';
        ctx.fillStyle = '#4caf50';
        ctx.textAlign = 'center';
        ctx.fillText('YOU WIN!', canvas.width / 2, canvas.height / 2);
        ctx.font = '20px Arial';
        ctx.fillText('Refresh to play again', canvas.width / 2, canvas.height / 2 + 40);
    }

    update();
    
    if (!isGameOver && !isGameWon) {
        requestAnimationFrame(draw);
    }
}

draw();