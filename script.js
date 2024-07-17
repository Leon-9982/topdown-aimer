const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth; // Increased canvas size
canvas.height = window.innerHeight; // Increased canvas size

const arenaBorder = 40; // Width of the arena border
const arenaWidth = canvas.width - 2 * arenaBorder;
const arenaHeight = canvas.height - 2 * arenaBorder;

let score = 0;
let totalShots = 0;
let hitShots = 0; // Count hits instead of kills
let lastFiveShots = [];
let player = { x: canvas.width / 2, y: canvas.height / 2, size: 20, gunLength: 50, gunWidth: 10, fireDelay:  250 };
let target = { x: Math.random() * arenaWidth + arenaBorder, y: Math.random() * arenaHeight + arenaBorder, size: 20, speed: 2, direction: Math.random() * 2 * Math.PI, hp: 100 };
let bullets = [];
let keys = {};
let mouseAngle = 0;
let lastUpdateTime = Date.now();
let lastFireTime = 0;
const targetChangeInterval = 1000; //change direction every X ms 
const bulletDamage = 50;
const headshotDamage = 150;
const headshotChance = 0.1; // 10% chance of a headshot
const tracerColor = 'rgba(235, 26, 50)'; // Lighter color for bullet tracers
const tracerLength = 120; // Length of bullet tracers
const dodgeSpeed = 100; // Speed at which the target dodges bullets
const wallThickness = 20; // Thickness of the arena wall

let damageNumbers = []; // Array to store active damage numbers
const damageNumberDuration = 2000; // Duration in milliseconds for damage numbers to remain visible

document.addEventListener('keydown', (e) => keys[e.key] = true);
document.addEventListener('keyup', (e) => keys[e.key] = false);
canvas.addEventListener('mousemove', (e) => {
    mouseAngle = Math.atan2(e.clientY - player.y, e.clientX - player.x);
});
canvas.addEventListener('click', shoot);

function shoot(event) {
    const currentTime = Date.now();
    if (currentTime - lastFireTime >= player.fireDelay) {
        const bulletStartX = player.x + (player.size + player.gunLength) * Math.cos(mouseAngle);
        const bulletStartY = player.y + (player.size + player.gunLength) * Math.sin(mouseAngle);
        bullets.push({ x: bulletStartX, y: bulletStartY, angle: mouseAngle, speed: 45, tracerLength: 120 });
        totalShots++;
        lastFireTime = currentTime;
    }
}

function update() {
    const currentTime = Date.now();
    const deltaTime = currentTime - lastUpdateTime;

    // Calculate movement speed
    let moveSpeed = 5;
    if (keys['w'] && keys['a'] || keys['w'] && keys['d'] || keys['s'] && keys['a'] || keys['s'] && keys['d']) {
        moveSpeed = 5 / Math.sqrt(2); // Divide by square root of 2 for diagonal movement
    }

    // Player movement
    if (keys['w']) player.y -= moveSpeed;
    if (keys['s']) player.y += moveSpeed;
    if (keys['a']) player.x -= moveSpeed;
    if (keys['d']) player.x += moveSpeed;

    // Prevent player from going outside arena bounds
    if (player.x < arenaBorder + player.size) player.x = arenaBorder + player.size;
    if (player.x > canvas.width - arenaBorder - player.size) player.x = canvas.width - arenaBorder - player.size;
    if (player.y < arenaBorder + player.size) player.y = arenaBorder + player.size;
    if (player.y > canvas.height - arenaBorder - player.size) player.y = canvas.height - arenaBorder - player.size;

    // Bullet movement and collision detection
    bullets.forEach((bullet, bulletIndex) => {
        bullet.x += bullet.speed * Math.cos(bullet.angle);
        bullet.y += bullet.speed * Math.sin(bullet.angle);

        // Check if bullet hits the target
        const dist = Math.hypot(bullet.x - target.x, bullet.y - target.y);
        if (dist < bullet.speed + target.size) {
            // Bullet hit the target
            let damage = bulletDamage;
            let isHeadshot = Math.random() < headshotChance;
            if (isHeadshot) {
                damage = headshotDamage;
            }

            target.hp -= damage;

            // Display damage number on the target
            const damageColor = isHeadshot ? 'red' : 'darkblue';
            damageNumbers.push({ x: target.x, y: target.y, damage: damage, color: damageColor, spawnTime: currentTime });

            // Remove bullet
            bullets.splice(bulletIndex, 1);

            // Register hit shot
            hitShots++;

            // Check if target is destroyed
            if (target.hp <= 0) {
                score++;
                target = {
                    x: Math.random() * arenaWidth + arenaBorder,
                    y: Math.random() * arenaHeight + arenaBorder,
                    size: 20,
                    speed: target.speed + 0.5,
                    direction: Math.random() * 2 * Math.PI,
                    hp: 100
                };
            }

            // Register shot result
            lastFiveShots.push(true);

            // Keep only the last 5 shots in the array
            if (lastFiveShots.length > 5) {
                lastFiveShots.shift();
            }
        } else if (bullet.x < arenaBorder || bullet.x > canvas.width - arenaBorder || bullet.y < arenaBorder || bullet.y > canvas.height - arenaBorder) {
            // Remove bullet if it goes off screen
            bullets.splice(bulletIndex, 1);
            lastFiveShots.push(false);

            // Keep only the last 5 shots in the array
            if (lastFiveShots.length > 5) {
                lastFiveShots.shift();
            }
        }
    });

    // Target movement and dodging
    bullets.forEach(bullet => {
        // Calculate vector from bullet to target
        const dx = target.x - bullet.x;
        const dy = target.y - bullet.y;

        // Normalize the vector
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDX = dx / distance;
        const normalizedDY = dy / distance;

        // Calculate dot product to determine if bullet is on collision course
        const dotProduct = normalizedDX * Math.cos(target.direction) + normalizedDY * Math.sin(target.direction);

        // Adjust target direction based on bullet threat
        if (dotProduct > 0.8) { // If bullet is within cone of 36.9 degrees (cos^-1(0.8) = 36.9 degrees)
            target.direction += dodgeSpeed * deltaTime / 1000; // Adjust direction to dodge
        } else if (dotProduct < -0.8) {
            target.direction -= dodgeSpeed * deltaTime / 1000; // Adjust direction to dodge
        }
    });

    // Move the target
    target.x += target.speed * Math.cos(target.direction);
    target.y += target.speed * Math.sin(target.direction);

    // Prevent target from going outside arena bounds
    if (target.x < arenaBorder + target.size) {
        target.x = arenaBorder + target.size;
        target.direction = Math.random() * Math.PI; // Change direction if hitting left wall
    }
    if (target.x > canvas.width - arenaBorder - target.size) {
        target.x = canvas.width - arenaBorder - target.size;
        target.direction = Math.random() * Math.PI; // Change direction if hitting right wall
    }
    if (target.y < arenaBorder + target.size) {
        target.y = arenaBorder + target.size;
        target.direction = Math.random() * Math.PI; // Change direction if hitting top wall
    }
    if (target.y > canvas.height - arenaBorder - target.size) {
        target.y = canvas.height - arenaBorder - target.size;
        target.direction = Math.random() * Math.PI; // Change direction if hitting bottom wall
    }

    // Remove old damage numbers
    damageNumbers = damageNumbers.filter(damageNum => currentTime - damageNum.spawnTime < damageNumberDuration); // Remove numbers after their duration
}

