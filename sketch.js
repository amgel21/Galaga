let player;
let playerProjectiles = [];
let enemyProjectiles = [];
let enemies = [];
let particles = [];
let stars = [];
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
let galagaImage;
let introMusic;
let introMusicPlayed = false;
let shootSound;
let enemyShootSound;
let pauseSound;

// NUEVAS VARIABLES PARA EL NOMBRE
let playerName = '';
let enteringName = false;

const LEVELS = {
  1: { enemyCount: 10, enemySpeed: 1, enemyMovement: 'straight', enemiesShoot: false, resistantCount: 0, boss: false },
  2: { enemyCount: 15, enemySpeed: 0.5, enemyMovement: 'zigzag', enemiesShoot: true, resistantCount: 1, boss: false },
  3: { enemyCount: 20, enemySpeed: 0.5, enemyMovement: 'complex', enemiesShoot: true, resistantCount: 2, boss: true }
};

function preload() {
  playerImage = loadImage('AVION.png');
  projectileImage = loadImage('balas.png');
  EnemyImage = loadImage('ENEMIGO.png');
  galagaImage = loadImage('galaga.png');
  introMusic = loadSound('Intro.mp3');
  shootSound = loadSound('Disparo.mp3');
  enemyShootSound = loadSound('DisparoEnemigos.mp3');
  pauseSound = loadSound('Pausar.mp3');
}

function setup() {
  createCanvas(600, 600);
  textAlign(CENTER, CENTER);
  player = new Player();
  loadTopScores();

  for (let i = 0; i < 100; i++) {
    stars.push({ x: random(width), y: random(height), speed: random(0.5, 1.5) });
  }
}

