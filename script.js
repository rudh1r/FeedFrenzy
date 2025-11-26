// --- OPTIMIZATION & CONFIG ---
const layoutCanvas = document.createElement('canvas');
const layoutCtx = layoutCanvas.getContext('2d');
const cachedCharImages = {};
const cachedZombieImages = [];

// --- ASSETS ---
const CHARACTERS = [
    { id: 'rudhir', name: 'Rudhir', src: 'n78B0dmC_400x400.jpg', special: "SYSTEM OVERRIDE: Freeze Enemies", abilityId: 'freeze' },
    { id: 'adi', name: 'Adi', src: 'KZfPdhrB_400x400.jpg', special: "GLITCH STORM: Teleport Enemies", abilityId: 'glitch' },
    { id: 'prati', name: 'Prati', src: 'VsvsdypI_400x400.jpg', special: "VIBE CHECK: Knockback Wave", abilityId: 'push' },
    { id: 'pulkit', name: 'Pulkit', src: '9wDoXvj9_400x400.jpg', special: "NEED FOR SPEED: Invincibility Run", abilityId: 'speed' },
    { id: 'bhorti', name: 'Bhorti', src: 'G5_D7DsbkAADVvy.png', special: "COURT ORDER: Shield Wall", abilityId: 'shield' },
    { id: 'sid', name: 'Sid', src: 'dPlJ0HtN_400x400.jpg', special: "CAFFEINE RUSH: Infinite Fire Rate", abilityId: 'rapid' }
];

const ZOMBIE_URLS = [
    "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png",
];

const WEAPONS = [
    { id: 'pistol', name: 'Hot Take', price: 0, damage: 25, rate: 400, color: '#00f2ea', spread: 0.05, speed: 1.5, life: 1000 },
    { id: 'uzi', name: 'The Ratio', price: 500, damage: 12, rate: 90, color: '#ff0050', spread: 0.25, speed: 1.6, life: 900 },
    { id: 'shotgun', name: 'Ban Hammer', price: 1500, damage: 18, rate: 800, count: 6, color: '#ffff00', spread: 0.4, speed: 1.4, life: 600 },
    { id: 'sniper', name: 'Cancel Ray', price: 3000, damage: 150, rate: 1100, color: '#bd00ff', spread: 0, speed: 2.5, life: 1500 },
    { id: 'flame', name: 'Hot Tea', price: 5000, damage: 8, rate: 50, color: '#ff8800', spread: 0.3, speed: 0.8, life: 400, size: 6 },
    { id: 'minigun', name: 'Spam Bot', price: 8000, damage: 10, rate: 40, color: '#00ffaa', spread: 0.4, speed: 1.5, life: 1000 },
    { id: 'rocket', name: 'The Nuke', price: 12000, damage: 200, rate: 1500, color: '#ffffff', spread: 0.1, speed: 0.7, life: 2000, size: 10, aoeRadius: 150, explosionSound: 'rocket_explosion' },
    { id: 'laser', name: 'Doxx Laser', price: 20000, damage: 180, color: '#00ff00', type: 'beam', range: 800, sound: 'laser_beam' }, // Damage is now DPS
    { id: 'golden', name: 'Verified Badge', price: 50000, damage: 300, rate: 600, color: '#ffd700', spread: 0, speed: 2.0, life: 1500, size: 6 }
];

// Using FontAwesome Unicode strings for canvas rendering
const BOOSTS = [
    { id: 'rapid', name: 'RAPID FIRE', color: '#ffff00', duration: 5000, icon: '\uf0e7' }, // Bolt
    { id: 'health', name: 'MEDKIT', color: '#00ff00', duration: 0, icon: '\uf004', value: 30 }, // Heart
    { id: 'speed', name: 'VELOCITY', color: '#00ffff', duration: 5000, icon: '\uf72e' } // Wind
];

const DEFAULT_TWEETS = [ "System Override.", "Protocol 909 initiated.", "User disconnected.", "Lag detected.", "Touching grass...", "Simulated reality.", "Error 404: Skill not found.", "Buff pls.", "Who asked?" ];

// --- AUDIO ---
const SOUNDS = {
    shoot: { src: 'sounds/shoot.wav', poolSize: 5, volume: 0.2 },
    explosion: { src: 'sounds/explosion.wav', poolSize: 8, volume: 0.3 },
    hurt: { src: 'sounds/hurt.wav', poolSize: 3, volume: 0.4 },
    special: { src: 'sounds/special.wav', poolSize: 2, volume: 0.6 },
    rocket_explosion: { src: 'sounds/rocket_explosion.wav', poolSize: 3, volume: 0.7 },
    laser_beam: { src: 'sounds/laser_beam.wav', poolSize: 1, volume: 0.3, loop: true }
};
const audioPool = {};

// --- STATE ---
let currency = parseInt(localStorage.getItem('fs_currency')) || 0;
let unlockedWeapons = JSON.parse(localStorage.getItem('fs_weapons')) || ['pistol'];
let selectedCharIdx = parseInt(localStorage.getItem('fs_char')) || 0;
let selectedWeaponId = localStorage.getItem('fs_loadout') || 'pistol';

let currentTrend = "DefaultFeed";
let activeTweets = [...DEFAULT_TWEETS];

let canvas, ctx;
let gameState = 'MENU';
let lastTime = 0;

let player = {};
let enemies = [];
let bullets = [];
let particles = [];
let feedItems = [];
let boosts = [];
let floatingTexts = [];
let camera = { x: 0, y: 0 };
let score = 0;
let kills = 0;
let difficultyTimer = 0;
let screenShake = 0;
let laserHitPoint = null;
let currentThreatLevel = 0;

