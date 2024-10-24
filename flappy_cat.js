const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameContainer = document.getElementById('gameContainer');

let cat, pipes, bubbles, score, highScore, coinCount, currentCatIndex, groundY;
let gameState, lastTime, deltaTime;

const GAME_STATE = { MENU: 0, PLAYING: 1, GAME_OVER: 2, SHOP: 3 };
const GRAVITY = 0.18; // Increased by 20% from 0.15
const JUMP_STRENGTH = -4.8; // Increased strength by 20% from -4
const PIPE_WIDTH = 100; // Increased from 80
const PIPE_GAP = 250; // Increased from 220
const PIPE_SPEED = 1.17; // Increased by 20% from 0.975
const COIN_SIZE = 20;
const COIN_SPEED = 1.5;

const COIN_SPAWN_CHANCE = 0.2; // 20% chance to spawn a coin with each pipe
const COIN_VALUE = 1;
let coins = [];
let availableEmojis = ['🐱', '😺', '😸', '😻', '😽'];
let unlockedEmojis = ['🐱'];
let selectedEmojiIndex = 0;

const COIN_SPIN_SPEED = 0.1;
let coinFrame = 0;

const FOOD_SIZE = 25;
const FOOD_SPIN_SPEED = 0.05;
let catFood = [];
let foodFrame = 0;

const CAT_FOOD_SPRITES = ['🍗', '🐟', '🥩', '🍖'];
const FOOD_SPAWN_CHANCE = 0.3; // 30% chance to spawn food with each pipe

function setCanvasSize() {
    canvas.width = gameContainer.clientWidth - 6;
    canvas.height = canvas.width * 1.8; // More portrait-oriented
    groundY = canvas.height - 50;
}

function init() {
    setCanvasSize();
    highScore = parseInt(localStorage.getItem('flappyCatHighScore')) || 0;
    coinCount = parseInt(localStorage.getItem('flappyCatCoinCount')) || 0;
    unlockedEmojis = JSON.parse(localStorage.getItem('flappyCatUnlockedEmojis')) || ['🐱'];
    selectedEmojiIndex = parseInt(localStorage.getItem('flappyCatSelectedEmoji')) || 0;
    currentCatIndex = selectedEmojiIndex;
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
    if (pipes.length === 0 || pipes[pipes.length - 1].x < canvas.width - 270) {
        let pipeHeight = Math.random() * (groundY - PIPE_GAP - 180) + 90;
        pipes.push({ x: canvas.width, height: pipeHeight });
        
        // Chance to spawn food
        if (Math.random() < FOOD_SPAWN_CHANCE) {
            let foodY;
            if (Math.random() < 0.5) {
                // Place food in upper half of the gap
                foodY = pipeHeight + (PIPE_GAP * Math.random() * 0.4);
            } else {
                // Place food in lower half of the gap
                foodY = pipeHeight + PIPE_GAP * (0.6 + Math.random() * 0.4);
            }
            
            catFood.push({
                x: canvas.width,
                y: foodY,
                collected: false,
                type: Math.floor(Math.random() * CAT_FOOD_SPRITES.length)
            });
        }
    }

    pipes.forEach(pipe => pipe.x -= PIPE_SPEED);
    catFood.forEach(food => food.x -= PIPE_SPEED);

    if (pipes[0] && pipes[0].x + PIPE_WIDTH < 0) {
        pipes.shift();
        score++;
    }

    catFood = catFood.filter(food => food.x + FOOD_SIZE > 0);
    
    foodFrame += FOOD_SPIN_SPEED;
    if (foodFrame >= CAT_FOOD_SPRITES.length) foodFrame = 0;
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
    const catHitboxReduction = cat.size * 0.2;
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

    // Cat food collection
    catFood.forEach(food => {
        const foodHitboxReduction = FOOD_SIZE * 0.2;
        if (!food.collected && 
            catRight > food.x + foodHitboxReduction &&
            catLeft < food.x + FOOD_SIZE - foodHitboxReduction &&
            catTop < food.y + FOOD_SIZE - foodHitboxReduction &&
            catBottom > food.y + foodHitboxReduction) {
            food.collected = true;
            coinCount += 1;
            localStorage.setItem('flappyCatCoinCount', coinCount);
        }
    });
}

