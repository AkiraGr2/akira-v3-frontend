/**
 * AKIRA CELESTIAL QUANTUM ORB (WebGL / Three.js)
 * Transformed from a geometric polygon to a radiant, living celestial entity.
 * Features:
 *  - Ethereal Multi-Spectral Luminous Core with iridescent Fresnel Shading
 *  - Pulsing Central Eye of Consciousness (Living Quantum Singularity)
 *  - Fluid Atmospheric Aurora Ribbons (Magnetic Field Lines)
 *  - 900 Cosmic Twinkle Stardust Particles
 *  - Smooth Parallax & Audio Reactive Expansion
 */
(function() {
  "use strict";

  if (typeof THREE === "undefined") {
    console.warn("[AkiraQuantumOrb] Three.js not found, falling back.");
    return;
  }

  // High-def celestial glow sprite
  function createStardustTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
    grad.addColorStop(0.15, "rgba(100, 240, 255, 0.9)");
    grad.addColorStop(0.4, "rgba(140, 70, 255, 0.45)");
    grad.addColorStop(0.7, "rgba(230, 50, 160, 0.15)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }

  const stardustTexture = createStardustTexture();

  // Ethereal Shader for the Living Plasma Core
  const PlasmaShader = {
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec2 vUv;
      uniform float uTime;
      uniform float uAudio;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        vUv = uv;

        // Fluid organic ripple deformation
        float wave = sin(position.x * 0.08 + uTime * 2.5) 
                   * cos(position.y * 0.08 + uTime * 2.2) 
                   * sin(position.z * 0.08 + uTime * 2.8);
        
        float displacement = 1.0 + wave * (0.05 + uAudio * 0.22);
        vec3 newPos = position * displacement;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec2 vUv;
      uniform float uTime;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform vec3 uColorRim;
      uniform float uAudio;

      void main() {
        // Fresnel rim glow
        vec3 viewDir = vec3(0.0, 0.0, 1.0);
        float fresnel = 1.0 - max(dot(vNormal, viewDir), 0.0);
        fresnel = pow(fresnel, 2.2);

        // Internal chromatic plasma flow
        float flow = sin(vPosition.y * 0.06 + uTime * 1.8) * 0.5 + 0.5;
        vec3 plasma = mix(uColorA, uColorB, flow);

        // Center brightness
        float centerGlow = pow(max(dot(vNormal, viewDir), 0.0), 3.0);
        vec3 finalColor = mix(plasma, uColorRim, fresnel) + vec3(centerGlow * (0.6 + uAudio * 0.6));

        gl_FragColor = vec4(finalColor, 0.88 + fresnel * 0.12);
      }
    `
  };

  const STATE_PALETTES = {
    idle: {
      colorA: new THREE.Color(0x38bdf8),     // Celestial cyan
      colorB: new THREE.Color(0x8b5cf6),     // Ethereal purple
      colorRim: new THREE.Color(0xec4899),   // Soft magenta rim
      particles: new THREE.Color(0x7dd3fc),
      rings: new THREE.Color(0xa78bfa),
      light: new THREE.Color(0x00f2fe),
      speed: 1.0,
      glowPulse: 0.06
    },
    listening: {
      colorA: new THREE.Color(0x06b6d4),     // Bright cyan
      colorB: new THREE.Color(0xf59e0b),     // Warm gold
      colorRim: new THREE.Color(0x10b981),   // Emerald edge
      particles: new THREE.Color(0xfbbf24),
      rings: new THREE.Color(0x34d399),
      light: new THREE.Color(0xf59e0b),
      speed: 1.5,
      glowPulse: 0.14
    },
    thinking: {
      colorA: new THREE.Color(0x6366f1),     // Indigo
      colorB: new THREE.Color(0xd946ef),     // Neon fuchsia
      colorRim: new THREE.Color(0x38bdf8),   // Electric blue
      particles: new THREE.Color(0xc084fc),
      rings: new THREE.Color(0xe879f9),
      light: new THREE.Color(0xa855f7),
      speed: 2.5,
      glowPulse: 0.2
    },
    speaking: {
      colorA: new THREE.Color(0x00f2fe),     // Radiant aurora
      colorB: new THREE.Color(0xec4899),     // Rose plasma
      colorRim: new THREE.Color(0xffffff),   // Pure brilliance
      particles: new THREE.Color(0x38bdf8),
      rings: new THREE.Color(0xf43f5e),
      light: new THREE.Color(0x00f2fe),
      speed: 1.8,
      glowPulse: 0.28
    }
  };

  class CelestialQuantumOrb {
    constructor(container, options = {}) {
      this.container = container;
      this.options = Object.assign({
        size: options.size || container.clientWidth || 320,
        interactive: true,
        enableRings: true,
        enableParticles: true,
        state: "idle"
      }, options);

      this.state = this.options.state;
      this.audioLevel = 0.0;
      this.targetAudioLevel = 0.0;
      this.targetRotX = 0;
      this.targetRotY = 0;
      this.clock = new THREE.Clock();
      this.running = true;

      this.init();
    }

    init() {
      const w = this.container.clientWidth || this.options.size;
      const h = this.container.clientHeight || this.options.size;

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(45, (w || 1) / (h || 1), 0.1, 1000);
      this.camera.position.z = 230;

      this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
      this.renderer.setSize(w, h);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      this.container.innerHTML = "";
      this.container.appendChild(this.renderer.domElement);
      this.renderer.domElement.style.width = "100%";
      this.renderer.domElement.style.height = "100%";
      this.renderer.domElement.style.display = "block";

      this.group = new THREE.Group();
      this.scene.add(this.group);

      // 1. Ambient & Point Lights
      this.pointLight = new THREE.PointLight(0x00f2fe, 3.2, 350);
      this.pointLight.position.set(0, 0, 50);
      this.group.add(this.pointLight);

      // 2. Living Plasma Core
      this.createPlasmaCore();

      // 3. Central Singularity / Eye of Consciousness
      this.createSingularity();

      // 4. Aurora Magnetic Energy Ribbons
      if (this.options.enableRings) {
        this.createAuroraRibbons();
      }

      // 5. Cosmic Stardust Cloud
      if (this.options.enableParticles) {
        this.createStardust();
      }

      // Events
      if (this.options.interactive) {
        this.bindEvents();
      }

      this.animate = this.animate.bind(this);
      this.rafId = requestAnimationFrame(this.animate);

      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.container);
    }

    createPlasmaCore() {
      const geom = new THREE.SphereGeometry(44, 64, 64);
      const pal = STATE_PALETTES[this.state] || STATE_PALETTES.idle;

      this.plasmaUniforms = {
        uTime: { value: 0 },
        uAudio: { value: 0 },
        uColorA: { value: pal.colorA.clone() },
        uColorB: { value: pal.colorB.clone() },
        uColorRim: { value: pal.colorRim.clone() }
      };

      this.plasmaMat = new THREE.ShaderMaterial({
        vertexShader: PlasmaShader.vertexShader,
        fragmentShader: PlasmaShader.fragmentShader,
        uniforms: this.plasmaUniforms,
        transparent: true,
        blending: THREE.NormalBlending
      });

      this.coreMesh = new THREE.Mesh(geom, this.plasmaMat);
      this.group.add(this.coreMesh);
    }

    createSingularity() {
      // The radiant conscious pupil
      const geom = new THREE.SphereGeometry(18, 32, 32);
      this.singularityMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
      });
      this.singularityMesh = new THREE.Mesh(geom, this.singularityMat);
      this.group.add(this.singularityMesh);

      // Inner corona halo
      const haloGeom = new THREE.SphereGeometry(26, 32, 32);
      this.haloMat = new THREE.MeshBasicMaterial({
        color: 0x00f2fe,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending
      });
      this.haloMesh = new THREE.Mesh(haloGeom, this.haloMat);
      this.group.add(this.haloMesh);
    }

    createAuroraRibbons() {
      this.ribbons = [];
      const configs = [
        { radius: 68, tube: 0.6, rx: 0.8, ry: 0.2, speed: 1.1 },
        { radius: 78, tube: 0.5, rx: -0.6, ry: 0.9, speed: -0.8 },
        { radius: 88, tube: 0.4, rx: 1.3, rz: 0.4, speed: 0.6 }
      ];

      configs.forEach(cfg => {
        const geom = new THREE.TorusGeometry(cfg.radius, cfg.tube, 16, 100);
        const mat = new THREE.MeshBasicMaterial({
          color: STATE_PALETTES.idle.rings,
          transparent: true,
          opacity: 0.55,
          blending: THREE.AdditiveBlending
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.rotation.x = cfg.rx;
        mesh.rotation.y = cfg.ry || 0;
        mesh.rotation.z = cfg.rz || 0;
        mesh.userData = { speed: cfg.speed };
        this.group.add(mesh);
        this.ribbons.push(mesh);
      });
    }

    createStardust() {
      const count = 850;
      const positions = new Float32Array(count * 3);
      const velocities = [];

      for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        const dist = 52 + Math.random() * 65;

        positions[i * 3] = dist * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = dist * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = dist * Math.cos(phi);

        velocities.push({
          thetaSpeed: (Math.random() - 0.5) * 0.018,
          phiSpeed: (Math.random() - 0.5) * 0.018,
          baseDist: dist
        });
      }

      this.stardustGeom = new THREE.BufferGeometry();
      this.stardustGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      this.stardustVelocities = velocities;

      this.stardustMat = new THREE.PointsMaterial({
        size: 8.5,
        map: stardustTexture,
        transparent: true,
        opacity: 0.78,
        color: STATE_PALETTES.idle.particles,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      this.stardustSystem = new THREE.Points(this.stardustGeom, this.stardustMat);
      this.group.add(this.stardustSystem);
    }

    bindEvents() {
      const onMove = (e) => {
        const rect = this.container.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const x = (clientX - rect.left) / rect.width - 0.5;
        const y = (clientY - rect.top) / rect.height - 0.5;
        this.targetRotY = x * 1.1;
        this.targetRotX = y * 1.1;
      };

      window.addEventListener("mousemove", onMove, { passive: true });
      window.addEventListener("touchmove", onMove, { passive: true });
    }

    setState(stateName) {
      if (!STATE_PALETTES[stateName]) return;
      this.state = stateName;
      const pal = STATE_PALETTES[stateName];

      if (this.plasmaUniforms) {
        this.plasmaUniforms.uColorA.value.lerp(pal.colorA, 0.4);
        this.plasmaUniforms.uColorB.value.lerp(pal.colorB, 0.4);
        this.plasmaUniforms.uColorRim.value.lerp(pal.colorRim, 0.4);
      }
      if (this.stardustMat) {
        this.stardustMat.color.lerp(pal.particles, 0.4);
      }
      if (this.haloMat) {
        this.haloMat.color.lerp(pal.light, 0.4);
      }
      if (this.pointLight) {
        this.pointLight.color.lerp(pal.light, 0.4);
      }
      if (this.ribbons) {
        this.ribbons.forEach(r => r.material.color.lerp(pal.rings, 0.4));
      }
    }

    setAudioLevel(level) {
      this.targetAudioLevel = Math.max(0, Math.min(1.0, level));
    }

    resize() {
      if (!this.container || !this.renderer || !this.camera) return;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      if (w < 10 || h < 10) return;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    }

    animate() {
      if (!this.running) return;
      this.rafId = requestAnimationFrame(this.animate);

      if (document.hidden || !this.container.isConnected) return;

      const delta = this.clock.getDelta();
      const time = this.clock.getElapsedTime();
      const pal = STATE_PALETTES[this.state] || STATE_PALETTES.idle;

      // Audio smooth interpolation
      this.audioLevel += (this.targetAudioLevel - this.audioLevel) * 0.22;
      this.targetAudioLevel *= 0.93;

      const effectiveSpeed = pal.speed * (1.0 + this.audioLevel * 1.6);

      // 1. Plasma Core Uniforms
      if (this.plasmaUniforms) {
        this.plasmaUniforms.uTime.value = time * effectiveSpeed;
        this.plasmaUniforms.uAudio.value = this.audioLevel;
        this.coreMesh.rotation.y += 0.006 * effectiveSpeed;
        this.coreMesh.rotation.z += 0.003 * effectiveSpeed;
      }

      // 2. Singularity Breathing
      if (this.singularityMesh) {
        const breathe = 1.0 + Math.sin(time * 3 * effectiveSpeed) * 0.08 + this.audioLevel * 0.4;
        this.singularityMesh.scale.set(breathe, breathe, breathe);
        this.haloMesh.scale.set(breathe * 1.15, breathe * 1.15, breathe * 1.15);
      }

      // 3. Ribbon orbits
      if (this.ribbons) {
        this.ribbons.forEach((r, idx) => {
          r.rotation.z += 0.01 * r.userData.speed * effectiveSpeed;
          r.rotation.y += 0.005 * r.userData.speed * effectiveSpeed;
          const rScale = 1.0 + Math.sin(time * 2.8 + idx) * 0.03 + this.audioLevel * 0.12;
          r.scale.set(rScale, rScale, rScale);
        });
      }

      // 4. Stardust cloud
      if (this.stardustSystem && this.stardustGeom) {
        const pPos = this.stardustGeom.attributes.position;
        const pCount = pPos.count;

        for (let i = 0; i < pCount; i++) {
          const vel = this.stardustVelocities[i];
          let x = pPos.getX(i);
          let y = pPos.getY(i);
          let z = pPos.getZ(i);

          const cos = Math.cos(vel.thetaSpeed * effectiveSpeed);
          const sin = Math.sin(vel.thetaSpeed * effectiveSpeed);
          const nx = x * cos - z * sin;
          const nz = x * sin + z * cos;
          x = nx;
          z = nz;

          const r = Math.sqrt(x * x + y * y + z * z);
          if (r > 0.001) {
            const desiredR = vel.baseDist + Math.sin(time * 2.5 + i) * 5 + (this.audioLevel * 20);
            const scale = desiredR / r;
            x *= scale;
            y *= scale;
            z *= scale;
          }

          pPos.setXYZ(i, x, y, z);
        }
        pPos.needsUpdate = true;
        this.stardustSystem.rotation.y += 0.0018 * effectiveSpeed;
      }

      // 5. Parallax
      this.group.rotation.x += (this.targetRotX - this.group.rotation.x) * 0.08;
      this.group.rotation.y += (this.targetRotY - this.group.rotation.y) * 0.08;

      this.renderer.render(this.scene, this.camera);
    }

    destroy() {
      this.running = false;
      if (this.rafId) cancelAnimationFrame(this.rafId);
      if (this.resizeObserver) this.resizeObserver.disconnect();
      if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }

  // Registry
  window.AkiraQuantumOrb = {
    instances: new Map(),

    mount(container, options = {}) {
      if (typeof container === "string") {
        container = document.querySelector(container);
      }
      if (!container) return null;

      if (this.instances.has(container)) {
        this.instances.get(container).destroy();
        this.instances.delete(container);
      }

      const instance = new CelestialQuantumOrb(container, options);
      this.instances.set(container, instance);
      return instance;
    },

    setGlobalState(stateName) {
      this.instances.forEach(inst => inst.setState(stateName));
    },

    setGlobalAudio(level) {
      this.instances.forEach(inst => inst.setAudioLevel(level));
    },

    mountAll(root = document) {
      const slots = root.querySelectorAll("[data-akira-entity], .akira-entity-slot");
      slots.forEach(slot => {
        const size = parseInt(slot.dataset.size || "120", 10);
        if (size >= 60 || slot.classList.contains("akira-ref-orb") || slot.id === "akiraLiveOrbStage") {
          this.mount(slot, {
            size: size,
            state: slot.dataset.state || "idle",
            enableRings: size > 140,
            enableParticles: size > 90
          });
        }
      });
    }
  };

  // Intercept AkiraEntity
  if (window.AkiraEntity) {
    const origMountAll = window.AkiraEntity.mountAll;
    window.AkiraEntity.mountAll = function(root) {
      if (origMountAll) origMountAll.call(window.AkiraEntity, root);
      window.AkiraQuantumOrb.mountAll(root || document);
    };
    const origSetState = window.AkiraEntity.setState;
    window.AkiraEntity.setState = function(state) {
      if (origSetState) origSetState.call(window.AkiraEntity, state);
      window.AkiraQuantumOrb.setGlobalState(state);
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      window.AkiraQuantumOrb.mountAll();
    }, 400);
  });
  window.addEventListener("akira:section-shown", (e) => {
    if (e && e.detail && e.detail.section === "home") {
      setTimeout(() => {
        window.AkiraQuantumOrb.mountAll();
      }, 100);
    }
  });

  console.log("[AkiraQuantumOrb] Celestial Living Plasma Core loaded.");
})();