function calculateAccuracy(shots, hits) {
    return shots > 0 ? ((hits / shots) * 100).toFixed(2) : 0.00;
}

function calculateLastFiveAccuracy() {
    const hits = lastFiveShots.filter(shot => shot).length;
    return calculateAccuracy(lastFiveShots.length, hits);
}

function draw(currentTime) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw arena border
    ctx.strokeStyle = 'black';
    ctx.lineWidth = arenaBorder;
    ctx.strokeRect(arenaBorder / 2, arenaBorder / 2, canvas.width - arenaBorder, canvas.height - arenaBorder);

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

    // Draw arrow pointing to target
    ctx.save();
    ctx.translate(player.x, player.y);
    const angleToTarget = Math.atan2(target.y - player.y, target.x - player.x);
    ctx.rotate(angleToTarget);
    ctx.strokeStyle = 'white';
    ctx.fillStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(player.size + 10, 0);
    ctx.lineTo(player.size + 30, 0);
    ctx.lineTo(player.size + 25, -5);
    ctx.moveTo(player.size + 30, 0);
    ctx.lineTo(player.size + 25, 5);
    ctx.stroke();
    ctx.restore();

    // Draw bullets and tracers
    bullets.forEach(bullet => {
        // Draw tracer
        ctx.strokeStyle = tracerColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bullet.x - bullet.tracerLength * Math.cos(bullet.angle), bullet.y - bullet.tracerLength * Math.sin(bullet.angle));
        ctx.lineTo(bullet.x, bullet.y);
        ctx.stroke();

        // Draw bullet
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw damage numbers
    damageNumbers.forEach(damageNum => {
        const opacity = 1 - (currentTime - damageNum.spawnTime) / damageNumberDuration;
        ctx.fillStyle = `rgba(${damageNum.color === 'red' ? 255 : 0}, 0, ${damageNum.color === 'red' ? 0 : 255}, ${opacity})`;
        ctx.font = '20px Arial';
        ctx.fillText('-' + damageNum.damage, damageNum.x, damageNum.y);
    });

    // Draw score and accuracy stats
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText('Score: ' + score, 10, 30);
    ctx.fillText('Overall Accuracy: ' + calculateAccuracy(totalShots, hitShots) + '%', 10, 60);
    ctx.fillText('Accuracy (Last 5): ' + calculateLastFiveAccuracy() + '%', 10, 90);
}

function gameLoop() {
    const currentTime = Date.now();
    update();
    draw(currentTime);
    requestAnimationFrame(gameLoop);
}

gameLoop();