function draw() {
    drawSky();
    drawBubbles();
    drawGround();

    if (gameState === GAME_STATE.PLAYING) {
        drawPipes();
        drawCatFood(); // Changed from drawCoins to drawCatFood
        drawCat();
        drawScore();
    } else if (gameState === GAME_STATE.MENU) {
        drawMenu();
    } else if (gameState === GAME_STATE.GAME_OVER) {
        drawGameOver();
    } else if (gameState === GAME_STATE.SHOP) {
        drawShop();
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

function drawCatFood() {
    ctx.font = `${FOOD_SIZE}px Arial`;
    catFood.forEach(food => {
        if (!food.collected) {
            ctx.fillText(CAT_FOOD_SPRITES[food.type], food.x, food.y);
        }
    });
}

function drawCat() {
    ctx.font = `${cat.size * 1.5}px Arial`;
    const catEmoji = unlockedEmojis[currentCatIndex] || '🐱'; // Fallback to basic cat emoji
    ctx.fillText(catEmoji, cat.x, cat.y);
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
    const foodText = `Food: ${coinCount}`; // Changed from coinText to foodText
    ctx.strokeText(foodText, canvas.width / 2, 50);
    ctx.fillText(foodText, canvas.width / 2, 50);
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

    drawButton('Shop', canvas.height * 0.7);
    drawButton('Try Again', canvas.height * 0.85);
}

function drawButton(text, yPosition) {
    ctx.fillStyle = '#4CAF50';  // Green
    const buttonWidth = canvas.width * 0.6;
    const buttonHeight = canvas.height * 0.08;
    const buttonX = canvas.width * 0.5 - buttonWidth / 2;
    const buttonY = yPosition - buttonHeight / 2;
    
    // Button background (curved shape)
    ctx.beginPath();
    ctx.moveTo(buttonX, buttonY + buttonHeight / 2);
    ctx.lineTo(buttonX + buttonWidth * 0.1, buttonY);
    ctx.lineTo(buttonX + buttonWidth * 0.9, buttonY);
    ctx.lineTo(buttonX + buttonWidth, buttonY + buttonHeight / 2);
    ctx.lineTo(buttonX + buttonWidth * 0.9, buttonY + buttonHeight);
    ctx.lineTo(buttonX + buttonWidth * 0.1, buttonY + buttonHeight);
    ctx.closePath();
    ctx.fill();

    // Button text
    ctx.fillStyle = 'white';
    ctx.font = `bold ${canvas.width * 0.04}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
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
        if (isClickInsideButton(clickX, clickY, canvas.height * 0.7)) {
            gameState = GAME_STATE.SHOP;
            draw();
        } else if (isClickInsideButton(clickX, clickY, canvas.height * 0.85)) {
            startGame();
        }
    } else if (gameState === GAME_STATE.SHOP) {
        handleShopClick(clickX, clickY);
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
    catFood = []; // Changed from coins to catFood
    score = 0;
}

function endGame() {
    gameState = GAME_STATE.GAME_OVER;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('flappyCatHighScore', highScore);
    }
    drawGameOver();
}

function openShop() {
    gameState = GAME_STATE.SHOP;
    draw();
}

function drawShop() {
    // Background
    ctx.fillStyle = '#FFE5E5';  // Light pink background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Shop title
    ctx.fillStyle = '#FF69B4';  // Hot pink
    ctx.font = `bold ${canvas.width * 0.08}px Comic Sans MS`;
    ctx.textAlign = 'center';
    ctx.fillText('Pet Shop', canvas.width / 2, canvas.height * 0.1);

    // Food count
    ctx.fillStyle = '#8B4513';  // Saddle Brown
    ctx.font = `${canvas.width * 0.05}px Comic Sans MS`;
    ctx.fillText(`Food: ${coinCount}`, canvas.width / 2, canvas.height * 0.2);

    const emojiSize = canvas.width * 0.13;
    const startY = canvas.height * 0.25;
    const padding = canvas.width * 0.02;
    const columns = 3;  // Changed from 4 to 3 for better layout with 5 emojis

    availableEmojis.forEach((emoji, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const x = column * (emojiSize + padding) + canvas.width * 0.2;  // Adjusted for centering
        const y = row * (emojiSize + padding) + startY;

        // Emoji background
        ctx.fillStyle = unlockedEmojis.includes(emoji) ? '#98FB98' : '#FFA07A';  // Light green or light salmon
        ctx.beginPath();
        ctx.arc(x + emojiSize/2, y + emojiSize/2, emojiSize/2, 0, Math.PI * 2);
        ctx.fill();

        // Emoji
        ctx.font = `${emojiSize * 0.8}px Arial`;
        ctx.fillText(emoji, x + emojiSize/2, y + emojiSize * 0.7);

        if (unlockedEmojis.includes(emoji)) {
            if (index === selectedEmojiIndex) {
                ctx.strokeStyle = '#FFD700';  // Gold
                ctx.lineWidth = 5;
                ctx.stroke();
            }
        } else {
            ctx.fillStyle = '#8B4513';  // Saddle Brown
            ctx.font = `${canvas.width * 0.025}px Comic Sans MS`;
            ctx.fillText('10 food', x + emojiSize/2, y + emojiSize * 1.2);
        }
    });

    // Back button
    drawButton('Back to Game', canvas.height * 0.9);
}

function handleShopClick(x, y) {
    const emojiSize = canvas.width * 0.13;
    const startY = canvas.height * 0.25;
    const padding = canvas.width * 0.02;
    const columns = 3;  // Changed from 4 to 3 for better layout with 5 emojis

    availableEmojis.forEach((emoji, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const emojiX = column * (emojiSize + padding) + canvas.width * 0.2;  // Adjusted for centering
        const emojiY = row * (emojiSize + padding) + startY;

        if (x > emojiX && x < emojiX + emojiSize &&
            y > emojiY && y < emojiY + emojiSize) {
            if (unlockedEmojis.includes(emoji)) {
                selectedEmojiIndex = index;
                currentCatIndex = index;  // Update currentCatIndex here
                localStorage.setItem('flappyCatSelectedEmoji', index);
            } else if (coinCount >= 10) {
                coinCount -= 10;
                unlockedEmojis.push(emoji);
                selectedEmojiIndex = index;  // Set selectedEmojiIndex for newly unlocked emoji
                currentCatIndex = index;  // Update currentCatIndex for newly unlocked emoji
                localStorage.setItem('flappyCatCoinCount', coinCount);
                localStorage.setItem('flappyCatUnlockedEmojis', JSON.stringify(unlockedEmojis));
                localStorage.setItem('flappyCatSelectedEmoji', index);
            }
            draw();
        }
    });

    if (isClickInsideButton(x, y, canvas.height * 0.9)) {
        gameState = GAME_STATE.MENU;
        draw();
    }
}

canvas.addEventListener('click', handleInput);
canvas.addEventListener('touchstart', handleInput);
canvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
}, { passive: false });
window.addEventListener('resize', setCanvasSize);

init();
