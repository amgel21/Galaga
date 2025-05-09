// Variables globales
let player;
let playerProjectiles = [];
let enemyProjectiles = [];
let enemies = [];
let level = 1;
let score = 0;
let lives = 3;
let gameState = 'start'; // start, playing, transition, gameover
let transitionTimer = 0;
let topScores = [];
let maxTopScores = 5;

// Configuraciones de niveles
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

function setup() {
  createCanvas(600, 600);
  textAlign(CENTER, CENTER);
  player = new Player();
  loadTopScores();
}

function startLevel() {
  enemies = [];
  playerProjectiles = [];
  enemyProjectiles = [];
  let config = LEVELS[level];
  // Crear enemigos normales
  for (let i = 0; i < config.enemyCount - config.resistantCount - (config.boss ? 1 : 0); i++) {
    let x = 40 + (i % 10) * 50;
    let y = 50 + floor(i / 10) * 40;
    enemies.push(new Enemy(x, y, 1, config.enemySpeed, config.enemyMovement, config.enemiesShoot));
  }
  // Enemigos resistentes
  for (let i = 0; i < config.resistantCount; i++) {
    let x = 40 + ((config.enemyCount - config.resistantCount - (config.boss ? 1 : 0) + i) % 10) * 50;
    let y = 50 + floor((config.enemyCount - config.resistantCount - (config.boss ? 1 : 0) + i) / 10) * 40;
    enemies.push(new Enemy(x, y, 3, config.enemySpeed, config.enemyMovement, config.enemiesShoot));
  }
  // Jefe final
  if (config.boss) {
    enemies.push(new Enemy(width / 2, 80, 7, config.enemySpeed * 1.5, 'boss', true, true));
  }
  gameState = 'playing';
}

