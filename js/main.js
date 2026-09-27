// ==========================
// EcoDash - Core Setup
// ==========================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const batteryDisplay = document.getElementById('battery');
const distanceDisplay = document.getElementById('distance');
const batteryCard = batteryDisplay.closest('.hud-card');

let lastTime = 0;
let distanceTravelled = 0;
let windVisuals = [];

// ==========================
// Game state & scoring
// ==========================
let gameState = 'start'; // 'start', 'playing', 'paused', 'gameover'
let totalEnergyUsed = 0; // tracks drain only, not recharge - used for efficiency

let highScore = localStorage.getItem('ecoDashHighScore');
highScore = highScore ? parseInt(highScore) : 0;

const startScreen = document.getElementById('startScreen');
const pauseScreen = document.getElementById('pauseScreen');
const gameOverScreen = document.getElementById('gameOverScreen');

document.getElementById('highScoreDisplay').textContent = highScore;

function startGame() {
  gameState = 'playing';
  startScreen.classList.add('hidden');
  bgMusic.play();
}

function pauseGame() {
  gameState = 'paused';
  pauseScreen.classList.remove('hidden');
  bgMusic.pause();
}

function resumeGame() {
  gameState = 'playing';
  pauseScreen.classList.add('hidden');
  bgMusic.play();
}

function endGame() {
  gameState = 'gameover';

  if (distanceTravelled > highScore) {
    highScore = Math.floor(distanceTravelled);
    localStorage.setItem('ecoDashHighScore', highScore);
  }

  const efficiency = totalEnergyUsed > 0
    ? (distanceTravelled / totalEnergyUsed).toFixed(2)
    : '0.00';

  document.getElementById('finalDistance').textContent = Math.floor(distanceTravelled);
  document.getElementById('finalEfficiency').textContent = efficiency;
  document.getElementById('finalHighScore').textContent = highScore;
  document.getElementById('finalDeliveries').textContent = deliveriesCompleted;
  gameOverScreen.classList.remove('hidden');
}

function restartGame() {
  drone.x = 100;
  drone.y = 250;
  drone.angle = 0;
  drone.batteryLevel = 100;

  distanceTravelled = 0;
  totalEnergyUsed = 0;
  deliveriesCompleted = 0;
  
  deliveryTarget = generateDeliveryTarget();
  obstacles = generateObstacles();

  gameOverScreen.classList.add('hidden');
  gameState = 'playing';
}

// ==========================
// Vehicle Class (the player)
// ==========================
class Vehicle {
  constructor(x, y) {

    this.x = x;
    this.y = y;
    this.radius = 15;
    this.angle = 0;           // direction, in radians
    this.speed = 0;
    this.maxSpeed = 120;
    this.acceleration = 200;      // pixels per second
    this.batteryLevel = 100;
    this.drainRate = 5;       // % per second while moving
  }

  update(deltaTime, keysPressed, controlMultiplier = 1) {
     this.prevX = this.x;
     this.prevY = this.y;
    // Rotate left/right
    if (keysPressed['ArrowLeft']) this.angle -= 2.5 * deltaTime * controlMultiplier;
if (keysPressed['ArrowRight']) this.angle += 2.5 * deltaTime * controlMultiplier;

    // Accelerate forward, only if there's battery left
    if (keysPressed['ArrowUp'] && this.batteryLevel > 0) {
  this.speed = Math.min(this.maxSpeed, this.speed + this.acceleration * deltaTime);
    } else {
      this.speed = Math.max(0, this.speed - this.acceleration * deltaTime);
    }

    // Trig-based movement: angle + speed -> x/y direction
    const moveX = Math.cos(this.angle) * this.speed * deltaTime;
    const moveY = Math.sin(this.angle) * this.speed * deltaTime;
    this.x += moveX;
    this.y += moveY;

    // Track distance travelled (for the score system later)
    if (this.speed > 0) {
  distanceTravelled += Math.sqrt(moveX * moveX + moveY * moveY);
  const drain = this.drainRate * deltaTime;
  this.batteryLevel -= drain;
  this.batteryLevel = Math.max(0, this.batteryLevel);
  totalEnergyUsed += drain; // NEW - tracks total drain for efficiency score
}

    // Keep the drone inside the canvas
    this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));
  }

  draw(context) {
    context.save();
    context.translate(this.x, this.y);
    context.rotate(this.angle);
    context.fillStyle = '#2ecc71';
    context.beginPath();
    context.moveTo(15, 0);
    context.lineTo(-10, -10);
    context.lineTo(-10, 10);
    context.closePath();
    context.fill();
    context.restore();
  }
}

// ==========================
// Circular Obstacle Class
// ==========================