function startLevel() {
  if (introMusic.isPlaying()) {
    introMusic.stop();
  }

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

function draw() {
  background(0);

  for (let star of stars) {
    fill(255);
    noStroke();
    ellipse(star.x, star.y, 2);
    star.y += star.speed;
    if (star.y > height) {
      star.y = 0;
      star.x = random(width);
    }
  }

  if (gameState === 'start') {
    if (!introMusicPlayed) {
      introMusic.play();
      introMusicPlayed = true;
    }
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
  } else if (gameState === 'entername') {
    drawEnterNameScreen();
  }
}

function drawStartScreen() {
  background(0, 150);
  imageMode(CENTER);
  image(galagaImage, width / 2, height / 6, 250, 100);

  fill(200);
  textSize(16);
  text("Usa ← → para moverte", width / 2, height / 2 - 40);
  text("Barra espaciadora para disparar", width / 2, height / 2 - 15);
  text("Presiona ENTER para comenzar", width / 2, height / 2 + 10);

  textSize(18);
  fill(255, 204, 0);
  text(" Top 5 Puntuaciones:", width / 2, height / 2 + 70);
  fill(255);
  for (let i = 0; i < topScores.length; i++) {
    let entry = topScores[i];
    text(`${i + 1}. ${entry.name || '----'}: ${entry.score}`, width / 2, height / 2 + 100 + i * 25);
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
      if (enemyShootSound && enemyShootSound.isLoaded()) {
        enemyShootSound.play();
      }
    }

    for (let j = playerProjectiles.length - 1; j >= 0; j--) {
      let p = playerProjectiles[j];
      if (e.hits(p)) {
        e.health--;
        playerProjectiles.splice(j, 1);

        if (e.health <= 0) {
          score += e.isBoss ? 10 : e.maxHealth > 1 ? 3 : 1;
          enemies.splice(i, 1);

          for (let k = 0; k < 10; k++) {
            let angle = random(TWO_PI);
            let speed = random(1, 3);
            particles.push({
              x: e.x,
              y: e.y,
              dx: cos(angle) * speed,
              dy: sin(angle) * speed,
              life: 30
            });
          }
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

  for (let i = particles.length - 1; i >= 0; i--) {
    let prt = particles[i];
    fill(255, 150, 0, map(prt.life, 0, 30, 0, 255));
    noStroke();
    ellipse(prt.x, prt.y, 6);
    prt.x += prt.dx;
    prt.y += prt.dy;
    prt.life--;
    if (prt.life <= 0) particles.splice(i, 1);
  }

  drawHUD();

  if (enemies.length === 0) {
    if (level === 3) {
      gameState = 'entername';
      playerName = '';
      enteringName = true;
    } else {
      gameState = 'transition';
      transitionTimer = 120;
    }
  }
  if (lives <= 0) {
    gameState = 'entername';
    playerName = '';
    enteringName = true;
  }
}

function drawPauseScreen() {
  fill(0, 0, 0, 180);
  rect(0, 0, width, height);
  textAlign(CENTER, CENTER);
  fill(255);
  textSize(36);
  text('PAUSADO', width / 2, height / 2 - 20);
  textSize(18);
  text('Presiona P para continuar', width / 2, height / 2 + 20);
}

function drawTransition() {
  let alpha = map(transitionTimer, 0, 120, 255, 0);
  fill(255, alpha);
  textSize(28);
  textAlign(CENTER, CENTER);
  text(`Nivel ${level} completado!`, width / 2, height / 2);
  transitionTimer--;
  if (transitionTimer <= 0) {
    level++;
    startLevel();
  }
}

function drawEnterNameScreen() {
  background(0, 180);
  fill(255);
  rectMode(CENTER);
  rect(width / 2, height / 2, 400, 200, 20);
  fill(0);
  textAlign(CENTER, CENTER);
  textSize(24);
  text('¡Juego Terminado!', width / 2, height / 2 - 60);
  textSize(18);
  text('Ingresa tu nombre (máx. 4 letras):', width / 2, height / 2 - 20);
  textSize(32);
  text(playerName + (frameCount % 40 < 20 ? '_' : ''), width / 2, height / 2 + 30);
  textSize(16);
  text('Presiona ENTER para confirmar', width / 2, height / 2 + 70);
}

function drawGameOver() {

  background(30, 30, 40, 240);

  push();
  noStroke();
  fill(0, 150);
  rectMode(CENTER);
  rect(width / 2 + 6, height / 2 + 6, 460, 360, 30);
  pop();


  fill(250);
  rectMode(CENTER);
  rect(width / 2, height / 2, 460, 360, 30);

  
  noFill();
  stroke(0, 200, 255);
  strokeWeight(3);
  rect(width / 2, height / 2, 460, 360, 30);

  textAlign(CENTER, CENTER);
  textSize(36);
  textStyle(BOLD);
  fill(lives <= 0 ? '#ff4c4c' : '#32cd32'); 
  text(lives <= 0 ? ' GAME OVER' : ' ¡GANASTE!', width / 2, height / 2 - 110);

  textSize(24);
  textStyle(BOLD);
  fill(20);
  text(`Puntaje Final: ${score}`, width / 2, height / 2 - 60);

  textSize(18);
  fill(60);
  textStyle(NORMAL);
  text('Presiona ENTER para volver a intentarlo', width / 2, height / 2 - 25);

  fill(50);
  textSize(20);
  textStyle(BOLD);
  text(' Top 5 Puntuaciones:', width / 2, height / 2 + 15);

  fill(30);
  textSize(16);
  textStyle(NORMAL);
  for (let i = 0; i < topScores.length; i++) {
    const entry = topScores[i];
    text(`${i + 1}. ${entry.name || '----'}: ${entry.score}`, width / 2, height / 2 + 45 + i * 24);
  }
}


function drawHUD() {
  noStroke();
  fill(0, 0, 0, 150);
  rect(5, 5, 150, 60, 10);

  fill(255);
  textAlign(LEFT, TOP);
  textSize(14);
  text(` Puntaje: ${score}`, 15, 10);
  text(` Vidas: ${lives}`, 15, 25);
  text(` Nivel: ${level}`, 15, 40);
}

function keyPressed() {
  if (gameState === 'entername') {
    if (keyCode === ENTER && playerName.length > 0) {
      enteringName = false;
      gameState = 'gameover';
      saveScore(playerName);
    } else if (keyCode === BACKSPACE) {
      playerName = playerName.slice(0, -1);
    } else if (/^[a-zA-Z]$/.test(key) && playerName.length < 4) {
      playerName += key.toUpperCase();
    }
    return;
  }

  if (keyCode === ENTER) {
    if (gameState === 'start') {
      level = 1; score = 0; lives = 3; startLevel();
    } else if (gameState === 'gameover') {
      level = 1; score = 0; lives = 3;
      player = new Player();
      loadTopScores();
      gameState = 'start';
    } else if (gameState === 'transition') {
      gameState = 'playing';
    }
  } else if (key === ' ' && gameState === 'playing') {
    player.shoot();
  } else if (key === 'p' || key === 'P') {
    if (gameState === 'playing') {
      isPaused = !isPaused;
      if (pauseSound && pauseSound.isLoaded()) {
        pauseSound.play();
      }
    }
  }
}

//  CLASES 
class Player {
  constructor() {
    this.x = width / 2;
    this.y = height - 40;
    this.size = 40;
    this.speed = 5;
  }

  update() {
    if (keyIsDown(LEFT_ARROW))  this.x -= this.speed;
    if (keyIsDown(RIGHT_ARROW)) this.x += this.speed;
    this.x = constrain(this.x, this.size / 2, width - this.size / 2);
  }

  show() {
    imageMode(CENTER);
    image(playerImage, this.x, this.y, this.size, this.size);
  }

  shoot() {
    playerProjectiles.push(new Projectile(this.x, this.y - 20, 5, 10, -7));
    shootSound.play(); 
  }
}

class Projectile {
  constructor(x, y, w, h, speed) {
    this.x = x; this.y = y; this.w = w; this.h = h; this.speed = speed;
  }

  update() { this.y += this.speed; }

  show() {
    push();
    translate(this.x, this.y);

    for (let i = 0; i < 3; i++) {
      fill(255, 255, 0, 100 - i * 30);
      ellipse(0, 0, this.w * 3 + i * 4, this.h * 3 + i * 4);
    }

    imageMode(CENTER);
    image(projectileImage, 0, 0, this.w * 3, this.h * 3);
    pop();
  }

  offscreen() { return this.y < 0 || this.y > height; }

  hitsPlayer(player) {
    return collideRectCircle(player.x - player.size / 2, player.y - player.size / 2, player.size, player.size, this.x, this.y, this.w);
  }
}

class Enemy {
  constructor(x, y, health = 1, speed = 1, movement = 'straight', canShoot = false, isBoss = false) {
    this.x = x; this.y = y; this.health = health; this.maxHealth = health;
    this.size = isBoss ? 60 : 30;
    this.speed = speed; this.movement = movement;
    this.canShoot = canShoot; this.isBoss = isBoss;
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

  if (this.maxHealth > 1) {
    let barWidth = this.size;
    let barHeight = 5;
    let healthRatio = this.health / this.maxHealth;
    let barX = this.x - barWidth / 2;
    let barY = this.y - this.size / 2 - 10;

    
    fill(100);
    rect(barX, barY, barWidth, barHeight);

    fill(0, 255, 0);
    rect(barX, barY, barWidth * healthRatio, barHeight);
  }
}

  hits(projectile)    { return dist(this.x, this.y, projectile.x, projectile.y) < this.size / 2; }
  collidesWithPlayer(player) { return dist(this.x, this.y, player.x, player.y) < (this.size + player.size) / 2; }
}

function loadTopScores() {
  let storedScores = getItem('topScores');
  topScores = Array.isArray(storedScores) ? storedScores : [];
}

function saveScore(name) {
  if (!name) name = '----';
  topScores.push({ name, score });
  topScores.sort((a, b) => b.score - a.score);
  if (topScores.length > maxTopScores) topScores.length = maxTopScores;
  storeItem('topScores', topScores);
}

//  GESTIÓN DE VIDAS 
function loseLife() {
  lives--;
  if (lives <= 0) {
    gameState = 'entername';
    playerName = '';
    enteringName = true;
  }
}