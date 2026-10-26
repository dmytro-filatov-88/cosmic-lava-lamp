/**
 * Cosmic Lava Lamp — Raymarched WebGL & Ambient Space Synthesis
 * Autonomous Bored AI Web Experiment
 */

(function () {
  'use strict';

  // --- Configuration & State ---
  const NUM_BLOBS = 8;
  const LAMP_RADIUS = 0.78;
  const LAMP_HEIGHT = 1.35;

  const PALETTES = {
    nebula: {
      name: 'Cyber Nebula',
      primary: [1.0, 0.0, 0.5],       // Neon Magenta
      secondary: [0.0, 0.95, 1.0],    // Electric Cyan
      glow: [0.55, 0.1, 0.9],         // Violet Aura
      ambient: [0.02, 0.04, 0.12]
    },
    solar: {
      name: 'Solar Flare',
      primary: [1.0, 0.28, 0.0],      // Hyper Orange
      secondary: [1.0, 0.85, 0.0],    // Molten Gold
      glow: [0.95, 0.08, 0.02],       // Crimson Flare
      ambient: [0.12, 0.03, 0.01]
    },
    plasma: {
      name: 'Alien Plasma',
      primary: [0.0, 1.0, 0.45],      // Toxic Emerald
      secondary: [0.0, 0.8, 1.0],     // Cyan Beam
      glow: [0.1, 0.9, 0.3],          // Neon Lime
      ambient: [0.01, 0.08, 0.06]
    },
    cryo: {
      name: 'Cryo Void',
      primary: [0.0, 0.7, 1.0],       // Electric Ice
      secondary: [0.85, 0.95, 1.0],   // Crystalline White
      glow: [0.0, 0.2, 0.8],          // Deep Cobalt
      ambient: [0.01, 0.04, 0.15]
    },
    prism: {
      name: 'Psychedelic Prism',
      primary: [1.0, 0.05, 0.6],      // Rainbow shifting
      secondary: [0.2, 1.0, 0.2],     // Neon Green
      glow: [0.9, 0.9, 0.1],          // Electric Yellow
      ambient: [0.06, 0.02, 0.1]
    }
  };

  const state = {
    currentPalette: 'nebula',
    gravity: 1.0,          // standard 1.0G
    targetGravity: 1.0,
    coreTemp: 1420,        // Kelvin
    viscosity: 0.78,
    isSupernova: false,
    supernovaTimer: 0.0,
    singularityMode: false,
    soundEnabled: true,
    audioInitialized: false,
    pointerDown: false,
    pointerX: 0,
    pointerY: 0,
    lastPointerX: 0,
    lastPointerY: 0,
    pointerVelocity: 0,
    camRotX: 0,
    camRotY: 0,
    targetCamX: 0,
    targetCamY: 0,
    easterEggClicks: 0
  };

  // --- Physics Blobs Initialization ---
  const blobs = [];
  for (let i = 0; i < NUM_BLOBS; i++) {
    const angle = (i / NUM_BLOBS) * Math.PI * 2;
    const dist = (Math.random() * 0.4 + 0.1) * LAMP_RADIUS;
    blobs.push({
      x: Math.cos(angle) * dist,
      y: (Math.random() * 2 - 1) * (LAMP_HEIGHT * 0.7),
      z: Math.sin(angle) * dist,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.3,
      vz: (Math.random() - 0.5) * 0.2,
      radius: 0.22 + Math.random() * 0.15,
      temp: Math.random(),
      mass: 1.0,
      colorRatio: i / NUM_BLOBS,
      wobblePhase: Math.random() * Math.PI * 2
    });
  }

  // --- Web Audio Synthesizer ---
  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.droneOsc1 = null;
      this.droneOsc2 = null;
      this.padOsc1 = null;
      this.padOsc2 = null;
      this.padFilter = null;
      this.noiseNode = null;
      this.noiseGain = null;
      this.noiseFilter = null;
      this.muted = false;
    }

    init() {
      if (this.ctx) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master output
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // 1. Sub-Bass Cosmic Drone
      this.droneFilter = this.ctx.createBiquadFilter();
      this.droneFilter.type = 'lowpass';
      this.droneFilter.frequency.setValueAtTime(120, this.ctx.currentTime);
      this.droneFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);
      this.droneFilter.connect(this.masterGain);

      this.droneOsc1 = this.ctx.createOscillator();
      this.droneOsc1.type = 'sine';
      this.droneOsc1.frequency.setValueAtTime(48, this.ctx.currentTime); // Eb1
      this.droneOsc1.connect(this.droneFilter);
      this.droneOsc1.start();

      this.droneOsc2 = this.ctx.createOscillator();
      this.droneOsc2.type = 'triangle';
      this.droneOsc2.frequency.setValueAtTime(48.4, this.ctx.currentTime); // subtle beating
      this.droneOsc2.connect(this.droneFilter);
      this.droneOsc2.start();

      // 2. Cosmic Ambient Pad
      this.padFilter = this.ctx.createBiquadFilter();
      this.padFilter.type = 'lowpass';
      this.padFilter.frequency.setValueAtTime(280, this.ctx.currentTime);
      this.padFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

      this.padGain = this.ctx.createGain();
      this.padGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      this.padFilter.connect(this.padGain);
      this.padGain.connect(this.masterGain);

      this.padOsc1 = this.ctx.createOscillator();
      this.padOsc1.type = 'sawtooth';
      this.padOsc1.frequency.setValueAtTime(144, this.ctx.currentTime); // Fifth harmonic
      this.padOsc1.connect(this.padFilter);
      this.padOsc1.start();

      this.padOsc2 = this.ctx.createOscillator();
      this.padOsc2.type = 'triangle';
      this.padOsc2.frequency.setValueAtTime(216, this.ctx.currentTime);
      this.padOsc2.connect(this.padFilter);
      this.padOsc2.start();

      // Pad LFO
      this.lfo = this.ctx.createOscillator();
      this.lfoGain = this.ctx.createGain();
      this.lfo.frequency.setValueAtTime(0.08, this.ctx.currentTime);
      this.lfoGain.gain.setValueAtTime(120, this.ctx.currentTime);
      this.lfo.connect(this.lfoGain);
      this.lfoGain.connect(this.padFilter.frequency);
      this.lfo.start();

      // 3. Fluid Swirling Noise Buffer (for drag stirring)
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        output[i] = (b0 + b1 + b2) * 0.2;
      }

      this.noiseNode = this.ctx.createBufferSource();
      this.noiseNode.buffer = noiseBuffer;
      this.noiseNode.loop = true;

      this.noiseFilter = this.ctx.createBiquadFilter();
      this.noiseFilter.type = 'bandpass';
      this.noiseFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
      this.noiseFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);

      this.noiseGain = this.ctx.createGain();
      this.noiseGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

      this.noiseNode.connect(this.noiseFilter);
      this.noiseFilter.connect(this.noiseGain);
      this.noiseGain.connect(this.masterGain);
      this.noiseNode.start();
    }

    updateStir(velocity) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      const targetGain = Math.min(velocity * 0.6, 0.35);
      const targetFreq = 300 + Math.min(velocity * 800, 1200);

      this.noiseGain.gain.setTargetAtTime(targetGain, t, 0.08);
      this.noiseFilter.frequency.setTargetAtTime(targetFreq, t, 0.08);
    }

    updateGravityTone(gravity) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      // Map gravity -1 to +2 to drone base frequencies
      const baseFreq = 48 * Math.pow(2, (gravity - 1.0) * 0.4);
      this.droneOsc1.frequency.setTargetAtTime(Math.max(28, Math.min(baseFreq, 110)), t, 0.15);
      this.droneOsc2.frequency.setTargetAtTime(Math.max(28.4, Math.min(baseFreq + 0.4, 110.4)), t, 0.15);
    }

    playBlobCollision(panX, impactEnergy, radius) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;

      // FM synthesis liquid drop/chime
      const carrier = this.ctx.createOscillator();
      const mod = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();
      const noteGain = this.ctx.createGain();
      const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

      // Higher pitch for smaller blobs, deeper for large blobs
      const baseFreq = 160 + (0.45 - Math.min(radius, 0.4)) * 700;
      carrier.frequency.setValueAtTime(baseFreq, t);
      carrier.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, t + 0.35);

      mod.frequency.setValueAtTime(baseFreq * 1.5, t);
      modGain.gain.setValueAtTime(baseFreq * 1.2 * Math.min(impactEnergy, 1.5), t);
      modGain.gain.exponentialRampToValueAtTime(1.0, t + 0.25);

      mod.connect(carrier.frequency);

      const amp = Math.min(impactEnergy * 0.2, 0.28);
      noteGain.gain.setValueAtTime(amp, t);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);

      carrier.connect(noteGain);

      if (panner) {
        panner.pan.setValueAtTime(Math.max(-1, Math.min(panX / LAMP_RADIUS, 1)), t);
        noteGain.connect(panner);
        panner.connect(this.masterGain);
      } else {
        noteGain.connect(this.masterGain);
      }

      carrier.start(t);
      mod.start(t);
      carrier.stop(t + 0.45);
      mod.stop(t + 0.45);
    }

    playSupernova() {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;

      // 1. Ascending energy riser
      const riser = this.ctx.createOscillator();
      const riserGain = this.ctx.createGain();
      riser.type = 'sawtooth';
      riser.frequency.setValueAtTime(80, t);
      riser.frequency.exponentialRampToValueAtTime(880, t + 0.8);
      riserGain.gain.setValueAtTime(0.01, t);
      riserGain.gain.linearRampToValueAtTime(0.35, t + 0.75);
      riserGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      riser.connect(riserGain);
      riserGain.connect(this.masterGain);
      riser.start(t);
      riser.stop(t + 1.25);

      // 2. Deep Sub-Bass Detonation
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(140, t + 0.7);
      sub.frequency.exponentialRampToValueAtTime(32, t + 2.5);
      subGain.gain.setValueAtTime(0.0, t);
      subGain.gain.setValueAtTime(0.5, t + 0.7);
      subGain.gain.exponentialRampToValueAtTime(0.0001, t + 3.0);
      sub.connect(subGain);
      subGain.connect(this.masterGain);
      sub.start(t + 0.7);
      sub.stop(t + 3.1);

      // 3. Shimmering Crystal Harmonics
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const chime = this.ctx.createOscillator();
        const cGain = this.ctx.createGain();
        chime.type = 'sine';
        chime.frequency.setValueAtTime(freq, t + 0.8 + idx * 0.08);
        cGain.gain.setValueAtTime(0.12, t + 0.8 + idx * 0.08);
        cGain.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
        chime.connect(cGain);
        cGain.connect(this.masterGain);
        chime.start(t + 0.8 + idx * 0.08);
        chime.stop(t + 3.6);
      });
    }

    toggleMute() {
      this.muted = !this.muted;
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(this.muted ? 0.0 : 0.4, this.ctx.currentTime, 0.05);
      }
      return !this.muted;
    }

    resume() {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }
  }

  const audio = new AudioEngine();

  // --- WebGL Shaders & Program Setup ---
  const canvas = document.getElementById('gl-canvas');
  let gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) {
    alert('WebGL is not supported on this browser/device.');
    return;
  }

  const vertexShaderSrc = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fragmentShaderSrc = `
    precision highp float;
    varying vec2 v_uv;

    uniform vec2 u_resolution;
    uniform float u_time;
    uniform vec4 u_blobs[${NUM_BLOBS}]; // xyz = pos, w = radius
    uniform vec3 u_palette_primary;
    uniform vec3 u_palette_secondary;
    uniform vec3 u_palette_glow;
    uniform vec3 u_palette_ambient;
    uniform float u_stir;
    uniform float u_supernova;
    uniform vec2 u_cam_rot;

    // Polynomial smooth minimum
    float smin(float a, float b, float k) {
      float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
      return mix(b, a, h) - k * h * (1.0 - h);
    }

    // Cylinder distance function for glass tube
    float sdCappedCylinder(vec3 p, float h, float r) {
      vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
      return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
    }

    // Raymarching scene SDF for metaballs
    float mapMetaballs(vec3 p, out float blendFactor) {
      float d = 1e5;
      float bAcc = 0.0;
      float wAcc = 0.0;

      for (int i = 0; i < ${NUM_BLOBS}; i++) {
        vec3 bPos = u_blobs[i].xyz;
        float bRad = u_blobs[i].w;
        // Subtle organic squish wobble
        float wobble = sin(p.y * 7.0 + u_time * 2.5 + float(i)) * 0.035;
        float d_i = length(p - bPos) - (bRad + wobble);

        float weight = 1.0 / (d_i * d_i + 0.05);
        bAcc += float(i) * weight;
        wAcc += weight;

        d = smin(d, d_i, 0.32);
      }
      blendFactor = (wAcc > 0.0) ? (bAcc / (wAcc * float(${NUM_BLOBS}))) : 0.5;
      return d;
    }

    // Normal calculation
    vec3 calcNormal(vec3 p) {
      float dummy;
      float d = mapMetaballs(p, dummy);
      vec2 e = vec2(0.003, 0.0);
      return normalize(vec3(
        mapMetaballs(p + e.xyy, dummy) - d,
        mapMetaballs(p + e.yxy, dummy) - d,
        mapMetaballs(p + e.yyx, dummy) - d
      ));
    }

    // Procedural starry space background with nebula
    vec3 renderDeepSpace(vec3 rd) {
      // Base dark cosmic background
      vec3 col = u_palette_ambient;

      // Swirling nebula dust
      float neb = sin(rd.x * 3.0 + u_time * 0.05) * cos(rd.y * 3.0 - u_time * 0.03) * sin(rd.z * 3.0);
      col += u_palette_glow * max(0.0, neb * 0.15);

      // Starfield dots
      vec3 pStar = rd * 80.0;
      vec3 cell = floor(pStar);
      vec3 fractP = fract(pStar) - 0.5;
      float hash = fract(sin(dot(cell, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
      if (hash > 0.965) {
        float twinkle = sin(u_time * 3.0 + hash * 6.28) * 0.5 + 0.5;
        float starDist = length(fractP);
        float star = smoothstep(0.18, 0.02, starDist) * twinkle;
        col += vec3(0.9, 0.95, 1.0) * star * (0.8 + hash * 0.6);
      }
      return col;
    }

    void main() {
      // Normalized screen coordinates
      vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);

      // Camera Ray setup
      vec3 ro = vec3(0.0, 0.0, 3.4);
      vec3 rd = normalize(vec3(uv.x + u_cam_rot.x * 0.15, uv.y + u_cam_rot.y * 0.15, -1.9));

      // Raymarch space
      vec3 spaceCol = renderDeepSpace(rd);

      // Glass Lamp Container parameters
      float glassRadius = ${LAMP_RADIUS.toFixed(2)};
      float glassHalfH = ${LAMP_HEIGHT.toFixed(2)};

      // Cap and Base Metallic Trims
      float dTopCap = sdCappedCylinder(ro + rd * 1.5 - vec3(0.0, glassHalfH + 0.12, 0.0), 0.12, glassRadius + 0.04);
      float dBotCap = sdCappedCylinder(ro + rd * 1.5 - vec3(0.0, -glassHalfH - 0.12, 0.0), 0.12, glassRadius + 0.04);

      // Primary raymarch through scene
      float t = 1.0;
      float maxDist = 5.0;
      float hitDist = -1.0;
      float blendFactor = 0.5;
      float glowAcc = 0.0;

      for (int i = 0; i < 75; i++) {
        vec3 p = ro + rd * t;

        // Clip bounds to cylinder region
        if (abs(p.y) > glassHalfH + 0.15 || length(p.xz) > glassRadius + 0.15) {
          t += 0.06;
          if (t > maxDist) break;
          continue;
        }

        float curBlend;
        float d = mapMetaballs(p, curBlend);

        // Volumetric glow accumulation
        glowAcc += 0.018 / (abs(d) * 8.0 + 0.15);

        if (d < 0.002) {
          hitDist = t;
          blendFactor = curBlend;
          break;
        }
        t += max(d * 0.7, 0.015);
        if (t > maxDist) break;
      }

      vec3 finalCol = spaceCol;

      // Outer glass cylinder visual bounds
      float dCyl = sdCappedCylinder(ro + rd * 2.0, glassHalfH, glassRadius);
      float glassRim = 1.0 - abs(dot(rd, vec3(0.0, 0.0, 1.0)));

      // Render Metaballs
      if (hitDist > 0.0) {
        vec3 p = ro + rd * hitDist;
        vec3 n = calcNormal(p);

        // Neon Dual-Tone Color Blending
        vec3 blobCol = mix(u_palette_primary, u_palette_secondary, blendFactor);
        if (u_supernova > 0.05) {
          blobCol = mix(blobCol, vec3(1.0, 0.95, 0.9), u_supernova);
        }

        // Lighting model
        vec3 lightTop = normalize(vec3(0.5, 2.0, 1.2));
        vec3 lightHeater = normalize(vec3(0.0, -2.5, 0.5));

        float diffTop = max(dot(n, lightTop), 0.0);
        float diffHeater = max(dot(n, lightHeater), 0.0) * 1.4;
        float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);

        // Specular highlight
        vec3 refVec = reflect(rd, n);
        float spec = pow(max(dot(refVec, lightTop), 0.0), 32.0);

        // Subsurface scattering warmth
        vec3 sss = u_palette_glow * (0.35 + diffHeater * 0.65);

        finalCol = blobCol * (0.2 + diffTop * 0.6) + sss + fresnel * u_palette_secondary * 1.2 + spec * vec3(1.0);
      }

      // Add Volumetric Fluid Glow
      finalCol += u_palette_glow * glowAcc * (0.04 + u_stir * 0.03);

      // Glass Tube Cylinder Reflections & Highlights
      float tubeDist = length(uv.x);
      if (abs(uv.y) < 0.65 && tubeDist < glassRadius * 0.9) {
        float edgeGlass = smoothstep(glassRadius * 0.7, glassRadius * 0.88, tubeDist);
        finalCol += vec3(0.3, 0.6, 0.9) * edgeGlass * 0.22;
        // Subtle vertical glass specular streak
        float streak = exp(-pow((uv.x + 0.35) * 18.0, 2.0)) * 0.25;
        finalCol += vec3(0.9, 0.95, 1.0) * streak;
      }

      // Brushed Metallic Caps (Top & Bottom)
      if (abs(uv.y) >= 0.65 && abs(uv.y) <= 0.78 && tubeDist < glassRadius * 0.92) {
        float capShine = sin(uv.x * 20.0) * 0.15 + 0.35;
        vec3 metalCol = vec3(0.18, 0.2, 0.26) + vec3(capShine);
        // Status LED ring in the metallic cap
        if (abs(abs(uv.y) - 0.66) < 0.012) {
          metalCol = mix(metalCol, u_palette_primary * 2.0, 0.85);
        }
        finalCol = metalCol;
      }

      // Supernova screen flash
      if (u_supernova > 0.0) {
        finalCol += vec3(1.0, 0.85, 0.95) * u_supernova * 0.8;
      }

      // Vignette
      float vig = 1.0 - dot(uv * 0.6, uv * 0.6);
      finalCol *= clamp(vig, 0.0, 1.0);

      gl_FragColor = vec4(finalCol, 1.0);
    }
  `;

  function createShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  const vs = createShader(gl.VERTEX_SHADER, vertexShaderSrc);
  const fs = createShader(gl.FRAGMENT_SHADER, fragmentShaderSrc);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(prog));
  }
  gl.useProgram(prog);

  // Geometry: Fullscreen Quad
  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );
  const aPos = gl.getAttribLocation(prog, 'a_position');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  // Uniform locations
  const uResolution = gl.getUniformLocation(prog, 'u_resolution');
  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uBlobs = gl.getUniformLocation(prog, 'u_blobs');
  const uPalPrimary = gl.getUniformLocation(prog, 'u_palette_primary');
  const uPalSecondary = gl.getUniformLocation(prog, 'u_palette_secondary');
  const uPalGlow = gl.getUniformLocation(prog, 'u_palette_glow');
  const uPalAmbient = gl.getUniformLocation(prog, 'u_palette_ambient');
  const uStir = gl.getUniformLocation(prog, 'u_stir');
  const uSupernova = gl.getUniformLocation(prog, 'u_supernova');
  const uCamRot = gl.getUniformLocation(prog, 'u_cam_rot');

  // --- Physics Simulation Engine ---
  function updatePhysics(dt) {
    // Smooth Gravity Lerp
    state.gravity += (state.targetGravity - state.gravity) * 0.1;

    // Supernova Countdown
    if (state.isSupernova) {
      state.supernovaTimer -= dt;
      if (state.supernovaTimer <= 0) {
        state.isSupernova = false;
        state.supernovaTimer = 0;
      }
    }

    // Viscosity dampening factor
    const drag = Math.pow(0.92, dt * 60);

    // Stir velocity dampening
    state.pointerVelocity *= 0.94;
    audio.updateStir(state.pointerVelocity);

    // Update each blob
    const blobFloatArray = new Float32Array(NUM_BLOBS * 4);

    for (let i = 0; i < blobs.length; i++) {
      const b = blobs[i];

      // 1. Thermal convection:
      // Bottom zone heats up; top zone cools down
      if (b.y < -0.45) {
        b.temp = Math.min(1.0, b.temp + dt * (0.45 + ( -b.y - 0.45 ) * 0.8));
      } else if (b.y > 0.45) {
        b.temp = Math.max(0.0, b.temp - dt * (0.35 + ( b.y - 0.45 ) * 0.8));
      } else {
        // Slow diffusion towards ambient
        b.temp += (0.5 - b.temp) * dt * 0.08;
      }

      // 2. Buoyancy vs Gravity
      // Standard: Hot rises, cold sinks. Inverted: reverses direction.
      const buoyancyForce = (b.temp - 0.48) * 1.8 * state.gravity;
      const gravForce = -0.65 * state.gravity;
      b.vy += (buoyancyForce + gravForce) * dt;

      // 3. Organic micro-convection and wobble
      b.wobblePhase += dt * (1.5 + b.temp * 2.0);
      b.vx += Math.cos(b.wobblePhase) * 0.03 * dt;
      b.vz += Math.sin(b.wobblePhase) * 0.03 * dt;

      // 4. Singularity Mode (Easter Egg)
      if (state.singularityMode) {
        const distFromCenter = Math.sqrt(b.x * b.x + b.y * b.y + b.z * b.z) + 0.001;
        const pull = 4.5 / (distFromCenter + 0.1);
        b.vx -= (b.x / distFromCenter) * pull * dt;
        b.vy -= (b.y / distFromCenter) * pull * dt;
        b.vz -= (b.z / distFromCenter) * pull * dt;
        // Vortex swirl
        b.vx += -b.z * 3.5 * dt;
        b.vz += b.x * 3.5 * dt;
      }

      // 5. Apply Drag & Velocity
      b.vx *= drag;
      b.vy *= drag;
      b.vz *= drag;

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;

      // 6. Cylinder Wall Bounds & Soft Spring Containment
      const maxRadial = LAMP_RADIUS - b.radius * 0.6;
      const currentRadial = Math.sqrt(b.x * b.x + b.z * b.z);
      if (currentRadial > maxRadial) {
        const nx = b.x / currentRadial;
        const nz = b.z / currentRadial;
        b.x = nx * maxRadial;
        b.z = nz * maxRadial;
        // Elastic rebound
        const dot = b.vx * nx + b.vz * nz;
        b.vx -= 1.6 * dot * nx;
        b.vz -= 1.6 * dot * nz;
      }

      // 7. Top & Bottom Cap Bounds
      const maxY = LAMP_HEIGHT - b.radius * 0.6;
      if (b.y > maxY) {
        b.y = maxY;
        b.vy = -Math.abs(b.vy) * 0.6;
      } else if (b.y < -maxY) {
        b.y = -maxY;
        b.vy = Math.abs(b.vy) * 0.6;
      }

      // 8. Inter-blob soft repulsion & collision sound triggers
      for (let j = i + 1; j < blobs.length; j++) {
        const o = blobs[j];
        const dx = o.x - b.x;
        const dy = o.y - b.y;
        const dz = o.z - b.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.0001;
        const minDist = (b.radius + o.radius) * 0.85;

        if (dist < minDist) {
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          // Push apart
          const push = overlap * 2.5 * dt;
          b.vx -= nx * push;
          b.vy -= ny * push;
          b.vz -= nz * push;
          o.vx += nx * push;
          o.vy += ny * push;
          o.vz += nz * push;

          // Check for significant collision impact for procedural sound
          const relVel = Math.abs(b.vx - o.vx) + Math.abs(b.vy - o.vy);
          if (relVel > 0.35 && Math.random() < 0.25) {
            audio.playBlobCollision((b.x + o.x) * 0.5, relVel, (b.radius + o.radius) * 0.5);
          }
        }
      }

      // Pack into uniform array
      const idx = i * 4;
      blobFloatArray[idx + 0] = b.x;
      blobFloatArray[idx + 1] = b.y;
      blobFloatArray[idx + 2] = b.z;
      blobFloatArray[idx + 3] = b.radius;
    }

    return blobFloatArray;
  }

  // --- Resize Handler ---
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener('resize', resize);
  resize();

  // --- Interaction & Gesture Tracking ---
  function getLocalLampCoords(clientX, clientY) {
    const minDim = Math.min(window.innerWidth, window.innerHeight);
    const x = (clientX - window.innerWidth * 0.5) / minDim;
    const y = -(clientY - window.innerHeight * 0.5) / minDim;
    return { x: x * 2.2, y: y * 2.2 };
  }

  function handlePointerDown(e) {
    initAudioOnFirstGesture();
    state.pointerDown = true;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    state.lastPointerX = clientX;
    state.lastPointerY = clientY;
    state.pointerX = clientX;
    state.pointerY = clientY;

    // Apply shockwave poke on click/tap
    const local = getLocalLampCoords(clientX, clientY);
    pokeFluid(local.x, local.y, 0.4);
    dismissHint();
  }

  function handlePointerMove(e) {
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

    const dx = clientX - state.lastPointerX;
    const dy = clientY - state.lastPointerY;
    const speed = Math.sqrt(dx * dx + dy * dy);

    state.lastPointerX = clientX;
    state.lastPointerY = clientY;
    state.pointerX = clientX;
    state.pointerY = clientY;

    // Camera tilt
    state.targetCamX = (clientX / window.innerWidth - 0.5) * 0.4;
    state.targetCamY = (clientY / window.innerHeight - 0.5) * 0.3;

    if (state.pointerDown) {
      state.pointerVelocity = Math.max(state.pointerVelocity, speed * 0.05);
      const local = getLocalLampCoords(clientX, clientY);
      stirFluid(local.x, local.y, dx * 0.008, -dy * 0.008);
      dismissHint();
    }
  }

  function handlePointerUp() {
    state.pointerDown = false;
  }

  function stirFluid(targetX, targetY, vx, vy) {
    blobs.forEach((b) => {
      const dx = b.x - targetX;
      const dy = b.y - targetY;
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
      if (dist < 0.65) {
        const falloff = (1.0 - dist / 0.65);
        b.vx += vx * falloff * 4.5;
        b.vy += vy * falloff * 4.5;
        // Add rotational vortex swirl
        b.vx += -dy * falloff * 2.0;
        b.vz += dx * falloff * 2.0;
      }
    });
  }

  function pokeFluid(targetX, targetY, power) {
    blobs.forEach((b) => {
      const dx = b.x - targetX;
      const dy = b.y - targetY;
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
      if (dist < 0.8) {
        const force = (1.0 - dist / 0.8) * power;
        b.vx += (dx / dist) * force;
        b.vy += (dy / dist) * force;
      }
    });
  }

  // Mouse wheel scroll to shift gravity
  window.addEventListener('wheel', (e) => {
    initAudioOnFirstGesture();
    // Invert delta: scroll up = lighter / zero-g, scroll down = heavier
    const deltaG = -e.deltaY * 0.0025;
    state.targetGravity = Math.max(-1.5, Math.min(state.targetGravity + deltaG, 2.5));
    updateGravityHUD();
    audio.updateGravityTone(state.targetGravity);
  }, { passive: true });

  canvas.addEventListener('mousedown', handlePointerDown);
  window.addEventListener('mousemove', handlePointerMove);
  window.addEventListener('mouseup', handlePointerUp);

  canvas.addEventListener('touchstart', handlePointerDown, { passive: true });
  window.addEventListener('touchmove', handlePointerMove, { passive: true });
  window.addEventListener('touchend', handlePointerUp);

  // --- UI Triggers & Keybindings ---
  function setPalette(palKey) {
    if (!PALETTES[palKey]) return;
    state.currentPalette = palKey;
    document.querySelectorAll('.palette-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.palette === palKey);
    });
    showToast(`Palette: ${PALETTES[palKey].name}`);
  }

  document.querySelectorAll('.palette-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      initAudioOnFirstGesture();
      setPalette(btn.dataset.palette);
    });
  });

  // Agitate Button
  const btnStir = document.getElementById('btn-stir');
  btnStir.addEventListener('click', () => {
    initAudioOnFirstGesture();
    state.pointerVelocity = 1.5;
    blobs.forEach(b => {
      b.vx += (Math.random() - 0.5) * 1.8;
      b.vy += (Math.random() - 0.5) * 1.8;
      b.vz += (Math.random() - 0.5) * 1.8;
    });
    showToast('Fluid Viscosity Agitated! 🌀');
  });

  // Gravity Mode Toggle
  const btnGravity = document.getElementById('btn-gravity-mode');
  const gravityIcon = document.getElementById('gravity-icon');
  const gravityLabel = document.getElementById('gravity-mode-label');

  const GRAVITY_MODES = [
    { g: 1.0, icon: '🌍', label: '1.0 G' },
    { g: 0.0, icon: '🛸', label: 'Zero-G' },
    { g: -1.0, icon: '🙃', label: '-1.0 G' },
    { g: 2.2, icon: '🪐', label: 'Jupiter' }
  ];
  let currentGravIdx = 0;

  btnGravity.addEventListener('click', () => {
    initAudioOnFirstGesture();
    currentGravIdx = (currentGravIdx + 1) % GRAVITY_MODES.length;
    const mode = GRAVITY_MODES[currentGravIdx];
    state.targetGravity = mode.g;
    gravityIcon.textContent = mode.icon;
    gravityLabel.textContent = mode.label;
    updateGravityHUD();
    audio.updateGravityTone(mode.g);
    showToast(`Gravity Shift: ${mode.label} ${mode.icon}`);
  });

  // Supernova Easter Egg Explosion
  const btnSupernova = document.getElementById('btn-supernova');
  function triggerSupernova() {
    initAudioOnFirstGesture();
    state.isSupernova = true;
    state.supernovaTimer = 2.4;
    state.coreTemp = 5800; // Hyper-heated

    // Explosive outward radial impulse
    blobs.forEach(b => {
      const mag = Math.sqrt(b.x * b.x + b.y * b.y + b.z * b.z) + 0.05;
      b.vx += (b.x / mag) * 2.8;
      b.vy += (b.y / mag) * 2.8;
      b.vz += (b.z / mag) * 2.8;
      b.temp = 1.0;
    });

    audio.playSupernova();
    showToast('💥 SUPERNOVA CORE DETONATION!');

    // Trigger visual screen shake
    canvas.style.transform = 'scale(1.03)';
    setTimeout(() => { canvas.style.transform = 'none'; }, 400);
  }
  btnSupernova.addEventListener('click', triggerSupernova);

  // Easter Egg: Brand Icon Click (Singularity Vortex)
  const lampGlyph = document.getElementById('easter-egg-lamp');
  lampGlyph.addEventListener('click', () => {
    initAudioOnFirstGesture();
    state.easterEggClicks++;
    if (state.easterEggClicks >= 3) {
      state.singularityMode = !state.singularityMode;
      state.easterEggClicks = 0;
      if (state.singularityMode) {
        setPalette('prism');
        showToast('🕳️ QUANTUM SINGULARITY CORE ACTIVATED!');
      } else {
        showToast('Singularity Collapsed — Standard Space Restored');
      }
    } else {
      showToast(`Cosmic Glyph Energy: ${state.easterEggClicks}/3`);
    }
  });

  // Audio Toggle
  const btnAudio = document.getElementById('btn-audio');
  const audioIcon = document.getElementById('audio-icon');
  btnAudio.addEventListener('click', () => {
    initAudioOnFirstGesture();
    const active = audio.toggleMute();
    audioIcon.textContent = active ? '🔊' : '🔇';
    showToast(active ? 'Ambient Resonance: ON' : 'Ambient Resonance: MUTED');
  });

  // Fullscreen Toggle
  const btnFullscreen = document.getElementById('btn-fullscreen');
  btnFullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  // Hint dismiss
  const hintEl = document.getElementById('gesture-hint');
  const btnDismissHint = document.getElementById('btn-dismiss-hint');
  function dismissHint() {
    if (hintEl && !hintEl.classList.contains('hidden')) {
      hintEl.classList.add('hidden');
    }
  }
  btnDismissHint.addEventListener('click', () => {
    initAudioOnFirstGesture();
    dismissHint();
  });

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    initAudioOnFirstGesture();
    if (e.repeat) return;
    const key = e.key.toLowerCase();

    if (key === '1') setPalette('nebula');
    else if (key === '2') setPalette('solar');
    else if (key === '3') setPalette('plasma');
    else if (key === '4') setPalette('cryo');
    else if (key === '5') setPalette('prism');
    else if (key === ' ') {
      e.preventDefault();
      btnStir.click();
    } else if (key === 'g') {
      btnGravity.click();
    } else if (key === 's') {
      triggerSupernova();
    } else if (key === 'm') {
      btnAudio.click();
    } else if (key === 'f') {
      btnFullscreen.click();
    } else if (key === 'z') {
      state.targetGravity = 0.0;
      updateGravityHUD();
      showToast('Zero-G Drift Activated 🛸');
    }
  });

  // Toast Notification System
  const toastEl = document.getElementById('event-toast');
  let toastTimeout = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 2200);
  }

  // Telemetry HUD updates
  const gravityBar = document.getElementById('gravity-bar');
  const gravityVal = document.getElementById('gravity-val');
  const tempBar = document.getElementById('temp-bar');
  const tempVal = document.getElementById('temp-val');

  function updateGravityHUD() {
    if (!gravityBar || !gravityVal) return;
    const pct = Math.max(0, Math.min(((state.targetGravity + 1.5) / 4.0) * 100, 100));
    gravityBar.style.width = `${pct}%`;
    const sign = state.targetGravity >= 0 ? '+' : '';
    gravityVal.textContent = `${sign}${state.targetGravity.toFixed(2)} G`;
  }

  function initAudioOnFirstGesture() {
    if (!state.audioInitialized) {
      state.audioInitialized = true;
      audio.init();
      audio.resume();
    }
  }

  // --- Main Animation Loop ---
  let lastTime = performance.now();

  function animate(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    // Smooth camera inertia
    state.camRotX += (state.targetCamX - state.camRotX) * 0.08;
    state.camRotY += (state.targetCamY - state.camRotY) * 0.08;

    // Update Physics Simulation
    const blobData = updatePhysics(dt);

    // Update Core Temp HUD
    if (tempVal && tempBar) {
      state.coreTemp = Math.floor(1350 + state.gravity * 80 + (state.isSupernova ? state.supernovaTimer * 1800 : 0));
      tempVal.innerHTML = `${state.coreTemp} &deg;K`;
      const tempPct = Math.min(100, (state.coreTemp / 4000) * 100);
      tempBar.style.width = `${tempPct}%`;
    }

    // Set WebGL Shader Uniforms
    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform1f(uTime, now * 0.001);
    gl.uniform4fv(uBlobs, blobData);

    const pal = PALETTES[state.currentPalette] || PALETTES.nebula;
    gl.uniform3fv(uPalPrimary, pal.primary);
    gl.uniform3fv(uPalSecondary, pal.secondary);
    gl.uniform3fv(uPalGlow, pal.glow);
    gl.uniform3fv(uPalAmbient, pal.ambient);

    gl.uniform1f(uStir, Math.min(state.pointerVelocity, 1.0));
    gl.uniform1f(uSupernova, state.isSupernova ? (state.supernovaTimer / 2.4) : 0.0);
    gl.uniform2f(uCamRot, state.camRotX, state.camRotY);

    // Render Scene Quad
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
})();