class Obstacle {
  constructor(x, y, radius, type) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.type = type;
    this.active = true;
    this.windAngle = Math.random() * Math.PI * 2;
  }

  draw(context) {
    context.beginPath();
    context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

    let label = '';
    if (this.type === 'windGust') {
      // MODIFIED: Make it a faint clear outline so particles take center stage
      context.fillStyle = 'rgba(174, 214, 241, 0.15)'; 
      label = 'WIND';
    } else if (this.type === 'noFlyZone') {
      context.fillStyle = 'rgba(231, 76, 60, 0.45)';
      label = 'NO-FLY';
    } else if (this.type === 'signalDeadZone') {
      context.fillStyle = 'rgba(155, 89, 182, 0.45)';
      label = 'NO SIGNAL';
    } else if (this.type === 'chargingStation') {
      context.fillStyle = this.active ? '#27ae60' : '#7f8c8d';
      label = this.active ? 'CHARGE' : 'OFFLINE';
    }

    context.fill();
    // MODIFIED: Wind zone gets a cool matching blue border, others keep the dark overlay border
    context.strokeStyle = this.type === 'windGust' ? 'rgba(52, 152, 219, 0.4)' : 'rgba(0, 0, 0, 0.4)';
    context.lineWidth = 2;
    context.stroke();

    // Label text, centered
    context.fillStyle = '#1a1a1a';
    context.font = 'bold 12px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, this.x, this.y);
  }
}


// ==========================
// Delivery Target (the mission objective)
// ==========================
class DeliveryTarget {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 20;
  }

  draw(context) {
    context.beginPath();
    context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    context.fillStyle = 'rgba(241, 196, 15, 0.9)';
    context.fill();
    context.strokeStyle = '#1a1a1a';
    context.lineWidth = 2;
    context.stroke();

    context.fillStyle = '#1a1a1a';
    context.font = 'bold 10px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('DELIVERY', this.x, this.y);
  }
}

  // ==========================
// Building Class (solid, rectangular)
// ==========================
class Building {
  constructor(x, y, width, height, roofColor) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.roofColor = roofColor || '#c0392b'; // default roof colour, can vary per building
  }

  draw(context) {
    // Walls
    context.fillStyle = '#7f8c8d';
    context.fillRect(this.x, this.y, this.width, this.height);
    context.strokeStyle = '#2c2c2c';
    context.strokeRect(this.x, this.y, this.width, this.height);

    // Roof strip along the top
    context.fillStyle = this.roofColor;
    context.fillRect(this.x, this.y, this.width, 10);

    // Windows - simple grid of small squares
    context.fillStyle = 'rgba(255, 240, 150, 0.8)';
    const windowSize = 8;
    const gap = 14;
    for (let wx = this.x + 8; wx < this.x + this.width - 8; wx += gap) {
      for (let wy = this.y + 20; wy < this.y + this.height - 10; wy += gap) {
        context.fillRect(wx, wy, windowSize, windowSize);
      }
    }
  }
}

// ==========================
// House Class (small, decorative only - no collision)
// ==========================
class House {
  constructor(x, y, size, roofColor) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.roofColor = roofColor || '#c0392b';
  }

  draw(context) {
    const s = this.size;

    // Walls
    context.fillStyle = '#d8c9a3';
    context.fillRect(this.x, this.y + s * 0.4, s, s * 0.6);
    context.strokeStyle = '#2c2c2c';
    context.strokeRect(this.x, this.y + s * 0.4, s, s * 0.6);

    // Triangular roof
    context.fillStyle = this.roofColor;
    context.beginPath();
    context.moveTo(this.x - s * 0.1, this.y + s * 0.4);
    context.lineTo(this.x + s / 2, this.y);
    context.lineTo(this.x + s * 1.1, this.y + s * 0.4);
    context.closePath();
    context.fill();
    context.stroke();

    // Door
    context.fillStyle = '#5c3a21';
    context.fillRect(this.x + s * 0.4, this.y + s * 0.75, s * 0.2, s * 0.25);
  }
}

// ==========================
// Decorative trees (visual only - no collision)
// ==========================
function drawTree(context, x, y) {
  context.fillStyle = '#5c3a21'; // trunk
  context.fillRect(x - 3, y, 6, 14);

  context.fillStyle = '#2e6b3e'; // leaves
  context.beginPath();
  context.arc(x, y - 4, 12, 0, Math.PI * 2);
  context.fill();
}

const treePositions = [
  [70, 120], [200, 100], [350, 90], [600, 110], [750, 90],
  [90, 300], [470, 270], [740, 300],
  [100, 460], [350, 440], [600, 460], [770, 450],
];