const keys = {};
const mouse = { x: 0, y: 0, down: false };
let joystick = { active: false, x: 0, y: 0, originX: 0, originY: 0, dx: 0, dy: 0 };
let isMobileShooting = false;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    // Keyboard and Mouse Listeners
    window.addEventListener('keydown', e => {
        keys[e.code] = true;
        if(e.code === 'KeyE' && gameState === 'PLAYING' && player.ultCharge >= 100) activateSpecial();
        if(e.code === 'Escape' && (gameState === 'PLAYING' || gameState === 'PAUSED')) togglePause();
    });
    window.addEventListener('keyup', e => keys[e.code] = false);
    window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });

    // UI Button Listeners
    document.querySelector('#main-menu .btn-primary').onclick = startGame;
    document.querySelector('#main-menu button:nth-of-type(2)').onclick = openStore;
    document.querySelector('#main-menu button:nth-of-type(3)').onclick = openCharSelect;
    document.querySelector('#main-menu button:nth-of-type(4)').onclick = openTrendGen;
    document.querySelector('#trend-menu .btn-magic').onclick = generateTrend;
    document.querySelector('#trend-menu .btn:last-of-type').onclick = closeOverlay;
    document.querySelector('#char-select .btn').onclick = closeOverlay;
    document.querySelector('#gun-store .btn').onclick = closeOverlay;
    document.querySelector('#pause-menu .btn-primary').onclick = togglePause;
    document.querySelector('#pause-menu .btn:last-of-type').onclick = returnToMenu;
    document.querySelector('#game-over .btn').onclick = returnToMenu;
    document.querySelector('.pause-btn').onclick = togglePause;

    setupMobileControls();
    updateUI();
    initAudio();
    Promise.all([preloadImages(), document.fonts.load('10pt "Font Awesome 6 Free"')]).then(() => {
        cacheTwitterLayout(); // Cache layout after font is ready
        requestAnimationFrame(loop); // Start game loop
    });
});

function preloadImages() {
    // Player Images
    CHARACTERS.forEach((c, i) => {
        const img = new Image();
        img.src = c.src;
        img.onload = () => {
            // Create pre-clipped circular version
            const cvs = document.createElement('canvas');
            cvs.width = 80; cvs.height = 80;
            const x = cvs.getContext('2d');
            x.beginPath(); x.arc(40, 40, 40, 0, Math.PI*2); x.closePath(); x.clip();
            x.drawImage(img, 0, 0, 80, 80);
            cachedCharImages[c.id] = cvs;
            // Store raw for menu
            c.img = img;
        };
    });

    const imagePromises = CHARACTERS.map(c => new Promise(resolve => {
        const img = new Image();
        img.src = c.src;
        img.onload = () => {
            const cvs = document.createElement('canvas');
            cvs.width = 80; cvs.height = 80;
            const x = cvs.getContext('2d');
            x.beginPath(); x.arc(40, 40, 40, 0, Math.PI*2); x.closePath(); x.clip();
            x.drawImage(img, 0, 0, 80, 80);
            cachedCharImages[c.id] = cvs;
            c.img = img; // Store raw for menu
            resolve();
        };
        img.onerror = resolve; // Don't block loading if an image fails
    }));

    // You can add promises for ZOMBIE_URLS and other assets here if needed
    return Promise.all(imagePromises);
}

function initAudio() {
    for (const key in SOUNDS) {
        audioPool[key] = {
            pool: [],
            currentIndex: 0,
            ...SOUNDS[key]
        };
        for (let i = 0; i < SOUNDS[key].poolSize; i++) {
            const audio = new Audio(SOUNDS[key].src);
            audio.volume = SOUNDS[key].volume;
            if (SOUNDS[key].loop) audio.loop = true;
            audioPool[key].pool.push(audio);
        }
    }
}

function playSound(key) {
    if (!audioPool[key]) return;
    if (audioPool[key].loop) { // Don't play looping sounds with this function
        playLoopingSound(key);
        return;
    }
    const audioData = audioPool[key];
    const audio = audioData.pool[audioData.currentIndex];
    audio.currentTime = 0;
    audio.play().catch(e => {}); // Ignore errors on first interaction
    audioData.currentIndex = (audioData.currentIndex + 1) % audioData.poolSize;
}

function playLoopingSound(key) {
    if (!audioPool[key] || !audioPool[key].loop) return;
    const audio = audioPool[key].pool[0];
    if (audio.paused) audio.play().catch(e => {});
}

function stopLoopingSound(key) {
    if (!audioPool[key] || !audioPool[key].loop) return;
    const audio = audioPool[key].pool[0];
    if (!audio.paused) audio.pause();
}

function setupMobileControls() {
    const base = document.getElementById('joystick-base');
    const knob = document.getElementById('joystick-knob');
    const shootBtn = document.getElementById('shoot-btn');
    const ultBtn = document.getElementById('ult-btn');

    const handleJoystickStart = (x, y) => {
        joystick.active = true; joystick.originX = x; joystick.originY = y;
        joystick.x = x; joystick.y = y;
    };

    const handleJoystickMove = (x, y) => {
        if (!joystick.active) return;
        let dx = x - joystick.originX; let dy = y - joystick.originY;
        const dist = Math.sqrt(dx*dx + dy*dy); const max = 60;
        if (dist > max) { dx = (dx / dist) * max; dy = (dy / dist) * max; }
        joystick.dx = dx / max; joystick.dy = dy / max;
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    };

    const handleJoystickEnd = () => {
        joystick.active = false; joystick.dx = 0; joystick.dy = 0;
        knob.style.transform = `translate(-50%, -50%)`;
    };

    base.addEventListener('touchstart', e => { e.preventDefault(); handleJoystickStart(e.changedTouches[0].clientX, e.changedTouches[0].clientY); }, {passive: false});
    window.addEventListener('touchmove', e => { if(joystick.active) handleJoystickMove(e.changedTouches[0].clientX, e.changedTouches[0].clientY); }, {passive: false});
    window.addEventListener('touchend', e => { if(joystick.active) handleJoystickEnd(); });

    base.addEventListener('mousedown', e => { e.preventDefault(); handleJoystickStart(e.clientX, e.clientY); });
    window.addEventListener('mousemove', e => { if(joystick.active) handleJoystickMove(e.clientX, e.clientY); });
    window.addEventListener('mouseup', e => { if(joystick.active) handleJoystickEnd(); });

    const startShoot = (e) => { if(e.cancelable) e.preventDefault(); isMobileShooting = true; shootBtn.style.transform = "scale(0.9)"; shootBtn.style.background = "rgba(255, 0, 80, 0.8)"; };
    const endShoot = (e) => { if(e.cancelable) e.preventDefault(); isMobileShooting = false; shootBtn.style.transform = "scale(1)"; shootBtn.style.background = "rgba(255, 0, 80, 0.3)"; };

    shootBtn.addEventListener('touchstart', startShoot, {passive: false});
    shootBtn.addEventListener('touchend', endShoot);
    shootBtn.addEventListener('touchcancel', endShoot);
    shootBtn.addEventListener('mousedown', startShoot);
    shootBtn.addEventListener('mouseup', endShoot);
    shootBtn.addEventListener('mouseleave', endShoot);

    const triggerUlt = (e) => { if(e.cancelable) e.preventDefault(); if(player.ultCharge >= 100) activateSpecial(); };
    ultBtn.addEventListener('touchstart', triggerUlt, {passive: false});
    ultBtn.addEventListener('mousedown', triggerUlt);
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    cacheTwitterLayout();
}

