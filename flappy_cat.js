const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameContainer = document.getElementById('gameContainer');

let cat, pipes, bubbles, score, highScore, coinCount, currentCatIndex, groundY;
let gameState, lastTime, deltaTime;

const GAME_STATE = { MENU: 0, PLAYING: 1, GAME_OVER: 2 };
const GRAVITY = 0.2178; // Keep this the same
const JUMP_STRENGTH = -5.808; // Keep this the same
const PIPE_WIDTH = 100; // Keep this the same
const PIPE_GAP = 180; // Decreased by 10% from 200
const PIPE_SPEED = 1.71; // Increased by 5% from 1.628
const COIN_SIZE = 30;
const COIN_SPEED = 1.5;
const PIPE_SPAWN_DISTANCE = 270; // Decreased by 10% from 300

const catEmojis = ['🐱', '😺', '😸', '😻', '😽'];

const CAT_HITBOX_REDUCTION = 8;

function setCanvasSize() {
    canvas.width = gameContainer.clientWidth - 6;
    canvas.height = canvas.width * 1.8; // More portrait-oriented
    groundY = canvas.height - 50;
}

function init() {
    setCanvasSize();
    highScore = parseInt(localStorage.getItem('flappyCatHighScore')) || 0;
    coinCount = parseInt(localStorage.getItem('flappyCatCoinCount')) || 0;
    currentCatIndex = 0;
    gameState = GAME_STATE.MENU;
    createBubbles();
    lastTime = 0;
    gameLoop();
}

function createBubbles() {
    bubbles = Array(15).fill().map(() => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: 5 + Math.random() * 15,
        speed: 0.2 + Math.random() * 0.5
    }));
}

