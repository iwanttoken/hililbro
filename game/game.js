const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const menu = document.getElementById('menu');
const startButton = document.getElementById('startButton');

const canvasWidth = 1920;
const canvasHeight = 1080;

let player, projectiles, enemies, assists, texts, gameInterval, spawnInterval;
let playerLives = 5000000; // Set player lives to a very high number
let playerHealth = 100;
let score = 0;
let keys = {};

const images = {
    background: 'yappers/yap.png',
    player: 'yappers/sus.png',
    enemy: 'yappers/holy.png',
    moxyt: 'yappers/moxyt.png',
    projectile: 'yappers/prok.png',
    assist1: 'yappers/dolphin.png',
    assist2: 'yappers/mag.png',
    assist3: 'yappers/goat.png',
};

const imageElements = {};
let imagesLoaded = 0;
const totalImages = Object.keys(images).length;

function imageLoaded() {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        console.log('All images loaded');
        menu.style.display = 'flex';
    }
}

for (let key in images) {
    const img = new Image();
    img.src = images[key];
    img.onload = imageLoaded;
    img.onerror = () => console.error(`Failed to load image at ${img.src}`);
    imageElements[key] = img;
}

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 50;
        this.speed = 5;
        this.image = imageElements.player;
    }

    draw() {
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        this.drawHealthBar();
    }

    drawHealthBar() {
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y - 10, this.width, 5);
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x, this.y - 10, this.width * (playerHealth / 100), 5);
    }

    move() {
        if (keys['ArrowLeft'] && this.x > 0) {
            this.x -= this.speed;
        }
        if (keys['ArrowRight'] && this.x < canvasWidth - this.width) {
            this.x += this.speed;
        }
    }

    resetHealth() {
        playerHealth = 100;
    }
}

class Projectile {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 10;
        this.height = 20;
        this.speed = 7;
        this.image = imageElements.projectile;
    }

    draw() {
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    }

    update() {
        this.y -= this.speed;
    }

    isOutOfScreen() {
        return this.y < 0;
    }
}

class Enemy {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 50;
        this.speed = 3;
        this.type = type;
        this.image = type === 'moxyt' ? imageElements.moxyt : imageElements.enemy;
        this.health = type === 'moxyt' ? 200 : 100;
    }

    draw() {
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        this.drawHealthBar();
    }

    drawHealthBar() {
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y - 10, this.width, 5);
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x, this.y - 10, this.width * (this.health / (this.type === 'moxyt' ? 200 : 100)), 5);
    }

    update() {
        this.y += this.speed;
    }

    isOutOfScreen() {
        return this.y > canvasHeight;
    }

    damagePlayer() {
        if (player.x < this.x + this.width &&
            player.x + player.width > this.x &&
            player.y < this.y + this.height &&
            player.y + player.height > this.y) {
            playerHealth -= 10; // Reduce health by 10 for each collision
            if (playerHealth <= 0) {
                playerLives--; // Decrease lives
                if (playerLives <= 0) {
                    endGame();
                } else {
                    player.resetHealth(); // Reset health if lives are left
                }
            }
        }
    }
}

class Assist {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 50;
        this.type = type;
        this.image = imageElements[`assist${type}`];
        this.active = true;
    }

    draw() {
        if (this.active) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        }
    }

    update() {
        if (this.active) {
            this.y -= 3;
            if (this.y < 0) {
                this.active = false;
            }
        }
    }

    isColliding(enemy) {
        return this.active && enemy.y < this.y + this.height && enemy.y + enemy.height > this.y &&
               enemy.x < this.x + this.width && enemy.x + this.width > this.x;
    }
}

class Text {
    constructor(text, x, y, duration) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.duration = duration;
        this.opacity = 1;
    }

    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.font = '20px Arial';
        ctx.fillText(this.text, this.x, this.y);
        this.opacity -= 1 / (this.duration / 16.67); // Fade out over duration (assuming 60fps)
    }
}

function init() {
    player = new Player(canvasWidth / 2 - 25, canvasHeight - 60);
    projectiles = [];
    enemies = [];
    assists = [new Assist(50, canvasHeight - 60, 1), new Assist(150, canvasHeight - 60, 2), new Assist(250, canvasHeight - 60, 3)];
    texts = [];
    score = 0;
    playerLives = 5000000; // Ensure player lives are set to a very high number
    playerHealth = 100;
    summonAssistButton.style.display = 'block'; // Show summon assist button in-game
}

