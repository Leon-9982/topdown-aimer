const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let score = 0;
let totalShots = 0;
let hitShots = 0;
let lastFiveShots = [];
let fov = 1;
let player = { x: canvas.width / 2, y: canvas.height / 2, size: 20, gunLength: 50, gunWidth: 10, fireDelay: 250 };
let target = { x: Math.random() * 8000 - 4000, y: Math.random() * 8000 - 4000, size: 20, speed: 2, direction: Math.random() * 2 * Math.PI };
let bullets = [];
let keys = {};
let mouseAngle = 0;
let lastUpdateTime = Date.now();
let lastFireTime = 0;
const targetChangeInterval = 1000; // Change direction every second

document.addEventListener('keydown', (e) => keys[e.key] = true);
document.addEventListener('keyup', (e) => keys[e.key] = false);
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseAngle = Math.atan2(e.clientY - rect.top - canvas.height / 2, e.clientX - rect.left - canvas.width / 2);
});
canvas.addEventListener('click', shoot);

function setFOV(value) {
    fov = value;
}

function shoot(event) {
    const currentTime = Date.now();
    if (currentTime - lastFireTime >= player.fireDelay) {
        const bulletStartX = player.x + (player.size + player.gunLength) * Math.cos(mouseAngle);
        const bulletStartY = player.y + (player.size + player.gunLength) * Math.sin(mouseAngle);
        bullets.push({ x: bulletStartX, y: bulletStartY, angle: mouseAngle, speed: 70 });
        totalShots++;
        lastFireTime = currentTime;
    }
}

function update() {
    const currentTime = Date.now();
    const deltaTime = currentTime - lastUpdateTime;

    // Player movement
    if (keys['w']) player.y -= 5;
    if (keys['s']) player.y += 5;
    if (keys['a']) player.x -= 5;
    if (keys['d']) player.x += 5;

    // Bullet movement and collision detection
    bullets.forEach((bullet, index) => {
        bullet.x += bullet.speed * Math.cos(bullet.angle);
        bullet.y += bullet.speed * Math.sin(bullet.angle);

        // Check if bullet hits the target
        const dist = Math.hypot(bullet.x - target.x, bullet.y - target.y);
        if (dist < target.size) {
            // Bullet hit the target
            score++;
            hitShots++;
            lastFiveShots.push(true);
            target = {
                x: Math.random() * 8000 - 4000,
                y: Math.random() * 8000 - 4000,
                size: 20,
                speed: target.speed + 0.5,
                direction: Math.random() * 2 * Math.PI
            };
            bullets.splice(index, 1); // Remove bullet
        } else if (bullet.x < -4000 || bullet.x > 4000 || bullet.y < -4000 || bullet.y > 4000) {
            // Remove bullet if it goes off screen
            bullets.splice(index, 1);
            lastFiveShots.push(false);
        }
        // Keep only the last 5 shots in the array
        if (lastFiveShots.length > 5) {
            lastFiveShots.shift();
        }
    });

    // Target movement
    if (deltaTime > targetChangeInterval) {
        // Change direction randomly
        target.direction = Math.random() * 2 * Math.PI;
        lastUpdateTime = currentTime;
    }
    target.x += target.speed * Math.cos(target.direction);
    target.y += target.speed * Math.sin(target.direction);

    // Check for target boundary collision
    if (target.x < -4000 || target.x > 4000) target.direction = Math.PI - target.direction;
    if (target.y < -4000 || target.y > 4000) target.direction = -target.direction;
}

function calculateAccuracy(shots, hits) {
    return shots > 0 ? ((hits / shots) * 100).toFixed(2) : 0.00;
}

function calculateLastFiveAccuracy() {
    const hits = lastFiveShots.filter(shot => shot).length;
    return calculateAccuracy(lastFiveShots.length, hits);
}

function drawGrid() {
    const step = 50;
    ctx.strokeStyle = '#ccc';
    for (let x = -4000; x < 4000; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, -4000);
        ctx.lineTo(x, 4000);
        ctx.stroke();
    }
    for (let y = -4000; y < 4000; y += step) {
        ctx.beginPath();
        ctx.moveTo(-4000, y);
        ctx.lineTo(4000, y);
        ctx.stroke();
    }
}

function drawArrowToTarget() {
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const angle = Math.atan2(dy, dx);

    const arrowX = canvas.width / 2 + (player.size + 20) * Math.cos(angle);
    const arrowY = canvas.height / 2 + (player.size + 20) * Math.sin(angle);

    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(arrowX - 10 * Math.cos(angle - Math.PI / 6), arrowY - 10 * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(arrowX - 10 * Math.cos(angle + Math.PI / 6), arrowY - 10 * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save the context state
    ctx.save();

    // Apply zoom and center the view on the player
    ctx.scale(1 / (fov/2), 1 / fov);
    ctx.translate((canvas.width / 2) * fov - player.x, (canvas.height / 2) * fov - player.y);

    // Draw grid
    drawGrid();

    // Draw player
    ctx.fillStyle = 'blue';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
    ctx.fill();

    // Draw gun
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(mouseAngle);
    ctx.fillStyle = 'brown';
    ctx.beginPath();
    ctx.moveTo(player.size, -player.gunWidth / 2);
    ctx.lineTo(player.size + player.gunLength, -player.gunWidth / 2);
    ctx.quadraticCurveTo(player.size + player.gunLength + player.gunWidth / 2, 0, player.size + player.gunLength, player.gunWidth / 2);
    ctx.lineTo(player.size, player.gunWidth / 2);
    ctx.quadraticCurveTo(player.size - player.gunWidth / 2, 0, player.size, -player.gunWidth / 2);
    ctx.fill();
    ctx.restore();

    // Draw target
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.size, 0, Math.PI * 2);
    ctx.fill();

    // Draw bullets
    bullets.forEach(bullet => {
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
        ctx.fill();
    });

    // Restore the context state
    ctx.restore();

    // Draw arrows to target
    drawArrowToTarget();

    // Draw score and accuracy stats
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText('Score: ' + score, 10, 30);
    ctx.fillText('Overall Accuracy: ' + calculateAccuracy(totalShots, hitShots) + '%', 10, 60);
    ctx.fillText('Accuracy (Last 5): ' + calculateLastFiveAccuracy() + '%', 10, 90);
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