function gameLoop(timestamp) {
    deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function update() {
    if (gameState === GAME_STATE.PLAYING) {
        updateCat();
        updatePipes();
        updateBubbles();
        checkCollisions();
    }
    updateBubbles();
}

function updateCat() {
    cat.velocity += GRAVITY;
    cat.y += cat.velocity;
    cat.y = Math.max(cat.y, 0); // Prevent cat from going above the screen
}

function updatePipes() {
    if (pipes.length === 0 || pipes[pipes.length - 1].x < canvas.width - PIPE_SPAWN_DISTANCE) {
        let pipeHeight = Math.random() * (groundY - PIPE_GAP - 160) + 80; // Adjusted for smaller gap
        pipes.push({ x: canvas.width, height: pipeHeight });
    }

    pipes.forEach(pipe => pipe.x -= PIPE_SPEED);

    if (pipes[0] && pipes[0].x + PIPE_WIDTH < 0) {
        pipes.shift();
        score++;
    }
}

function updateBubbles() {
    bubbles.forEach(bubble => {
        bubble.y -= bubble.speed;
        if (bubble.y + bubble.radius < 0) {
            bubble.y = canvas.height + bubble.radius;
            bubble.x = Math.random() * canvas.width;
        }
    });
}

function checkCollisions() {
    const catHitboxReduction = cat.size * 0.18; // Slightly reduced to make hitbox more precise
    const catLeft = cat.x + catHitboxReduction;
    const catRight = cat.x + cat.size - catHitboxReduction;
    const catTop = cat.y + catHitboxReduction;
    const catBottom = cat.y + cat.size - catHitboxReduction;

    // Ground collision
    if (catBottom > groundY) {
        endGame();
        return;
    }

    // Pipe collision
    for (let pipe of pipes) {
        if (catRight > pipe.x && catLeft < pipe.x + PIPE_WIDTH) {
            if (catTop < pipe.height || catBottom > pipe.height + PIPE_GAP) {
                endGame();
                return;
            }
        }
    }
}

function draw() {
    drawSky();
    drawBubbles();
    drawGround();

    if (gameState === GAME_STATE.PLAYING) {
        drawPipes();
        drawCat();
        drawScore();
    } else if (gameState === GAME_STATE.MENU) {
        drawMenu();
    } else if (gameState === GAME_STATE.GAME_OVER) {
        drawGameOver();
    }
}

function drawSky() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawBubbles() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    bubbles.forEach(bubble => {
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawTrees() {
    const treeCount = 3;
    const treeWidth = 100;
    const treeSpacing = canvas.width / (treeCount + 1);

    for (let i = 1; i <= treeCount; i++) {
        const x = i * treeSpacing - treeWidth / 2;
        const y = groundY - 120;

        // Tree trunk
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(x + 40, y + 80, 20, 40);

        // Tree leaves
        ctx.fillStyle = '#228B22';
        ctx.beginPath();
        ctx.moveTo(x + 50, y);
        ctx.lineTo(x, y + 100);
        ctx.lineTo(x + 100, y + 100);
        ctx.closePath();
        ctx.fill();
    }
}

function drawGround() {
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
}

function drawPipes() {
    pipes.forEach(pipe => {
        // Lower pipe
        ctx.fillStyle = '#00AA00';
        ctx.fillRect(pipe.x, pipe.height + PIPE_GAP, PIPE_WIDTH, groundY - pipe.height - PIPE_GAP);

        // Upper pipe
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.height);

        // Pipe cap (lower)
        ctx.fillStyle = '#008800';
        ctx.fillRect(pipe.x - 5, pipe.height + PIPE_GAP, PIPE_WIDTH + 10, 20);

        // Pipe cap (upper)
        ctx.fillRect(pipe.x - 5, pipe.height - 20, PIPE_WIDTH + 10, 20);
    });
}

function drawCat() {
    ctx.font = `${cat.size * 1.5}px Arial`; // Increased from 1.2
    ctx.fillText(catEmojis[currentCatIndex], cat.x, cat.y);
}

function drawScore() {
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    const scoreText = `Score: ${score}`;
    ctx.strokeText(scoreText, canvas.width / 2, 20);
    ctx.fillText(scoreText, canvas.width / 2, 20);
}

function drawMenu() {
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 5;
    ctx.font = `bold ${canvas.width * 0.1}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const titleText = 'Flappy Cat';
    ctx.strokeText(titleText, canvas.width * 0.5, canvas.height * 0.3);
    ctx.fillText(titleText, canvas.width * 0.5, canvas.height * 0.3);

    ctx.font = `bold ${canvas.width * 0.05}px Arial`;
    const highScoreText = `High Score: ${highScore}`;
    ctx.strokeText(highScoreText, canvas.width * 0.5, canvas.height * 0.45);
    ctx.fillText(highScoreText, canvas.width * 0.5, canvas.height * 0.45);

    drawButton('Start Game', canvas.height * 0.6);
}

function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 5;
    ctx.font = `bold ${canvas.width * 0.1}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const gameOverText = 'Game Over';
    ctx.strokeText(gameOverText, canvas.width * 0.5, canvas.height * 0.3);
    ctx.fillText(gameOverText, canvas.width * 0.5, canvas.height * 0.3);

    ctx.font = `bold ${canvas.width * 0.05}px Arial`;
    const scoreText = `Score: ${score}`;
    ctx.strokeText(scoreText, canvas.width * 0.5, canvas.height * 0.45);
    ctx.fillText(scoreText, canvas.width * 0.5, canvas.height * 0.45);

    const highScoreText = `High Score: ${highScore}`;
    ctx.strokeText(highScoreText, canvas.width * 0.5, canvas.height * 0.55);
    ctx.fillText(highScoreText, canvas.width * 0.5, canvas.height * 0.55);

    drawButton('Try Again', canvas.height * 0.7);
}

function drawButton(text, yPosition) {
    ctx.fillStyle = '#4CAF50';
    const buttonWidth = canvas.width * 0.4;
    const buttonHeight = canvas.height * 0.1;
    const buttonX = canvas.width * 0.5 - buttonWidth / 2;
    const buttonY = yPosition - buttonHeight / 2;
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.font = `bold ${canvas.width * 0.05}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText(text, canvas.width * 0.5, yPosition);
    ctx.fillText(text, canvas.width * 0.5, yPosition);
}

function handleInput(event) {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if (event.type === 'touchstart') {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else {
        clientX = event.clientX;
        clientY = event.clientY;
    }

    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;

    if (gameState === GAME_STATE.MENU) {
        if (isClickInsideButton(clickX, clickY, canvas.height * 0.6)) startGame();
    } else if (gameState === GAME_STATE.PLAYING) {
        cat.velocity = JUMP_STRENGTH;
    } else if (gameState === GAME_STATE.GAME_OVER) {
        if (isClickInsideButton(clickX, clickY, canvas.height * 0.7)) startGame();
    }
}

function isClickInsideButton(clickX, clickY, buttonY) {
    const buttonWidth = canvas.width * 0.4;
    const buttonHeight = canvas.height * 0.1;
    const buttonX = canvas.width * 0.5 - buttonWidth / 2;
    const buttonTop = buttonY - buttonHeight / 2;
    return clickX >= buttonX && clickX <= buttonX + buttonWidth &&
           clickY >= buttonTop && clickY <= buttonTop + buttonHeight;
}

function startGame() {
    gameState = GAME_STATE.PLAYING;
    cat = {
        x: canvas.width * 0.2,
        y: canvas.height / 2,
        size: canvas.width * 0.13,
        velocity: 0
    };
    pipes = [];
    score = 0;
}

function endGame() {
    gameState = GAME_STATE.GAME_OVER;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('flappyCatHighScore', highScore);
    }
}

canvas.addEventListener('click', handleInput);
canvas.addEventListener('touchstart', handleInput);
canvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
}, { passive: false });
window.addEventListener('resize', setCanvasSize);

init();