function cacheTwitterLayout() {
    layoutCanvas.width = canvas.width;
    layoutCanvas.height = canvas.height;
    drawTwitterLayout(layoutCtx, canvas.width, canvas.height);
}

// --- GAME LOOP ---
function loop(timestamp) {
    const dt = Math.min(timestamp - lastTime, 100); // Cap dt at 100ms
    lastTime = timestamp;

    if (gameState === 'PLAYING') {
        update(dt);
        render();
    } else if (gameState === 'PAUSED') {
        render();
    } else if (gameState === 'MENU') {
        renderMenuBackground();
    }

    requestAnimationFrame(loop);
}

function startGame() {
    const char = CHARACTERS[selectedCharIdx];
    player = {
        x: 0, y: 0, hp: 100, maxHp: 100, speed: 0.35, lastShot: 0,
        weapon: WEAPONS.find(w => w.id === selectedWeaponId),
        activeEffects: {},
        ultCharge: 0,
        isLaserActive: false,
        ability: char.abilityId, 
        shieldHp: 0
    };
    enemies = []; bullets = []; particles = []; boosts = []; floatingTexts = [];
    score = 0; kills = 0; difficultyTimer = 0; screenShake = 0;
    currentThreatLevel = 1; camera.x = 0; camera.y = 0;

    feedItems = []; for(let i=0; i<10; i++) spawnFeedItem(true);

    gameState = 'PLAYING';
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('pause-menu').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('hp-bar').style.width = '100%';
    document.getElementById('ult-bar').style.width = '0%';
    document.getElementById('ult-btn').style.display = 'none';
    document.getElementById('pc-ult-hint').style.display = 'none';
    document.getElementById('game-likes').innerText = '0';
    document.getElementById('boost-container').innerHTML = '';
    document.getElementById('current-trend-hud').innerText = "#" + currentTrend.replace(/\s/g, '');

    showToast("THREAT LEVEL 1: SURVIVE");
}

function togglePause() {
    if (gameState === 'PLAYING') {
        gameState = 'PAUSED';
        document.getElementById('pause-menu').classList.remove('hidden');
    } else if (gameState === 'PAUSED') {
        gameState = 'PLAYING';
        document.getElementById('pause-menu').classList.add('hidden');
        lastTime = performance.now();
    }
}

// --- LOGIC ---
function activateSpecial() {
    player.ultCharge = 0;
    updateHUD();
    addFloatingText(player.x, player.y, "SPECIAL ACTIVATED!", '#bd00ff');
    screenShake = 20;
    playSound('special');

    const ability = player.ability;
    if (ability === 'freeze') { player.activeEffects['freeze'] = Date.now() + 5000; enemies.forEach(e => e.frozen = true); }
    else if (ability === 'push') {
        enemies.forEach(e => {
            const angle = Math.atan2(e.y - player.y, e.x - player.x);
            e.x += Math.cos(angle) * 300; e.y += Math.sin(angle) * 300; e.hp -= 20;
        });
        createParticles(player.x, player.y, '#bd00ff', 50);
    }
    else if (ability === 'speed') { player.activeEffects['invincible'] = Date.now() + 3000; player.activeEffects['speed'] = Date.now() + 3000; }
    else if (ability === 'rapid') { player.activeEffects['rapid'] = Date.now() + 5000; }
    else if (ability === 'shield') { player.shieldHp = 100; player.activeEffects['shieldVisual'] = Date.now() + 5000; }
    else if (ability === 'glitch') {
        enemies.forEach(e => {
            e.x += (Math.random() - 0.5) * 400; e.y += (Math.random() - 0.5) * 400; e.hp -= 50;
            createParticles(e.x, e.y, '#00ff00', 10);
        });
    }
}