function drawRoads(context) {
  const roadWidth = 30;
  const horizontalRoads = [170, 350];
  const verticalRoads = [270, 530];

  context.fillStyle = '#0d0d0d'; // black asphalt

  horizontalRoads.forEach(y => {
    context.fillRect(0, y - roadWidth / 2, canvas.width, roadWidth);
  });
  verticalRoads.forEach(x => {
    context.fillRect(x - roadWidth / 2, 0, roadWidth, canvas.height);
  });

  context.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  context.lineWidth = 2;
  context.setLineDash([12, 10]);

  horizontalRoads.forEach(y => {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  });
  verticalRoads.forEach(x => {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  });

  context.setLineDash([]);
}

// ==========================
// Collision detection
// ==========================

// Circle vs circle (drone vs wind/no-fly/dead-zone/charging station)
function isColliding(a, b){
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < a.radius + b.radius;
}

// Circle vs rectangle (drone vs building) - AABB-style check
function isCollidingWithBuilding(circle, rect){
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));

  const dx = circle.x - closestX;
  const dy = circle.y - closestY;

  return (dx * dx + dy * dy) < (circle.radius * circle.radius);
}

// ==========================
// Obstacles, Buildings & Load-shedding
// ==========================
function generateObstacles() {
  const types = ['windGust', 'noFlyZone', 'signalDeadZone'];
  const generated = [];

  types.forEach(type => {
    generated.push(new Obstacle(
      Math.random() * (canvas.width - 100) + 50,
      Math.random() * (canvas.height - 100) + 50,
      Math.random() * 15 + 80,
      type
    ));
  });

  generated.push(new Obstacle(140, 260, 45, 'chargingStation'));

  // Find the wind zone and scatter the lines all over the interior circle area
  const windZone = generated.find(obs => obs.type === 'windGust');
  if (windZone) {
    windVisuals = []; 
    
    // Increased particle count to 35 so the entire circle area looks busy and populated!
    for (let i = 0; i < 35; i++) {
      // Pick a random angle and a random distance inside the boundary radius
      let randomAngle = Math.random() * Math.PI * 2;
      let randomRadius = Math.random() * windZone.radius;

      windVisuals.push({
        x: windZone.x + Math.cos(randomAngle) * randomRadius,
        y: windZone.y + Math.sin(randomAngle) * randomRadius,
        length: Math.random() * 15 + 10,
        speed: Math.random() * 1.2 + 1.8 
      });
    }
  }

  return generated;
}



let obstacles = generateObstacles();

const buildings = [
  new Building(300, 15, 60, 90, '#8e44ad'),
  new Building(660, 25, 55, 90, '#c0392b'),
  new Building(400, 210, 60, 90, '#8e44ad'),
  new Building(400, 385, 55, 90, '#c0392b'),
  new Building(650, 380, 55, 85, '#27ae60'),
];

const houses = [
  new House(30, 60, 45, '#c0392b'),
  new House(120, 80, 40, '#e67e22'),
  new House(420, 60, 40, '#e67e22'),
  new House(600, 60, 40, '#27ae60'),
  new House(300, 250, 40, '#c0392b'),
  new House(650, 250, 45, '#e67e22'),
  new House(60, 400, 45, '#c0392b'),
  new House(150, 420, 40, '#27ae60'),
  new House(470, 410, 40, '#e67e22'),
  new House(730, 400, 40, '#c0392b'),
];

function generateDeliveryTarget() {
  return new DeliveryTarget(
    Math.random() * (canvas.width - 100) + 50,
    Math.random() * (canvas.height - 100) + 50
  );
}

let deliveryTarget = generateDeliveryTarget();
let deliveriesCompleted = 0;
const deliveryCountDisplay = document.getElementById('deliveryCount');

let loadSheddingTimer = 0;
const loadSheddingCycle = 8;

// ==========================
// Input tracking
// ==========================
const keysPressed = {};
window.addEventListener('keydown', (e) => keysPressed[e.key] = true);
window.addEventListener('keyup', (e) => keysPressed[e.key] = false);

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('resumeBtn').addEventListener('click', resumeGame);
document.getElementById('restartBtn').addEventListener('click', restartGame);

// ==========================
// Background music
// ==========================
const bgMusic = document.getElementById('bgMusic');
const volumeSlider = document.getElementById('volumeSlider');

bgMusic.volume = volumeSlider.value / 100;

volumeSlider.addEventListener('input', () => {
  bgMusic.volume = volumeSlider.value / 100;
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'p' || e.key === 'P') {
    if (gameState === 'playing') pauseGame();
    else if (gameState === 'paused') resumeGame();
  }
});

// ==========================
// Game objects
// ==========================
const drone = new Vehicle(30, 250);

let engineFXParticles = [];

// ==========================
// Game loop
// ==========================
function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const deltaTime = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  update(deltaTime);
  render();

  requestAnimationFrame(gameLoop);
}

