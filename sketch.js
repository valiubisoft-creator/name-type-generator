let particles = [];
let pg; // off-screen graphics buffer for text sampling
let t = 0;

let particleColor = '#ffffff';
let particleSize = 6;
let fontSize = 200;
let letterTracking = 0;    // px, maps to canvas letterSpacing
let particleSpeed = 1.0;   // slider 1-10 maps to 0.2-2.0
let particleDisplacement = 4; // slider 1-10; maps to lerp 0.22→0.01 (high = more drift)
let shapeType = 'circle';
let effectType = 'none';
let selectedFont = 'Unbounded';

const MAX_PARTICLES = 2000;
const SAMPLE_STEP = 4;
const PANEL_WIDTH = 270; // left rail width — used to offset text center

function setup() {
    let cnv = createCanvas(windowWidth, windowHeight);
    cnv.style('display', 'block');

    pg = createGraphics(width, height);
    pg.pixelDensity(1);

    setupControls();

    // Preload all fonts eagerly so switching is instant
    const allFonts = [
        'Great Vibes',
        'Unbounded',
        'Space Mono',
        'Press Start 2P',
        'Rye'
    ];
    const preloads = allFonts.map(f => document.fonts.load(`bold 200px "${f}"`));

    Promise.all(preloads).then(() => {
        generateParticles(document.getElementById('wordInput').value || 'chaos');
    });
}

function draw() {
    background(0);

    for (let p of particles) {
        p.update();
        p.draw();
    }

    t += 0.005 * particleSpeed;
}

// ─── Particle generation ────────────────────────────────────────────────────

function generateParticles(word) {
    particles = [];

    let points = sampleTextPoints(word);
    if (points.length === 0) return;

    let step = max(1, floor(points.length / MAX_PARTICLES));
    for (let i = 0; i < points.length; i += step) {
        particles.push(new Particle(points[i].x, points[i].y));
    }
}

function sampleTextPoints(word) {
    pg.clear();
    pg.background(0);
    pg.fill(255);
    pg.noStroke();
    pg.textAlign(CENTER, CENTER);
    pg.textFont(selectedFont);
    pg.textStyle(BOLD);
    pg.textSize(fontSize);
    pg.drawingContext.letterSpacing = letterTracking + 'px';

    // Center text in the visible area to the right of the panel
    let centerX = PANEL_WIDTH + (width - PANEL_WIDTH) / 2;
    pg.text(word, centerX, height / 2);
    pg.loadPixels();

    let points = [];
    for (let x = 0; x < width; x += SAMPLE_STEP) {
        for (let y = 0; y < height; y += SAMPLE_STEP) {
            let idx = (x + y * width) * 4;
            if (pg.pixels[idx] > 128) {
                points.push({ x, y });
            }
        }
    }

    return points;
}

// ─── Controls wiring ────────────────────────────────────────────────────────

function setupControls() {
    document.getElementById('wordInput').addEventListener('input', function () {
        generateParticles(this.value.trim() || 'type');
    });

    document.getElementById('fontSelect').addEventListener('change', function () {
        selectedFont = this.value;
        const word = document.getElementById('wordInput').value.trim() || 'type';
        // Explicitly load the font before sampling — catches fonts not yet downloaded
        document.fonts.load(`bold ${fontSize}px "${selectedFont}"`).then(() => {
            generateParticles(word);
        });
    });

    document.getElementById('trackingSlider').addEventListener('input', function () {
        letterTracking = parseInt(this.value);
        document.getElementById('trackingVal').textContent = this.value;
        generateParticles(document.getElementById('wordInput').value.trim() || 'type');
    });

    document.getElementById('fontSizeSlider').addEventListener('input', function () {
        fontSize = parseInt(this.value);
        document.getElementById('fontSizeVal').textContent = this.value;
        generateParticles(document.getElementById('wordInput').value.trim() || 'type');
    });

    document.getElementById('sizeSlider').addEventListener('input', function () {
        particleSize = parseInt(this.value);
        document.getElementById('sizeVal').textContent = this.value;
    });

    document.getElementById('displacementSlider').addEventListener('input', function () {
        particleDisplacement = parseInt(this.value);
        document.getElementById('displacementVal').textContent = this.value;
    });

    document.getElementById('speedSlider').addEventListener('input', function () {
        particleSpeed = parseInt(this.value) * 0.2;
        document.getElementById('speedVal').textContent = this.value;
    });

    document.getElementById('colorPicker').addEventListener('input', function () {
        particleColor = this.value;
    });

    document.querySelectorAll('.tog-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.tog-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            shapeType = this.dataset.shape;
        });
    });

    document.querySelectorAll('.effect-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.effect-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            effectType = this.dataset.effect;
        });
    });

    document.getElementById('screenshotBtn').addEventListener('click', () => {
        saveCanvas('type-chaosifier', 'png');
    });
}

// ─── Window resize ──────────────────────────────────────────────────────────

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    pg = createGraphics(width, height);
    pg.pixelDensity(1);
    generateParticles(document.getElementById('wordInput').value.trim() || 'chaos');
}

// ─── Particle class ─────────────────────────────────────────────────────────

class Particle {
    constructor(x, y) {
        this.origin = createVector(x, y);
        this.pos = createVector(x + random(-4, 4), y + random(-4, 4));
        this.nSeed = random(10000);
    }

    update() {
        let angle = noise(
            this.pos.x * 0.003,
            this.pos.y * 0.003,
            t + this.nSeed * 0.0001
        ) * TWO_PI * 2;

        let vel = p5.Vector.fromAngle(angle);
        vel.mult(particleSpeed);
        this.pos.add(vel);

        // Lerp strength mapped inversely: high displacement = low lerp = more drift
        let lerpStrength = map(particleDisplacement, 1, 10, 0.22, 0.01);
        this.pos.x = lerp(this.pos.x, this.origin.x, lerpStrength);
        this.pos.y = lerp(this.pos.y, this.origin.y, lerpStrength);
    }

    draw() {
        push();
        translate(this.pos.x, this.pos.y);
        noStroke();

        if (effectType === 'glow') {
            // Neon halo — canvas shadow renders the glow; push/pop saves+restores it
            drawingContext.shadowBlur = 18;
            drawingContext.shadowColor = particleColor;
            fill(particleColor);
            this._drawShape(particleSize);

        } else if (effectType === 'extrude') {
            // Layered depth offset in the bottom-right direction
            let c = color(particleColor);
            let dark = lerpColor(c, color(0), 0.72);
            for (let i = 5; i >= 1; i--) {
                dark.setAlpha(map(i, 1, 5, 120, 50));
                fill(dark);
                push();
                translate(i * 1.6, i * 1.6);
                this._drawShape(particleSize);
                pop();
            }
            fill(particleColor);
            this._drawShape(particleSize);

        } else if (effectType === 'aura') {
            // Concentric semi-transparent halos expanding outward
            let c = color(particleColor);
            for (let i = 3; i >= 1; i--) {
                fill(red(c), green(c), blue(c), map(i, 1, 3, 55, 18));
                this._drawShape(particleSize + i * 7);
            }
            fill(particleColor);
            this._drawShape(particleSize);

        } else {
            fill(particleColor);
            this._drawShape(particleSize);
        }

        pop();
    }

    _drawShape(s) {
        if (shapeType === 'circle') {
            ellipse(0, 0, s, s);
        } else if (shapeType === 'square') {
            rectMode(CENTER);
            rect(0, 0, s, s);
        } else if (shapeType === 'triangle') {
            let r = s * 0.65;
            triangle(0, -r, -r * 0.866, r * 0.5, r * 0.866, r * 0.5);
        }
    }
}