function update(dt) {
    difficultyTimer += dt;
    if (screenShake > 0) screenShake *= 0.9;

    if (player.ultCharge < 100) {
        player.ultCharge += dt * 0.005;
        if (player.ultCharge > 100) player.ultCharge = 100;
        updateHUD();
    }

    const effects = player.activeEffects;
    let currentSpeed = player.speed;
    if (effects.speed && effects.speed > Date.now()) currentSpeed *= 2;
    updateBoostUI();

    // Milestone Difficulty
    let newThreatLevel = 1;
    let spawnRate = 1400;
    if (kills >= 100) { newThreatLevel = 5; spawnRate = 350; }
    else if (kills >= 50) { newThreatLevel = 4; spawnRate = 600; }
    else if (kills >= 25) { newThreatLevel = 3; spawnRate = 900; }
    else if (kills >= 10) { newThreatLevel = 2; spawnRate = 1100; }

    if (newThreatLevel > currentThreatLevel) {
        currentThreatLevel = newThreatLevel;
        let msg = "";
        if (newThreatLevel === 2) msg = "⚠️ THREAT RISING: ENEMY WAVE INCOMING";
        if (newThreatLevel === 3) msg = "⚠️ ALERT: FAST MOVERS DETECTED";
        if (newThreatLevel === 4) msg = "⚠️ WARNING: HEAVY UNITS APPROACHING";
        if (newThreatLevel === 5) msg = "💀 CRITICAL ERROR: RUN FOR YOUR LIFE";
        showToast(msg);
        screenShake = 5;
    }

    if (Math.random() * spawnRate < dt) spawnEnemy();
    if (Math.random() < 0.015) spawnFeedItem();

    let dx = 0, dy = 0;
    if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) dx += 1;
    if (joystick.active) { dx = joystick.dx; dy = joystick.dy; }

    if (dx !== 0 || dy !== 0) {
        if (!joystick.active) { const len = Math.sqrt(dx*dx + dy*dy); dx /= len; dy /= len; }
        player.x += dx * currentSpeed * dt;
        player.y += dy * currentSpeed * dt;
    }

    camera.x += (player.x - canvas.width/2 - camera.x) * 0.1;
    camera.y += (player.y - canvas.height/2 - camera.y) * 0.1;

    let fireRate = player.weapon.rate;
    if (effects.rapid && effects.rapid > Date.now()) fireRate /= 3;

    // Handle shooting
    const isShooting = keys['Space'] || isMobileShooting;
    if (player.weapon.type === 'beam') {
        player.isLaserActive = isShooting;
        if (player.isLaserActive) playLoopingSound(player.weapon.sound);
        else stopLoopingSound(player.weapon.sound);
    } else {
        if (player.isLaserActive) stopLoopingSound('laser_beam'); // Stop laser if weapon switched
        player.isLaserActive = false;
        if (isShooting && Date.now() - player.lastShot > fireRate) shoot();
    }

    updateEntities(dt);
    laserHitPoint = null; // Reset laser hit point each frame
}

function injectCommentary(triggerType) {
    let text = "";
    if (triggerType === 'killstreak') text = `🔥 KILLSTREAK: ${CHARACTERS[selectedCharIdx].name} is popping off!`;
    else if (triggerType === 'lowhp') text = `⚠️ CRITICAL: Player HP critical!`;
    else if (triggerType === 'tank') text = `🛡️ TANK DOWN: Heavy unit neutralized!`;

    if (text) {
        feedItems.push({
            x: (Math.random() * canvas.width * 2) - canvas.width + player.x,
            y: player.y + canvas.height,
            w: 350, h: 140, text: text,
            color: '#1a1a2e',
            highlight: true
        });
    }
}

function updateEntities(dt) {
    bullets.forEach((b, i) => {
        b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.life <= 0) {
            // If a rocket expires, it explodes
            if (b.weaponId === 'rocket') {
                const weapon = WEAPONS.find(w => w.id === 'rocket');
                createExplosion(b.x, b.y, weapon.aoeRadius, weapon.damage, weapon.explosionSound);
            }
            bullets.splice(i, 1);
        }
    });

    boosts.forEach((boost, i) => {
        if (Math.hypot(player.x - boost.x, player.y - boost.y) < 40) { applyBoost(boost); boosts.splice(i, 1); }
    });

    const frozen = player.activeEffects['freeze'] > Date.now();

    enemies.forEach((e, i) => {
        if (!frozen) {
            const angle = Math.atan2(player.y - e.y, player.x - e.x);
            e.x += Math.cos(angle) * e.speed * dt;
            e.y += Math.sin(angle) * e.speed * dt;
        }

        // --- LASER DAMAGE LOGIC ---
        if (player.isLaserActive) {
            const laser = player.weapon;
            const aimAngle = getAimAngle();
            const dx = e.x - player.x;
            const dy = e.y - player.y;
            const distToEnemy = Math.sqrt(dx*dx + dy*dy);

            if (distToEnemy < laser.range + e.radius) {
                const angleToEnemy = Math.atan2(dy, dx);
                let angleDiff = Math.abs(aimAngle - angleToEnemy);
                if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

                const hitThreshold = Math.atan((e.radius * 1.5) / distToEnemy); // Make it easier to hit

                if (angleDiff < hitThreshold) {
                    const damage = laser.damage * (dt / 1000); // Damage per second
                    e.hp -= damage;
                    addFloatingText(e.x, e.y, Math.ceil(damage), laser.color);
                    
                    // Set laser hit point for rendering
                    if (!laserHitPoint || distToEnemy < Math.hypot(laserHitPoint.x - player.x, laserHitPoint.y - player.y)) {
                        laserHitPoint = { x: e.x, y: e.y };
                    }
                    createParticles(e.x, e.y, laser.color, 1, 0.2);

                    if (e.hp <= 0) {
                        score += e.scoreValue;
                        playSound('explosion');
                        kills++;
                        if(kills % 20 === 0) injectCommentary('killstreak');
                        if(e.type === 'tank') injectCommentary('tank');

                        player.ultCharge = Math.min(100, player.ultCharge + 5);
                        createParticles(e.x, e.y, '#fff', 8);
                        if (Math.random() < 0.05) spawnBoost(e.x, e.y);
                        enemies.splice(i, 1);
                        updateHUD();
                    }
                }
            }
        }

        const dist = Math.hypot(player.x - e.x, player.y - e.y);
        const hitDist = e.radius + 30;
        if (dist < hitDist) {
            if (player.activeEffects['invincible'] > Date.now()) { e.hp = 0; }
            else if (player.shieldHp > 0) {
                player.shieldHp -= 20;
                createParticles(player.x, player.y, '#bd00ff', 5);
                if(player.shieldHp <= 0) delete player.activeEffects['shieldVisual'];
                e.x -= Math.cos(Math.atan2(player.y - e.y, player.x - e.x)) * 50;
            } else {
                playSound('hurt');
                player.hp -= (e.damage || 10);
                screenShake = 10;
                createParticles(player.x, player.y, '#f4212e', 5);
                addFloatingText(player.x, player.y, `-${e.damage}`, '#ff0000');
                if (player.hp <= 30 && Math.random() < 0.1) injectCommentary('lowhp');
                if (player.hp <= 0) gameOver();
            }

            if (player.activeEffects['invincible'] > Date.now()) {
                 score += e.scoreValue; kills++; enemies.splice(i, 1); updateHUD();
            } else {
                enemies.splice(i, 1); updateHUD();
            }
        }

        bullets.forEach((b, bi) => {
            if (Math.hypot(b.x - e.x, b.y - e.y) < e.radius + (b.size || 10)) {
                // If it's a rocket, trigger an explosion
                if (b.weaponId === 'rocket') {
                    const weapon = WEAPONS.find(w => w.id === 'rocket');
                    createExplosion(b.x, b.y, weapon.aoeRadius, weapon.damage, weapon.explosionSound);
                } else {
                    // Standard bullet collision
                    e.hp -= b.damage;
                    createParticles(b.x, b.y, b.color, 2);
                    addFloatingText(e.x, e.y, Math.floor(b.damage), '#fff');

                    if (e.hp <= 0) {
                        score += e.scoreValue;
                        playSound('explosion');
                        kills++;
                        if(kills % 20 === 0) injectCommentary('killstreak');
                        if(e.type === 'tank') injectCommentary('tank');

                        player.ultCharge = Math.min(100, player.ultCharge + 5);
                        createParticles(e.x, e.y, '#fff', 8);
                        if (Math.random() < 0.05) spawnBoost(e.x, e.y);
                        enemies.splice(i, 1);
                        updateHUD();
                    }
                }
                // Remove the bullet that caused the collision
                bullets.splice(bi, 1);
            }
        });
    });

    if(particles.length > 100) particles.splice(0, particles.length - 100); // Hard limit
    floatingTexts.forEach((t, i) => { t.y -= 0.05 * dt; t.life -= dt; if (t.life <= 0) floatingTexts.splice(i, 1); });
    particles.forEach((p, i) => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(i, 1); });
    feedItems.forEach((f, i) => { f.y -= 0.05 * dt; if (f.y < camera.y - 200) feedItems.splice(i, 1); });
}