// ==========================
// Wind Visual Particles Update
// ==========================
function updateWindZoneEffect() {
  const windZone = obstacles.find(obs => obs.type === 'windGust');
  if (!windZone) return;

  windVisuals.forEach(streak => {
    // 1. Move the streak along the wind direction angle
    streak.x += Math.cos(windZone.windAngle) * streak.speed;
    streak.y += Math.sin(windZone.windAngle) * streak.speed;

    // 2. Calculate the distance from the center of the wind zone circle
    let dx = streak.x - windZone.x;
    let dy = streak.y - windZone.y;
    let distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

    // 3. If the streak leaves the boundary, scatter it uniquely on the incoming rim
    if (distanceFromCenter > windZone.radius) {
      // Pick a random angle facing the incoming wind direction (adds a 180-degree spread)
      // This completely stops them from funneling into a single straight line!
      let incomingSpreadAngle = windZone.windAngle + Math.PI + (Math.random() - 0.5) * Math.PI;
      
      // Place the particle on the edge of the circle using this new scattered entry angle
      // We scale it down slightly to 0.95 so it spawns just inside the boundary ring
      streak.x = windZone.x + Math.cos(incomingSpreadAngle) * (windZone.radius * 0.95);
      streak.y = windZone.y + Math.sin(incomingSpreadAngle) * (windZone.radius * 0.95);
      
      // Give it a fresh random speed so particles break apart from each other
      streak.speed = Math.random() * 1.2 + 1.8;
      streak.length = Math.random() * 15 + 10;
    }
  });
}




function update(deltaTime) {
  if (gameState !== 'playing') return;
  // Check if drone is currently inside a signal dead zone (affects control before moving)
  let controlMultiplier = 1;
  obstacles.forEach(obstacle => {
    if (obstacle.type === 'signalDeadZone' && isColliding(drone, obstacle)) {
      controlMultiplier = 0.3; // rotation becomes sluggish
    }
  });

  drone.update(deltaTime, keysPressed, controlMultiplier);
  
  // NEW: Call the wind visual update right here!
  updateWindZoneEffect();

  // Load-shedding cycle
  loadSheddingTimer += deltaTime;
  if (loadSheddingTimer >= loadSheddingCycle) {
    loadSheddingTimer = 0;
    obstacles.forEach(obstacle => {
      if (obstacle.type === 'chargingStation') obstacle.active = !obstacle.active;
    });
  }

  // Handle each obstacle type
  obstacles.forEach(obstacle => {
    if (!isColliding(drone, obstacle)) return;

    if (obstacle.type === 'windGust') {
      drone.x += Math.cos(obstacle.windAngle) * 80 * deltaTime;
      drone.y += Math.sin(obstacle.windAngle) * 80 * deltaTime;
    } else if (obstacle.type === 'noFlyZone') {
      drone.batteryLevel = Math.max(0, drone.batteryLevel - 10 * deltaTime); // penalty for restricted airspace
    } else if (obstacle.type === 'chargingStation' && obstacle.active) {
      drone.batteryLevel = Math.min(100, drone.batteryLevel + 20 * deltaTime);
    }
  });

  if (isColliding(drone, deliveryTarget)) {
    deliveriesCompleted++;
    deliveryTarget = generateDeliveryTarget();
  }

  // Buildings block movement entirely
  buildings.forEach(building => {
    if (isCollidingWithBuilding(drone, building)) {
      drone.x = drone.prevX;
      drone.y = drone.prevY;
    }
  });
  
  if (drone.batteryLevel <= 0 && gameState === 'playing') {
    endGame();
  }
}


function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawRoads(ctx);
  treePositions.forEach(([x, y]) => drawTree(ctx, x, y));

  buildings.forEach(building => building.draw(ctx));
  houses.forEach(house => house.draw(ctx));
  obstacles.forEach(obstacle => obstacle.draw(ctx));
  
  // NEW: Draw the clean wind streaks inside the wind circle
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)'; // Faint wind current color
  ctx.lineWidth = 1.5;
  
  windVisuals.forEach(streak => {
    ctx.beginPath();
    ctx.moveTo(streak.x, streak.y);
    
    // Angling the line streaks to point in the direction the wind pushes
    const windZone = obstacles.find(obs => obs.type === 'windGust');
    const angle = windZone ? windZone.windAngle : 0;
    
    ctx.lineTo(streak.x + Math.cos(angle) * streak.length, streak.y + Math.sin(angle) * streak.length);
    ctx.stroke();
  });
  ctx.restore();

  drone.draw(ctx);
  deliveryTarget.draw(ctx);

  deliveryCountDisplay.textContent = deliveriesCompleted;
  batteryDisplay.textContent = Math.floor(drone.batteryLevel);
  distanceDisplay.textContent = Math.floor(distanceTravelled);
  batteryCard.classList.toggle('low-battery', drone.batteryLevel < 20);
}


requestAnimationFrame(gameLoop);
