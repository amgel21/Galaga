// Variables globales
let player;
let playerProjectiles = [];
let enemyProjectiles = [];
let enemies = [];
let level = 1;
let score = 0;
let lives = 3;
let gameState = 'start';
let transitionTimer = 0;
let topScores = [];
let maxTopScores = 5;
let isPaused = false;

let playerImage;
let projectileImage;
let EnemyImage;

const LEVELS = {
  1: {
    enemyCount: 10,
    enemySpeed: 1,
    enemyMovement: 'straight',
    enemiesShoot: false,
    resistantCount: 0,
    boss: false,
  },
  2: {
    enemyCount: 15,
    enemySpeed: 1.5,
    enemyMovement: 'zigzag',
    enemiesShoot: true,
    resistantCount: 1,
    boss: false,
  },
  3: {
    enemyCount: 20,
    enemySpeed: 2,
    enemyMovement: 'complex',
    enemiesShoot: true,
    resistantCount: 2,
    boss: true,
  }
};

function preload() {
  playerImage = loadImage('AVION.jpg');
  projectileImage = loadImage('balas.png');
  EnemyImage = loadImage('ENEMIGO.jpg');
}

function setup() {
  createCanvas(600, 600);
  textAlign(CENTER, CENTER);
  player = new Player();
  loadTopScores();
}
////////////////////////////////////////////////////////////////////////////
function startLevel() {
  enemies = [];
  playerProjectiles = [];
  enemyProjectiles = [];
  let config = LEVELS[level];
  let totalNonBoss = config.enemyCount - config.resistantCount - (config.boss ? 1 : 0);

  for (let i = 0; i < totalNonBoss; i++) {
    let x = 40 + (i % 10) * 50;
    let y = 50 + floor(i / 10) * 40;
    enemies.push(new Enemy(x, y, 1, config.enemySpeed, config.enemyMovement, config.enemiesShoot));
  }

  for (let i = 0; i < config.resistantCount; i++) {
    let index = totalNonBoss + i;
    let x = 40 + (index % 10) * 50;
    let y = 50 + floor(index / 10) * 40;
    enemies.push(new Enemy(x, y, 3, config.enemySpeed, config.enemyMovement, config.enemiesShoot));
  }

  if (config.boss) {
    enemies.push(new Enemy(width / 2, 80, 7, config.enemySpeed * 1.5, 'boss', true, true));
  }

  gameState = 'playing';
}

////////////////////////////////////////////////////////////////////////////
function draw() {
  background(0);

  if (gameState === 'start') {
    drawStartScreen();
  } else if (gameState === 'playing') {
    if (!isPaused) {
      playGame();
    } else {
      drawPauseScreen();
    }
  } else if (gameState === 'transition') {
    drawTransition();
  } else if (gameState === 'gameover') {
    drawGameOver();
  }
}

function drawStartScreen() {
  fill(255);
  textSize(32);
  text('Juego de Nave Espacial', width / 2, height / 4);
  textSize(18);
  text('Usa flechas izquierda/derecha para mover', width / 2, height / 3);
  text('Barra espaciadora para disparar', width / 2, height / 3 + 30);
  text('Presiona ENTER para comenzar', width / 2, height / 2);
  text('Top 5 Puntuaciones:', width / 2, height / 2 + 80);
  for (let i = 0; i < topScores.length; i++) {
    text(`${i + 1}. ${topScores[i]}`, width / 2, height / 2 + 110 + i * 25);
  }
}

function playGame() {
  player.update();
  player.show();

  for (let i = playerProjectiles.length - 1; i >= 0; i--) {
    let p = playerProjectiles[i];
    p.update();
    p.show();
    if (p.offscreen()) playerProjectiles.splice(i, 1);
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    let e = enemies[i];
    e.update();
    e.show();

    if (e.canShoot && random(1) < 0.005 * LEVELS[level].enemySpeed) {
      enemyProjectiles.push(new Projectile(e.x, e.y + 15, 5, 10, 5));
    }

    for (let j = playerProjectiles.length - 1; j >= 0; j--) {
      let p = playerProjectiles[j];
      if (e.hits(p)) {
        e.health--;
        playerProjectiles.splice(j, 1);
        if (e.health <= 0) {
          score += e.isBoss ? 10 : e.maxHealth > 1 ? 3 : 1;
          enemies.splice(i, 1);
        }
        break;
      }
    }

    if (e.y + e.size / 2 >= height || e.collidesWithPlayer(player)) {
      loseLife();
      enemies.splice(i, 1);
    }
  }

  for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
    let p = enemyProjectiles[i];
    p.update();
    p.show();
    if (p.offscreen()) {
      enemyProjectiles.splice(i, 1);
      continue;
    }
    if (p.hitsPlayer(player)) {
      loseLife();
      enemyProjectiles.splice(i, 1);
    }
  }

  drawHUD();

  if (enemies.length === 0) {
    if (level === 3) {
      gameState = 'gameover';
      saveScore();
    } else {
      gameState = 'transition';
      transitionTimer = 120;
    }
  }

  if (lives <= 0) {
    gameState = 'gameover';
    saveScore();
  }
}