function createExplosion(x, y, radius, damage, soundKey, color = '#ff8800') {
    playSound(soundKey || 'explosion');
    createParticles(x, y, '#ff8800', 70, 1.8); // Big, fast particles
    screenShake = 25;

    // Use a reverse loop to safely remove enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        const dist = Math.hypot(x - e.x, y - e.y);

        if (dist < radius + e.radius) {
            const damageFalloff = 1 - (dist / radius);
            const appliedDamage = Math.floor(damage * damageFalloff);
            e.hp -= appliedDamage;
            addFloatingText(e.x, e.y, appliedDamage, '#ff8800');

            if (e.hp <= 0) {
                score += e.scoreValue;
                kills++;
                player.ultCharge = Math.min(100, player.ultCharge + 5);
                createParticles(e.x, e.y, '#fff', 8);
                if (Math.random() < 0.05) spawnBoost(e.x, e.y);
                enemies.splice(i, 1);
                updateHUD();
            }
        }
    }
}

function spawnBoost(x, y) {
    const type = BOOSTS[Math.floor(Math.random() * BOOSTS.length)];
    boosts.push({ x: x, y: y, ...type, bobOffset: Math.random() * 100 });
}

function applyBoost(boost) {
    if (boost.id === 'health') {
        player.hp = Math.min(player.maxHp, player.hp + boost.value);
        updateHUD();
        addFloatingText(player.x, player.y, "+30 HP", '#00ff00');
    } else {
        player.activeEffects[boost.id] = Date.now() + boost.duration;
        addFloatingText(player.x, player.y, boost.name + "!", boost.color);
    }
}

function updateBoostUI() {
    const container = document.getElementById('boost-container');
    container.innerHTML = '';
    const now = Date.now();
    for (const [id, expireTime] of Object.entries(player.activeEffects)) {
        if (expireTime > now) {
            const boost = BOOSTS.find(b => b.id === id);
            if(boost) {
                const el = document.createElement('div'); el.className = 'boost-icon';
                el.style.borderColor = boost.color;
                // FontAwesome Unicode handling
                el.style.fontFamily = '"Font Awesome 6 Free"';
                el.style.fontWeight = '900';
                el.innerHTML = boost.icon; // Use innerHTML for unicode entity
                container.appendChild(el);
            }
        } else if (id !== 'shieldVisual') {
            delete player.activeEffects[id];
        }
    }
}

function addFloatingText(x, y, text, color, size = 20) { floatingTexts.push({ x, y, text, color, life: 800, size: size }); }

function getAimAngle() {
    let nearest = null; let minDist = Infinity;
    enemies.forEach(e => {
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        if (d < minDist) { minDist = d; nearest = e; }
    });
    if (nearest && minDist < 700) return Math.atan2(nearest.y - player.y, nearest.x - player.x);
    if (joystick.active) return Math.atan2(joystick.dy, joystick.dx);
    else { const worldMouseX = mouse.x + camera.x; const worldMouseY = mouse.y + camera.y; return Math.atan2(worldMouseY - player.y, worldMouseX - player.x); }
}

function shoot() {
    if (player.weapon.type === 'beam') return; // Beam weapons handled in update loop
    playSound('shoot');
    player.lastShot = Date.now();
    const angle = getAimAngle();
    const count = player.weapon.count || 1;
    screenShake = 2;
    const speed = player.weapon.speed || 1.5;
    const life = player.weapon.life || 1000;
    const size = player.weapon.size || 4;

    for(let i=0; i<count; i++) {
        const spread = (Math.random() - 0.5) * player.weapon.spread;
        bullets.push({
            x: player.x, y: player.y,
            vx: Math.cos(angle + spread) * speed, vy: Math.sin(angle + spread) * speed,
            damage: player.weapon.damage, life: life, color: player.weapon.color, size: size,
            weaponId: player.weapon.id // Tag bullet with weapon ID
        });
    }
}

