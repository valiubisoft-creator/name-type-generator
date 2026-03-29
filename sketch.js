let particles = [];
let pg; // off-screen graphics buffer for text sampling
let t = 0;

let particleColor = '#ffffff';
let particleSize = 6;
let particleSpeed = 1.0; // multiplier: slider 1-10 maps to 0.2-2.0
let shapeType = 'circle';
let selectedFont = 'Audiowide';

const MAX_PARTICLES = 2000;
const SAMPLE_STEP = 4; // sample every Nth pixel in each axis

function setup() {
    let cnv = createCanvas(windowWidth, windowHeight);
    cnv.style('display', 'block');

    pg = createGraphics(width, height);
    pg.pixelDensity(1);

    setupControls();

    // Wait for Google Fonts to finish loading before sampling text pixels
    document.fonts.ready.then(() => {
        generateParticles(document.getElementById('wordInput').value || 'CHAOS');
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

    // If there are more points than MAX_PARTICLES, evenly subsample
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

    // Scale font size down until the word fits within 82% of canvas width
    let fontSize = 220;
    pg.textSize(fontSize);
    while (pg.textWidth(word) > width * 0.82 && fontSize > 20) {
        fontSize -= 4;
        pg.textSize(fontSize);
    }

    pg.text(word, width / 2, height / 2);
    pg.loadPixels();

    let points = [];
    for (let x = 0; x < width; x += SAMPLE_STEP) {
        for (let y = 0; y < height; y += SAMPLE_STEP) {
            let idx = (x + y * width) * 4;
            // Red channel — white pixel = inside a letter
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
        generateParticles(this.value.trim() || 'TYPE');
    });

    document.getElementById('fontSelect').addEventListener('change', function () {
        selectedFont = this.value;
        let word = document.getElementById('wordInput').value.trim() || 'TYPE';
        generateParticles(word);
    });

    document.getElementById('colorPicker').addEventListener('input', function () {
        particleColor = this.value;
    });

    document.getElementById('sizeSlider').addEventListener('input', function () {
        particleSize = parseInt(this.value);
        document.getElementById('sizeVal').textContent = this.value;
    });

    document.getElementById('speedSlider').addEventListener('input', function () {
        // Map slider 1-10 → multiplier 0.2-2.0
        particleSpeed = parseInt(this.value) * 0.2;
        document.getElementById('speedVal').textContent = this.value;
    });

    document.querySelectorAll('.shape-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            shapeType = this.dataset.shape;
        });
    });
}

// ─── Window resize ──────────────────────────────────────────────────────────

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    pg = createGraphics(width, height);
    pg.pixelDensity(1);

    let currentWord = document.getElementById('wordInput').value.trim() || 'CHAOS';
    generateParticles(currentWord);
}

// ─── Particle class ─────────────────────────────────────────────────────────

class Particle {
    constructor(x, y) {
        this.origin = createVector(x, y);
        this.pos = createVector(x + random(-4, 4), y + random(-4, 4));
        // Unique noise seed per particle so they don't all move in sync
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

        // Lerp back toward origin so the text shape stays legible
        this.pos.x = lerp(this.pos.x, this.origin.x, 0.06);
        this.pos.y = lerp(this.pos.y, this.origin.y, 0.06);
    }

    draw() {
        fill(particleColor);
        noStroke();
        let s = particleSize;

        push();
        translate(this.pos.x, this.pos.y);

        if (shapeType === 'circle') {
            ellipse(0, 0, s, s);

        } else if (shapeType === 'square') {
            rectMode(CENTER);
            rect(0, 0, s, s);

        } else if (shapeType === 'triangle') {
            let r = s * 0.65;
            triangle(
                0,           -r,
                -r * 0.866,  r * 0.5,
                 r * 0.866,  r * 0.5
            );
        }

        pop();
    }
}
