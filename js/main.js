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
    this.maxSpeed = 120;      // pixels per second
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
      this.speed = this.maxSpeed;
    } else {
      this.speed = 0;
    }

    // Trig-based movement: angle + speed -> x/y direction
    const moveX = Math.cos(this.angle) * this.speed * deltaTime;
    const moveY = Math.sin(this.angle) * this.speed * deltaTime;
    this.x += moveX;
    this.y += moveY;

    // Track distance travelled (for the score system later)
    if (this.speed > 0) {
      distanceTravelled += Math.sqrt(moveX * moveX + moveY * moveY);
      this.batteryLevel -= this.drainRate * deltaTime;
      this.batteryLevel = Math.max(0, this.batteryLevel);
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
  constructor(x, y, radius, type){
    this.x = x;
    this.y = y;
    this.radius = radius;
   this.type = type;          // 'windGust', 'noFlyZone', 'signalDeadZone', 'chargingStation'
    this.active = true;        // used by chargingStation for load-shedding
    this.windAngle = Math.random() * Math.PI * 2; // direction wind pushes, if this is a windGust
  }


  draw(context) {
    context.beginPath();
    context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

    if (this.type === 'windGust') context.fillStyle = 'rgba(174, 214, 241, 0.5)';
    if (this.type === 'noFlyZone') context.fillStyle = 'rgba(231, 76, 60, 0.4)';
    if (this.type === 'signalDeadZone') context.fillStyle = 'rgba(155, 89, 182, 0.4)';
    if (this.type === 'chargingStation') context.fillStyle = this.active ? '#27ae60' : '#7f8c8d';

    context.fill();

    }
  }

  // ==========================
// Building Class (solid, rectangular)
// ==========================

class Building {
  constructor (x, y, width, height){
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  draw(context){
    context.fillStyle = '#4a4a4a';
    context.fillRect(this.x, this.y, this.width, this.height);
    context.strokeStyle = '#2c2c2c';
    context.strokeRect(this.x, this.y, this.width, this.height);
  }
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
const obstacles = [
  new Obstacle(300, 150, 25, 'windGust'),
  new Obstacle(500, 350, 30, 'noFlyZone'),
  new Obstacle(200, 380, 28, 'signalDeadZone'),
  new Obstacle(650, 100, 20, 'chargingStation')
];

const buildings = [
  new Building(400, 200, 60, 150),
  new Building(150, 500, 70, 90),
  new Building(600, 200, 100, 150),
  new Building(700, 450, 55, 110)
];

let loadSheddingTimer = 0;
const loadSheddingCycle = 8; // seconds on/off for charging station

// ==========================
// Input tracking
// ==========================
const keysPressed = {};
window.addEventListener('keydown', (e) => keysPressed[e.key] = true);
window.addEventListener('keyup', (e) => keysPressed[e.key] = false);

// ==========================
// Game objects
// ==========================
const drone = new Vehicle(100, 250);

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

function update(deltaTime) {
  // Check if drone is currently inside a signal dead zone (affects control before moving)
  let controlMultiplier = 1;
  obstacles.forEach(obstacle => {
    if (obstacle.type === 'signalDeadZone' && isColliding(drone, obstacle)) {
      controlMultiplier = 0.3; // rotation becomes sluggish
    }
  });

  drone.update(deltaTime, keysPressed, controlMultiplier);

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
      drone.x += Math.cos(obstacle.windAngle) * 40 * deltaTime;
      drone.y += Math.sin(obstacle.windAngle) * 40 * deltaTime;
    } else if (obstacle.type === 'noFlyZone') {
      drone.batteryLevel = Math.max(0, drone.batteryLevel - 10 * deltaTime); // penalty for restricted airspace
    } else if (obstacle.type === 'chargingStation' && obstacle.active) {
      drone.batteryLevel = Math.min(100, drone.batteryLevel + 20 * deltaTime);
    }
  });

  // Buildings block movement entirely
  buildings.forEach(building => {
    if (isCollidingWithBuilding(drone, building)) {
      drone.x = drone.prevX;
      drone.y = drone.prevY;
    }
  });
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drone.draw(ctx);

  buildings.forEach(building => building.draw(ctx));
  obstacles.forEach(obstacle => obstacle.draw(ctx));

  // Sync the HTML HUD (not drawn on canvas - cleaner separation)
  batteryDisplay.textContent = Math.floor(drone.batteryLevel);
  distanceDisplay.textContent = Math.floor(distanceTravelled);

  batteryCard.classList.toggle('low-battery', drone.batteryLevel < 20);
}

requestAnimationFrame(gameLoop);