function spawnEnemy() {
    const angle = Math.random() * Math.PI * 2; const dist = canvas.width/2 + 100;
    let speedMult = 1; let hpMult = 1;
    if (currentThreatLevel >= 5) { speedMult = 2.2; hpMult = 2.5; }
    else if (currentThreatLevel >= 4) { speedMult = 1.6; hpMult = 1.8; }
    else if (currentThreatLevel >= 3) { speedMult = 1.3; hpMult = 1.4; }
    else if (currentThreatLevel >= 2) { speedMult = 1.1; hpMult = 1.1; }

    let zImg = null;
    if (cachedZombieImages.length > 0) {
        zImg = cachedZombieImages[Math.floor(Math.random() * cachedZombieImages.length)];
    }

    let enemy = {
        x: player.x + Math.cos(angle) * dist, y: player.y + Math.sin(angle) * dist,
        hp: 50 * hpMult, speed: (0.1 + (Math.random() * 0.05)) * speedMult,
        color: '#657786', radius: 20, damage: 10, scoreValue: 10,
        cachedImg: zImg
    };

    const rand = Math.random();
    if (currentThreatLevel >= 4 && rand < 0.2) { enemy.type = 'tank'; enemy.color = '#8e44ad'; enemy.radius = 40; enemy.hp *= 3.5; enemy.speed *= 0.6; enemy.damage = 30; enemy.scoreValue = 50; }
    else if (currentThreatLevel >= 3 && rand < 0.35) { enemy.type = 'rusher'; enemy.color = '#e0245e'; enemy.radius = 15; enemy.hp *= 0.7; enemy.speed *= 1.6; enemy.damage = 5; enemy.scoreValue = 20; }
    enemies.push(enemy);
}

function spawnFeedItem(initial = false, textOverride = null, highlight = false) {
    const x = (Math.random() * canvas.width * 2) - canvas.width + player.x;
    const y = initial ? (Math.random() * canvas.height * 2) - canvas.height : player.y + canvas.height;
    const text = textOverride || activeTweets[Math.floor(Math.random() * activeTweets.length)];
    feedItems.push({ x: x, y: y, w: 350, h: 140, text: text, color: highlight ? 'rgba(0, 26, 51, 0.9)' : (Math.random() < 0.1 ? 'rgba(26, 26, 46, 0.9)' : 'rgba(0, 0, 0, 0.8)'), highlight: highlight });
}

function createParticles(x, y, color, count, speedMultiplier = 0.5) {
    for(let i=0; i<count; i++) {
        const speed = (Math.random() - 0.5) * speedMultiplier;
        particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * speed, vy: (Math.random() - 0.5) * speed, life: 500, color: color, size: Math.random() * 4 + 2 });
    }
}

// --- RENDER ---
function render() {
    // 1. Draw Webpage Background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Pre-Rendered UI Layout
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.drawImage(layoutCanvas, 0, 0);
    ctx.restore();

    let shakeX = (Math.random() - 0.5) * screenShake;
    let shakeY = (Math.random() - 0.5) * screenShake;
    ctx.save();
    ctx.translate(-camera.x + shakeX, -camera.y + shakeY);

    // Feed Items
    feedItems.forEach(f => {
        ctx.fillStyle = f.color; ctx.strokeStyle = f.highlight ? '#00f2ea' : '#2f3336'; ctx.lineWidth = f.highlight ? 2 : 1;
        ctx.beginPath(); ctx.rect(f.x, f.y, f.w, f.h); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#2f3336'; ctx.beginPath(); ctx.arc(f.x + 30, f.y + 30, 20, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#e7e9ea'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'left'; ctx.fillText("User", f.x + 60, f.y + 20);
        ctx.fillStyle = '#71767b'; ctx.font = '14px Arial'; ctx.fillText("@username · 1h", f.x + 100, f.y + 20);
        ctx.fillStyle = '#e7e9ea'; ctx.font = '14px Arial'; ctx.fillText(f.text, f.x + 60, f.y + 45);
        ctx.fillStyle = '#71767b'; ctx.font = '12px Arial'; ctx.fillText("💬  24    Top    ⚡  12    ❤️  562    📊  21K", f.x + 60, f.y + f.h - 15);
    });

    particles.forEach(p => { ctx.fillStyle = p.color; ctx.globalAlpha = p.life / 500; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1; });

    const time = Date.now() / 200;
    boosts.forEach(b => {
        ctx.shadowBlur = 20; ctx.shadowColor = b.color; ctx.fillStyle = b.color;
        const floatY = Math.sin(time + b.bobOffset) * 5;
        ctx.beginPath(); ctx.arc(b.x, b.y + floatY, 15, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = '900 14px "Font Awesome 6 Free"';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.icon, b.x, b.y + floatY); ctx.shadowBlur = 0;
    });

    enemies.forEach(e => {
        if (e.cachedImg) {
            ctx.save();
            ctx.drawImage(e.cachedImg, e.x - 20, e.y - 20, 40, 40); // Use cached canvas
            if (e.frozen) { ctx.fillStyle = 'rgba(0, 255, 255, 0.5)'; ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI*2); ctx.fill(); }
            ctx.restore();
            ctx.strokeStyle = e.frozen ? '#00ffff' : e.color; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI*2); ctx.stroke();
        } else {
            ctx.fillStyle = e.frozen ? '#00ffff' : e.color; ctx.shadowBlur = 10; ctx.shadowColor = e.color;
            ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
            ctx.fillStyle = '#00ff00';
            const eyeOffset = e.radius * 0.35;
            ctx.beginPath(); ctx.arc(e.x - eyeOffset, e.y - 5, 3, 0, Math.PI*2); ctx.arc(e.x + eyeOffset, e.y - 5, 3, 0, Math.PI*2); ctx.fill();
        }
    });

    bullets.forEach(b => {
        ctx.fillStyle = b.color; ctx.shadowBlur = 15; ctx.shadowColor = b.color;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.size || 4, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
    });

    // Laser Beam
    if (player.isLaserActive) {
        const laser = player.weapon;
        const angle = getAimAngle();
        const endX = player.x + Math.cos(angle) * laser.range;
        const endY = player.y + Math.sin(angle) * laser.range;

        const finalTarget = laserHitPoint || { x: endX, y: endY };

        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = laser.color;
        ctx.shadowColor = laser.color;
        ctx.shadowBlur = 20;
        ctx.lineWidth = 8; ctx.globalAlpha = 0.2; ctx.beginPath(); ctx.moveTo(player.x, player.y); ctx.lineTo(finalTarget.x, finalTarget.y); ctx.stroke();
        ctx.lineWidth = 3; ctx.globalAlpha = 1.0; ctx.beginPath(); ctx.moveTo(player.x, player.y); ctx.lineTo(finalTarget.x, finalTarget.y); ctx.stroke();
        ctx.restore();
        if(laserHitPoint) createParticles(laserHitPoint.x, laserHitPoint.y, laser.color, 2, 0.5);
    }

    // Player
    const angle = getAimAngle(); // Use calculated angle for consistent rotation
    ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(angle);
    ctx.fillStyle = '#111'; ctx.fillRect(10, -5, 30, 10);
    ctx.fillStyle = player.weapon.color; ctx.shadowBlur = 10; ctx.shadowColor = player.weapon.color;
    ctx.fillRect(15, -4, 20, 8); ctx.shadowBlur = 0;
    ctx.restore();

    if(player.activeEffects['shieldVisual']) {
        ctx.strokeStyle = '#bd00ff'; ctx.lineWidth = 3; ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.arc(player.x, player.y, 55, 0, Math.PI*2); ctx.stroke(); ctx.globalAlpha = 1;
    }

    const charId = CHARACTERS[selectedCharIdx].id;
    ctx.shadowBlur = 20; ctx.shadowColor = '#00f2ea';
    if (cachedCharImages[charId]) {
        ctx.drawImage(cachedCharImages[charId], player.x - 40, player.y - 40, 80, 80);
    } else {
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(player.x, player.y, 40, 0, Math.PI*2); ctx.fill();
    }
    ctx.shadowBlur = 0;

    ctx.textAlign = 'center';
    floatingTexts.forEach(t => {
        ctx.fillStyle = t.color; ctx.font = `bold ${t.size}px Rajdhani`; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
        ctx.strokeText(t.text, t.x, t.y); ctx.fillText(t.text, t.x, t.y);
    });

    ctx.restore();
}