function spawnEnemy() {
    const x = Math.random() * (canvasWidth - 50);
    const type = Math.random() < 0.2 ? 'moxyt' : 'attacker';
    enemies.push(new Enemy(x, -50, type));
}

function update() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(imageElements.background, 0, 0, canvasWidth, canvasHeight);

    player.move();
    player.draw();

    projectiles.forEach((projectile, index) => {
        projectile.update();
        projectile.draw();
        if (projectile.isOutOfScreen()) {
            projectiles.splice(index, 1);
        }
    });

    enemies.forEach((enemy, index) => {
        enemy.update();
        enemy.draw();

        // Check for collision between player and enemy
        enemy.damagePlayer();

        projectiles.forEach((projectile, pIndex) => {
            if (projectile.x < enemy.x + enemy.width &&
                projectile.x + projectile.width > enemy.x &&
                projectile.y < enemy.y + enemy.height &&
                projectile.y + projectile.height > enemy.y) {
                
                projectiles.splice(pIndex, 1);
                enemy.health -= 50;

                if (enemy.health <= 0) {
                    enemies.splice(index, 1);
                    const text = enemy.type === 'moxyt' ? 'Give me moderator please!' : 'Please give me 1000 V-Bucks!';
                    texts.push(new Text(text, enemy.x, enemy.y, 2000));
                    score += enemy.type === 'moxyt' ? 200 : 100;
                }
            }
        });

        if (enemy.isOutOfScreen()) {
            enemies.splice(index, 1);
            // No lives deduction here as player lives are very high
        }
    });

    assists.forEach(assist => {
        assist.update();
        assist.draw();
        enemies.forEach((enemy, index) => {
            if (assist.isColliding(enemy)) {
                assist.active = false;
                enemy.health -= 100;
                if (enemy.health <= 0) {
                    enemies.splice(index, 1);
                    const text = enemy.type === 'moxyt' ? 'Give me moderator please!' : 'Please give me 1000 V-Bucks!';
                    texts.push(new Text(text, enemy.x, enemy.y, 2000));
                    score += enemy.type === 'moxyt' ? 200 : 100;
                }
            }
        });
    });

    texts.forEach((text, index) => {
        text.draw();
        if (text.opacity <= 0) {
            texts.splice(index, 1);
        }
    });

    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${score}`, 10, 20);
    ctx.fillText(`Lives: ${playerLives}`, 10, 40);
    ctx.fillText(`Health: ${playerHealth}`, 10, 60);
}

function endGame() {
    clearInterval(gameInterval);
    clearInterval(spawnInterval);
    alert(`Game Over! Your score: ${score}`);
    resetGame();
}

function resetGame() {
    menu.style.display = 'flex';
    canvas.style.display = 'none';
    summonAssistButton.style.display = 'none'; // Hide summon assist button
}

function startGame() {
    if (imagesLoaded < totalImages) {
        alert("Images are still loading. Please wait.");
        return;
    }
    menu.style.display = 'none';
    canvas.style.display = 'block';
    init();
    gameInterval = setInterval(update, 1000 / 60);
    spawnInterval = setInterval(spawnEnemy, 2000);
}

startButton.addEventListener('click', startGame);

const summonAssistButton = document.createElement('button');
summonAssistButton.textContent = 'Summon Assist';
summonAssistButton.style.position = 'absolute';
summonAssistButton.style.top = '10px';
summonAssistButton.style.right = '10px';
summonAssistButton.style.display = 'none';
document.body.appendChild(summonAssistButton);

summonAssistButton.addEventListener('click', () => {
    for (let i = 0; i < assists.length; i++) {
        if (!assists[i].active) {
            assists[i].x = player.x + player.width / 2 - assists[i].width / 2;
            assists[i].y = player.y - assists[i].height;
            assists[i].active = true;
            player.resetHealth(); // Restore player health
            break;
        }
    }
});

document.addEventListener('keydown', (event) => {
    keys[event.key] = true;
    if (event.key === ' ') {
        projectiles.push(new Projectile(player.x + player.width / 2 - 5, player.y));
    }
    if (event.key === '1') {
        assists[0].active = true;
    }
    if (event.key === '2') {
        assists[1].active = true;
    }
    if (event.key === '3') {
        assists[2].active = true;
    }
});

document.addEventListener('keyup', (event) => {
    keys[event.key] = false;
});