function draw() {
  background(0);

  if (gameState === 'start') {
    drawStartScreen();
  } else if (gameState === 'playing') {
    playGame();
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

  // Actualizar y mostrar proyectiles del jugador
  for (let i = playerProjectiles.length - 1; i >= 0; i--) {
    let p = playerProjectiles[i];
    p.update();
    p.show();
    if (p.offscreen()) playerProjectiles.splice(i, 1);
  }

  // Actualizar y mostrar enemigos
  for (let i = enemies.length - 1; i >= 0; i--) {
    let e = enemies[i];
    e.update();
    e.show();

    // Enemigos disparan aleatoriamente si pueden
    if (e.canShoot && random(1) < 0.005 * LEVELS[level].enemySpeed) {
      enemyProjectiles.push(new Projectile(e.x, e.y + 15, 5, 10, 5));
    }

    // Verificar colisión con proyectiles del jugador
    for (let j = playerProjectiles.length - 1; j >= 0; j--) {
      let p = playerProjectiles[j];
      if (e.hits(p)) {
        e.health--;
        playerProjectiles.splice(j, 1);
        if (e.health <= 0) {
          // Sumar puntos según tipo
          if (e.isBoss) score += 10;
          else if (e.maxHealth > 1) score += 3;
          else score += 1;
          enemies.splice(i, 1);
        }
        break;
      }
    }

    // Verificar si enemigo llegó al fondo
    if (e.y + e.size / 2 >= height) {
      loseLife();
      enemies.splice(i, 1);
    }

    // Verificar colisión con jugador
    if (e.collidesWithPlayer(player)) {
      loseLife();
      enemies.splice(i, 1);
    }
  }

  // Actualizar y mostrar proyectiles enemigos
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

  // Mostrar HUD
  drawHUD();

  // Verificar si nivel terminado
  if (enemies.length === 0) {
    if (level === 3) {
      gameState = 'gameover'; // Ganó el juego
      saveScore();
    } else {
      gameState = 'transition';
      transitionTimer = 120;
    }
  }

  // Verificar si perdió todas las vidas
  if (lives <= 0) {
    gameState = 'gameover';
    saveScore();
  }
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
  fill(255, 0, 0);
  textSize(36);
  if (lives <= 0) {
    text('Juego Terminado', width / 2, height / 3);
  } else {
    text('¡Felicidades! Ganaste', width / 2, height / 3);
  }
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

// Manejo de teclado
function keyPressed() {
  if (gameState === 'start' && keyCode === ENTER) {
    level = 1;
    score = 0;
    lives = 3;
    startLevel();
  } else if (gameState === 'playing') {
    if (key === ' ') {
      player.shoot();
    }
  } else if (gameState === 'gameover' && keyCode === ENTER) {
    level = 1;
    score = 0;
    lives = 3;
    startLevel();
  }
}

// Perder vida y reiniciar si queda
function loseLife() {
  lives--;
  // Opcional: resetear posición del jugador o algún efecto
}

// Cargar top scores de localStorage
function loadTopScores() {
  let scores = localStorage.getItem('topScores');
  if (scores) {
    topScores = JSON.parse(scores);
  } else {
    topScores = [];
  }
}

// Guardar puntaje en top scores
function saveScore() {
  topScores.push(score);
  topScores.sort((a, b) => b - a);
  if (topScores.length > maxTopScores) {
    topScores.length = maxTopScores;
  }
  localStorage.setItem('topScores', JSON.stringify(topScores));
}

// --- Clases ---

class Player {
  constructor() {
    this.x = width / 2;
    this.y = height - 40;
    this.size = 40;
    this.speed = 5;
    this.canShoot = true;
  }

  update() {
    if (keyIsDown(LEFT_ARROW)) {
      this.x -= this.speed;
    }
    if (keyIsDown(RIGHT_ARROW)) {
      this.x += this.speed;
    }
    this.x = constrain(this.x, this.size / 2, width - this.size / 2);
  }

  show() {
    fill(0, 255, 255);
    noStroke();
    // Triángulo como nave
    push();
    translate(this.x, this.y);
    triangle(-this.size / 2, this.size / 2, this.size / 2, this.size / 2, 0, -this.size / 2);
    pop();
  }

  shoot() {
    // Limitar a 1 proyectil activo para simplicidad
    if (playerProjectiles.length < 1) {
      playerProjectiles.push(new Projectile(this.x, this.y - this.size / 2, -18, 10, 8));
    }
  }
}

class Enemy {
  constructor(x, y, health, speed, movementType, canShoot, isBoss = false) {
    this.x = x;
    this.y = y;
    this.health = health;
    this.maxHealth = health;
    this.speed = speed;
    this.movementType = movementType;
    this.canShoot = canShoot;
    this.size = isBoss ? 60 : 30;
    this.isBoss = isBoss;
    this.dir = 1; // para zigzag o movimientos
    this.step = 0; // para movimientos complejos
  }

  update() {
    switch (this.movementType) {
      case 'straight':
        this.y += this.speed * 0.5;
        break;
      case 'zigzag':
        this.y += this.speed * 0.7;
        this.x += this.dir * this.speed;
        if (this.x < this.size / 2 || this.x > width - this.size / 2) {
          this.dir *= -1;
        }
        break;
      case 'complex':
        this.step++;
        this.y += this.speed;
        this.x += sin(this.step * 0.1) * this.speed * 2;
        break;
      case 'boss':
        this.step++;
        this.x += sin(this.step * 0.05) * this.speed * 3;
        if (this.x < this.size / 2) this.x = this.size / 2;
        if (this.x > width - this.size / 2) this.x = width - this.size / 2;
        break;
    }
  }

  show() {
    if (this.isBoss) fill(255, 0, 0);
    else if (this.maxHealth > 1) fill(255, 165, 0);
    else fill(255);
    noStroke();
    ellipse(this.x, this.y, this.size);
    // Barra de vida
    if (this.maxHealth > 1) {
      fill(255, 0, 0);
      let w = map(this.health, 0, this.maxHealth, 0, this.size);
      rect(this.x - this.size / 2, this.y + this.size / 2 + 5, w, 5);
    }
  }

  hits(projectile) {
    let d = dist(this.x, this.y, projectile.x, projectile.y);
    return d < this.size / 2 + projectile.size / 2;
  }

  collidesWithPlayer(player) {
    let d = dist(this.x, this.y, player.x, player.y);
    return d < (this.size / 2 + player.size / 2);
  }
}

class Projectile {
  constructor(x, y, speedY, width, size) {
    this.x = x;
    this.y = y;
    this.speedY = speedY;
    this.width = width;
    this.size = size;
  }

  update() {
    this.y += this.speedY;
  }

  show() {
    fill(255, 255, 0);
    noStroke();
    rectMode(CENTER);
    rect(this.x, this.y, this.size / 3, this.size);
  }

  offscreen() {
    return this.y < 0 || this.y > height;
  }

  hitsPlayer(player) {
    let d = dist(this.x, this.y, player.x, player.y);
    return d < player.size / 2 + this.size / 2;
  }
}