function drawTwitterLayout(ctx, w, h) {
    const border = '#2f3336'; const textMain = '#e7e9ea'; const textDim = '#71767b';
    const leftColW = Math.max(80, w * 0.2); const midColW = Math.min(600, w * 0.5);
    const midX = (w - midColW) / 2; const rightColX = midX + midColW;

    ctx.strokeStyle = border; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(midX, 0); ctx.lineTo(midX, h); ctx.moveTo(rightColX, 0); ctx.lineTo(rightColX, h); ctx.stroke();

    ctx.fillStyle = textMain;
    ctx.textAlign = 'right';
    const navX = midX - 30;
    // FontAwesome Unicodes: House, Search, Bell, Envelope, List, UserGroup, Diamond, User, Ellipsis
    const navItems = ['\uf015', '\uf002', '\uf0f3', '\uf0e0', '\uf022', '\uf500', '\uf007', '\uf141'];

    ctx.font = '900 24px "Font Awesome 6 Free"';
    navItems.forEach((icon, i) => { ctx.fillText(icon, navX, 60 + (i * 60)); });

    // X Logo
    ctx.font = '900 30px Arial'; // X logo is usually just X or custom, stick to text for simplicity
    ctx.fillText("𝕏", navX, 40);

    // Tweet Button Circle
    ctx.fillStyle = '#1d9bf0'; ctx.beginPath(); ctx.arc(navX - 10, h - 80, 25, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '900 20px "Font Awesome 6 Free"'; ctx.fillText("\uf040", navX, h - 73); // Pen Nib

    if (w > 1000) {
        const rightPad = 30;
        ctx.fillStyle = '#202327'; ctx.beginPath(); ctx.roundRect(rightColX + rightPad, 10, 250, 40, 20); ctx.fill();
        ctx.fillStyle = textDim; ctx.textAlign = 'left';
        ctx.font = '900 14px "Font Awesome 6 Free"'; ctx.fillText("\uf002", rightColX + rightPad + 20, 35);
        ctx.font = '14px Arial'; ctx.fillText("Search", rightColX + rightPad + 45, 35);

        ctx.fillStyle = '#16181c'; ctx.beginPath(); ctx.roundRect(rightColX + rightPad, 70, 250, 300, 15); ctx.fill();
        ctx.fillStyle = textMain; ctx.font = 'bold 18px Arial'; ctx.fillText("Trends for you", rightColX + rightPad + 15, 100);

        const trends = [
            { cat: "Gaming · Trending", name: "#FeedFrenzy", posts: "54.2K posts" },
            { cat: "Technology · Trending", name: "Cybernetics", posts: "120K posts" },
            { cat: "Politics · Trending", name: "Space Bar", posts: "12K posts" },
            { cat: "Entertainment · Trending", name: "Zombie Apocalypse", posts: "2.1M posts" }
        ];
        trends.forEach((t, i) => {
            let y = 140 + (i * 60);
            ctx.fillStyle = textDim; ctx.font = '12px Arial'; ctx.fillText(t.cat, rightColX + rightPad + 15, y);
            ctx.fillStyle = textMain; ctx.font = 'bold 14px Arial'; ctx.fillText(t.name, rightColX + rightPad + 15, y + 18);
            ctx.fillStyle = textDim; ctx.font = '12px Arial'; ctx.fillText(t.posts, rightColX + rightPad + 15, y + 34);
        });
    }
}

function renderMenuBackground() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.globalAlpha = 0.2; ctx.drawImage(layoutCanvas, 0, 0); ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0,0,canvas.width, canvas.height);
}

// --- UI HELPERS ---
function updateUI() {
    document.getElementById('total-currency').innerText = currency;
    document.getElementById('store-currency').innerText = currency;
}