function drawPauseScreen() {
  fill(255, 0, 0);
  textSize(32);
  text('¡PAUSADO!', width / 2, height / 2 - 20);
  textSize(18);
  text('Presiona P para reanudar', width / 2, height / 2 + 20);
}

function drawTransition() {
  fill(255);
  textSize(28);
  text(`Nivel ${level} completado!`, width / 2, height / 2);
  transitionTimer--;
  if (transitionTimer <= 0) {
    level++;
    startLevel();
  }
}

function drawGameOver() {
  textAlign(CENTER, CENTER);
  fill(255, 0, 0);
  textSize(36);
  text(lives <= 0 ? 'Juego Terminado' : '¡Felicidades! Ganaste', width / 2, height / 3);
  textSize(20);
  text(`Puntaje final: ${score}`, width / 2, height / 2);
  text('Presiona ENTER para reiniciar', width / 2, height / 2 + 50);
  text('Top 5 Puntuaciones:', width / 2, height / 2 + 100);
  for (let i = 0; i < topScores.length; i++) {
    text(`${i + 1}. ${topScores[i]}`, width / 2, height / 2 + 130 + i * 25);
  }
}

function drawHUD() {
  fill(255);
  textSize(16);
  textAlign(LEFT, TOP);
  text(`Puntaje: ${score}`, 10, 10);
  text(`Vidas: ${lives}`, 10, 30);
  text(`Nivel: ${level}`, 10, 50);
}
////////////////////////////////////////////////////////////////////////////
function keyPressed() {
  if (keyCode === ENTER) {
    if (gameState === 'start') {
      level = 1;  // Reiniciar nivel al 1 en la pantalla de inicio
      score = 0;
      lives = 3;
      startLevel();
    } else if (gameState === 'gameover') {
      level = 1;  // Reiniciar nivel al 1 cuando termina el juego
      score = 0;
      lives = 3;
      player = new Player();
      loadTopScores();
      gameState = 'start';  // Volver al inicio
    } else if (gameState === 'transition') {
      // Si estamos en una transición entre niveles, se mantiene el nivel actual
      gameState = 'playing';  // Continuar jugando
    }
  } else if (key === ' ' && gameState === 'playing') {
    player.shoot();
  } else if (key === 'p' || key === 'P') {
    if (gameState === 'playing') {
      isPaused = !isPaused;
    }
  }
}

////////////////////////////////////////////////////////////////////////////
// Clases

class Player {
  constructor() {
    this.x = width / 2;
    this.y = height - 40;
    this.size = 40;
    this.speed = 5;
  }

  update() {
    if (keyIsDown(LEFT_ARROW)) this.x -= this.speed;
    if (keyIsDown(RIGHT_ARROW)) this.x += this.speed;
    this.x = constrain(this.x, this.size / 2, width - this.size / 2);
  }

  show() {
    imageMode(CENTER);
    image(playerImage, this.x, this.y, this.size, this.size);
  }

  shoot() {
    playerProjectiles.push(new Projectile(this.x, this.y - 20, 5, 10, -7));
  }
}

class Projectile {
  constructor(x, y, w, h, speed) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.speed = speed;
  }

  update() {
    this.y += this.speed;
  }

  show() {
    imageMode(CENTER);
    image(projectileImage, this.x, this.y, this.w * 3, this.h * 3);
  }

  offscreen() {
    return this.y < 0 || this.y > height;
  }

  hitsPlayer(player) {
    return collideRectCircle(player.x - player.size / 2, player.y - player.size / 2, player.size, player.size, this.x, this.y, this.w);
  }
}

class Enemy {
  constructor(x, y, health = 1, speed = 1, movement = 'straight', canShoot = false, isBoss = false) {
    this.x = x;
    this.y = y;
    this.health = health;
    this.maxHealth = health;
    this.size = isBoss ? 60 : 30;
    this.speed = speed;
    this.movement = movement;
    this.canShoot = canShoot;
    this.isBoss = isBoss;
    this.phase = 0;
  }

  update() {
    if (this.movement === 'straight') {
      this.y += this.speed;
    } else if (this.movement === 'zigzag') {
      this.y += this.speed;
      this.x += sin(frameCount * 0.1) * 2;
    } else if (this.movement === 'complex' || this.movement === 'boss') {
      this.phase += 0.05;
      this.y += this.speed * 0.5;
      this.x += sin(this.phase) * 3;
    }
  }

  show() {
    imageMode(CENTER);
    image(EnemyImage, this.x, this.y, this.size, this.size);
  }

  hits(projectile) {
    return dist(this.x, this.y, projectile.x, projectile.y) < this.size / 2;
  }

  collidesWithPlayer(player) {
    return dist(this.x, this.y, player.x, player.y) < (this.size + player.size) / 2;
  }
}
function loadTopScores() {
  let storedScores = getItem('topScores');
  if (Array.isArray(storedScores)) {
    topScores = storedScores;
  } else {
    topScores = [];
  }
}


function saveScore() {
  topScores.push(score);
  topScores.sort((a, b) => b - a);
  if (topScores.length > maxTopScores) {
    topScores.length = maxTopScores;
  }
  storeItem('topScores', topScores);
}

function loseLife() {
  lives--;
  if (lives <= 0) {
    gameOver = true;
    saveScore();
  }
}

