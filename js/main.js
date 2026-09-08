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

  update(deltaTime, keysPressed) {
    // Rotate left/right
    if (keysPressed['ArrowLeft']) this.angle -= 2.5 * deltaTime;
    if (keysPressed['ArrowRight']) this.angle += 2.5 * deltaTime;

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
  drone.update(deltaTime, keysPressed);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drone.draw(ctx);

  // Sync the HTML HUD (not drawn on canvas - cleaner separation)
  batteryDisplay.textContent = Math.floor(drone.batteryLevel);
  distanceDisplay.textContent = Math.floor(distanceTravelled);

  batteryCard.classList.toggle('low-battery', drone.batteryLevel < 20);
}

requestAnimationFrame(gameLoop);