function updateHUD() {
    document.getElementById('game-likes').innerText = Math.floor(score);
    const hpPct = Math.max(0, (player.hp / player.maxHp) * 100);
    document.getElementById('hp-bar').style.width = `${hpPct}%`;
    document.getElementById('ult-bar').style.width = `${player.ultCharge}%`;
    const ultBtn = document.getElementById('ult-btn');
    const pcHint = document.getElementById('pc-ult-hint');

    if (player.ultCharge >= 100) {
        ultBtn.classList.add('ready'); ultBtn.style.display = 'flex';
        if(!joystick.active) pcHint.style.display = 'block';
    } else {
        ultBtn.classList.remove('ready'); ultBtn.style.display = 'none';
        pcHint.style.display = 'none';
    }
}

function gameOver() {
    stopLoopingSound('laser_beam');
    gameState = 'GAMEOVER';
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('game-over').classList.remove('hidden');
    document.getElementById('run-score').innerText = Math.floor(score);
    currency += Math.floor(score);
    saveGame(); updateUI();
    generateRoast(Math.floor(score));
}

function returnToMenu() {
    stopLoopingSound('laser_beam');
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('pause-menu').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
    gameState = 'MENU';
    updateUI();
}

function openCharSelect() {
    const list = document.getElementById('char-list'); list.innerHTML = '';
    const desc = document.getElementById('char-ability-desc');
    desc.innerText = CHARACTERS[selectedCharIdx].special;

    CHARACTERS.forEach((c, i) => {
        const el = document.createElement('div'); el.className = `char-card ${i === selectedCharIdx ? 'selected' : ''}`;
        const imgContainer = document.createElement('div'); imgContainer.className = 'char-img-container';
        // Use raw img for menu display
        const img = c.img ? c.img.cloneNode() : document.createElement('img');
        if(!c.img) img.src = c.src;

        imgContainer.appendChild(img);
        const name = document.createElement('div'); name.className = 'char-name'; name.innerText = c.name;
        el.appendChild(imgContainer); el.appendChild(name);
        el.onclick = () => { selectedCharIdx = i; saveGame(); desc.innerText = c.special; openCharSelect(); };
        list.appendChild(el);
    });
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('char-select').classList.remove('hidden');
}

function openStore() {
    const list = document.getElementById('store-list'); list.innerHTML = '';
    updateShopkeeperBanter();
    WEAPONS.forEach(w => {
        const isUnlocked = unlockedWeapons.includes(w.id); const isSelected = selectedWeaponId === w.id;
        const el = document.createElement('div');
        el.className = `shop-item ${isSelected ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}`;
        if(!isUnlocked) el.innerHTML += `<span class="new-badge">LOCKED</span>`;
        el.innerHTML += `<div class="item-name" style="color:${w.color}">${w.name}</div><div class="item-price">${isUnlocked ? (isSelected ? 'EQUIPPED' : 'SELECT') : `💎 ${w.price}`}</div>`;
        el.onclick = () => {
            if (isUnlocked) { selectedWeaponId = w.id; saveGame(); openStore(); }
            else {
                if (currency >= w.price) {
                    currency -= w.price; unlockedWeapons.push(w.id);
                    saveGame(); showToast(`ACQUIRED: ${w.name}`); openStore();
                } else { showToast("INSUFFICIENT FUNDS"); }
            }
        };
        list.appendChild(el);
    });
    updateUI();
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('gun-store').classList.remove('hidden');
}

function openTrendGen() { document.getElementById('main-menu').classList.add('hidden'); document.getElementById('trend-menu').classList.remove('hidden'); document.getElementById('trend-status').innerText = ""; }

async function generateTrend() {
    const input = document.getElementById('trend-input').value.trim(); if (!input) return;
    const btn = document.querySelector('#trend-menu .btn-magic') || document.querySelector('#trend-menu .btn');
    const status = document.getElementById('trend-status');
    btn.disabled = true; btn.style.opacity = 0.5; status.innerText = "INJECTING VIRAL CODE...";

    // Fallback Logic Only
    let tweets = [
        `Everyone is talking about ${input} rn.`, `If you don't like ${input}, block me.`,
        `Just saw ${input} and I'm shaking.`, `${input} is the new meta.`,
        `Why is ${input} trending?`, `I need more ${input} in my life.`,
        `${input} szn approachin.`, `Unpopular opinion: ${input} is mid.`,
        `Imagine not owning ${input}.`, `${input}. That's the tweet.`
    ];

    await new Promise(r => setTimeout(r, 800));
    activeTweets = tweets; currentTrend = input;
    status.innerText = "UPLOAD COMPLETE.";
    setTimeout(() => { closeOverlay(); startGame(); }, 1000);
    btn.disabled = false; btn.style.opacity = 1;
}

async function updateShopkeeperBanter() {
    const msgEl = document.getElementById('shopkeeper-msg');
    const lines = ["Credits upfront.", "No refunds.", "Top tier gear.", "You break it, you buy it.", "Fresh stock just in."];
    msgEl.innerText = `"${lines[Math.floor(Math.random() * lines.length)]}"`;
}

async function generateRoast(score) {
    const roastEl = document.getElementById('roast-text');
    const roasts = ["Skill issue.", "Try turning your monitor on.", "My grandma plays better.", "Ratioed.", "Touch grass.", "L + Ratio."];
    roastEl.innerText = roasts[Math.floor(Math.random() * roasts.length)];
}

function closeOverlay() {
    document.getElementById('char-select').classList.add('hidden');
    document.getElementById('gun-store').classList.add('hidden');
    document.getElementById('trend-menu').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
}

function showToast(msg) {
    const t = document.getElementById('toast'); t.innerText = msg; t.style.opacity = 1;
    setTimeout(() => t.style.opacity = 0, 2000);
}

// Save/Load
function saveGame() {
    localStorage.setItem('fs_currency', currency);
    localStorage.setItem('fs_weapons', JSON.stringify(unlockedWeapons));
    localStorage.setItem('fs_char', selectedCharIdx);
    localStorage.setItem('fs_loadout', selectedWeaponId);
}