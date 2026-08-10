const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let lastTime = 0;

function gameLoop(timestamp) {
    if (!lastTime) {
        lastTime = timestamp;
    }

    const deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    update(deltaTime);
    render();

    requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    // All player movements, battery, and obstacle updates will come here
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Player drawing, obstacles, and HUD will come here
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial'; 
    ctx.fillText('EcoDash - Week 1 skeleton running', 20, 30);
}

requestAnimationFrame(gameLoop);
