/**
 * AKIRA QUANTUM ORB 3D (WebGL / Three.js)
 * High-definition, reactive 3D quantum cognitive core.
 * Features:
 *  - Volumetric noise-deformed energy core
 *  - Dual counter-rotating quantum orbital filament rings
 *  - 1000-particle dynamic magnetic nebula cloud
 *  - Interactive mouse tilt & audio-reactive frequency pulsation
 *  - 4 state behaviors: idle, listening, thinking, speaking
 *  - Auto-mounts to .akira-entity-slot and Akira Live Modal
 */
(function() {
  "use strict";

  if (typeof THREE === "undefined") {
    console.warn("[AkiraQuantumOrb] Three.js not found, falling back to 2D entity.");
    return;
  }

  // Generate circular glow texture for particles procedurally (zero external image assets)
  function createParticleTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
    grad.addColorStop(0.2, "rgba(120, 220, 255, 0.85)");
    grad.addColorStop(0.5, "rgba(140, 60, 255, 0.4)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }

  const particleTexture = createParticleTexture();

  // Color palettes per state
  const STATE_PALETTES = {
    idle: {
      corePrimary: new THREE.Color(0x3b82f6),
      coreSecondary: new THREE.Color(0x8b5cf6),
      coreEmissive: new THREE.Color(0x06b6d4),
      particles: new THREE.Color(0x60a5fa),
      rings: new THREE.Color(0xa78bfa),
      light: new THREE.Color(0x38bdf8),
      speed: 1.0,
      scalePulse: 0.05
    },
    listening: {
      corePrimary: new THREE.Color(0x06b6d4),
      coreSecondary: new THREE.Color(0xf59e0b),
      coreEmissive: new THREE.Color(0x10b981),
      particles: new THREE.Color(0x38bdf8),
      rings: new THREE.Color(0xfbbf24),
      light: new THREE.Color(0x22d3ee),
      speed: 1.4,
      scalePulse: 0.12
    },
    thinking: {
      corePrimary: new THREE.Color(0x6366f1),
      coreSecondary: new THREE.Color(0xd946ef),
      coreEmissive: new THREE.Color(0xec4899),
      particles: new THREE.Color(0xc084fc),
      rings: new THREE.Color(0xf43f5e),
      light: new THREE.Color(0xa855f7),
      speed: 2.4,
      scalePulse: 0.18
    },
    speaking: {
      corePrimary: new THREE.Color(0x00f2fe),
      coreSecondary: new THREE.Color(0x7f00ff),
      coreEmissive: new THREE.Color(0xf43f5e),
      particles: new THREE.Color(0x38bdf8),
      rings: new THREE.Color(0xec4899),
      light: new THREE.Color(0x00f2fe),
      speed: 1.8,
      scalePulse: 0.25
    }
  };

  class QuantumOrbInstance {
    constructor(container, options = {}) {
      this.container = container;
      this.options = Object.assign({
        size: options.size || container.clientWidth || 300,
        interactive: true,
        enableRings: true,
        enableParticles: true,
        state: "idle"
      }, options);

      this.state = this.options.state;
      this.audioLevel = 0.0;
      this.targetAudioLevel = 0.0;
      this.mouseX = 0;
      this.mouseY = 0;
      this.targetRotX = 0;
      this.targetRotY = 0;
      this.clock = new THREE.Clock();
      this.running = true;

      this.init();
    }

    init() {
      const w = this.container.clientWidth || this.options.size;
      const h = this.container.clientHeight || this.options.size;

      // Scene & Camera
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(45, (w || 1) / (h || 1), 0.1, 1000);
      this.camera.position.z = 240;

      // Renderer
      this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
      this.renderer.setSize(w, h);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.2;

      this.container.innerHTML = "";
      this.container.appendChild(this.renderer.domElement);
      this.renderer.domElement.style.width = "100%";
      this.renderer.domElement.style.height = "100%";
      this.renderer.domElement.style.display = "block";

      this.group = new THREE.Group();
      this.scene.add(this.group);

      // 1. Lighting
      this.ambientLight = new THREE.AmbientLight(0x221144, 1.2);
      this.scene.add(this.ambientLight);

      this.pointLight = new THREE.PointLight(0x38bdf8, 3.5, 350);
      this.pointLight.position.set(0, 0, 40);
      this.group.add(this.pointLight);

      this.rimLight = new THREE.DirectionalLight(0xd946ef, 2.0);
      this.rimLight.position.set(-80, 80, -40);
      this.scene.add(this.rimLight);

      // 2. Inner Quantum Plasma Core
      this.createCore();

      // 3. Orbital Energy Filament Rings
      if (this.options.enableRings) {
        this.createRings();
      }

      // 4. Particle Nebula
      if (this.options.enableParticles) {
        this.createParticleCloud();
      }

      // Mouse events
      if (this.options.interactive) {
        this.bindEvents();
      }

      this.animate = this.animate.bind(this);
      this.rafId = requestAnimationFrame(this.animate);

      // Auto-resize
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.container);
    }

    createCore() {
      const geom = new THREE.IcosahedronGeometry(42, 5);
      this.coreGeomOriginalPos = geom.attributes.position.clone();

      this.coreMat = new THREE.MeshPhysicalMaterial({
        color: STATE_PALETTES.idle.corePrimary,
        emissive: STATE_PALETTES.idle.coreEmissive,
        emissiveIntensity: 0.9,
        roughness: 0.15,
        metalness: 0.1,
        transmission: 0.75,
        ior: 1.45,
        thickness: 18,
        wireframe: false,
        transparent: true,
        opacity: 0.92
      });

      this.coreMesh = new THREE.Mesh(geom, this.coreMat);
      this.group.add(this.coreMesh);

      // Inner glowing crystalline nucleus
      const nucGeom = new THREE.IcosahedronGeometry(22, 3);
      this.nucMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending
      });
      this.nucMesh = new THREE.Mesh(nucGeom, this.nucMat);
      this.group.add(this.nucMesh);
    }

    createRings() {
      this.rings = [];
      const configs = [
        { radius: 64, tube: 0.8, tiltX: 0.7, tiltY: 0.3, speed: 0.9 },
        { radius: 76, tube: 0.5, tiltX: -0.5, tiltY: 0.9, speed: -0.7 },
        { radius: 88, tube: 0.4, tiltX: 1.1, tiltZ: 0.4, speed: 0.5 }
      ];

      configs.forEach(cfg => {
        const ringGeom = new THREE.TorusGeometry(cfg.radius, cfg.tube, 16, 90);
        const ringMat = new THREE.MeshBasicMaterial({
          color: STATE_PALETTES.idle.rings,
          transparent: true,
          opacity: 0.65,
          blending: THREE.AdditiveBlending
        });
        const ringMesh = new THREE.Mesh(ringGeom, ringMat);
        ringMesh.rotation.x = cfg.tiltX;
        ringMesh.rotation.y = cfg.tiltY || 0;
        ringMesh.rotation.z = cfg.tiltZ || 0;
        ringMesh.userData = { speed: cfg.speed };
        this.group.add(ringMesh);
        this.rings.push(ringMesh);
      });
    }

    createParticleCloud() {
      const count = 750;
      const positions = new Float32Array(count * 3);
      const velocities = [];
      const scales = new Float32Array(count);

      for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        const dist = 50 + Math.random() * 65;

        positions[i * 3] = dist * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = dist * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = dist * Math.cos(phi);

        velocities.push({
          thetaSpeed: (Math.random() - 0.5) * 0.015,
          phiSpeed: (Math.random() - 0.5) * 0.015,
          radSpeed: (Math.random() - 0.5) * 0.2,
          baseDist: dist
        });

        scales[i] = Math.random() * 1.5 + 0.5;
      }

      this.particleGeom = new THREE.BufferGeometry();
      this.particleGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      this.particleVelocities = velocities;

      this.particleMat = new THREE.PointsMaterial({
        size: 7.5,
        map: particleTexture,
        transparent: true,
        opacity: 0.75,
        color: STATE_PALETTES.idle.particles,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      this.particleSystem = new THREE.Points(this.particleGeom, this.particleMat);
      this.group.add(this.particleSystem);
    }

    bindEvents() {
      const onMove = (e) => {
        const rect = this.container.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const x = (clientX - rect.left) / rect.width - 0.5;
        const y = (clientY - rect.top) / rect.height - 0.5;
        this.targetRotY = x * 1.2;
        this.targetRotX = y * 1.2;
      };

      window.addEventListener("mousemove", onMove, { passive: true });
      window.addEventListener("touchmove", onMove, { passive: true });
    }

    setState(stateName) {
      if (!STATE_PALETTES[stateName]) return;
      this.state = stateName;
      const pal = STATE_PALETTES[stateName];

      if (this.coreMat) {
        this.coreMat.color.lerp(pal.corePrimary, 0.4);
        this.coreMat.emissive.lerp(pal.coreEmissive, 0.4);
      }
      if (this.particleMat) {
        this.particleMat.color.lerp(pal.particles, 0.4);
      }
      if (this.pointLight) {
        this.pointLight.color.lerp(pal.light, 0.4);
      }
      if (this.rings) {
        this.rings.forEach(r => r.material.color.lerp(pal.rings, 0.4));
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

      // Skip render if element is hidden or scrolled off screen
      if (document.hidden || !this.container.isConnected) return;

      const delta = this.clock.getDelta();
      const time = this.clock.getElapsedTime();
      const pal = STATE_PALETTES[this.state] || STATE_PALETTES.idle;

      // Audio smooth lerp
      this.audioLevel += (this.targetAudioLevel - this.audioLevel) * 0.2;
      this.targetAudioLevel *= 0.94; // Decay

      const effectiveSpeed = pal.speed * (1.0 + this.audioLevel * 1.5);

      // 1. Core mesh deformation with noise & audio
      if (this.coreMesh && this.coreGeomOriginalPos) {
        const pos = this.coreMesh.geometry.attributes.position;
        const orig = this.coreGeomOriginalPos;
        const count = pos.count;
        const pulse = 1.0 + Math.sin(time * 2.2 * effectiveSpeed) * pal.scalePulse + (this.audioLevel * 0.35);

        for (let i = 0; i < count; i++) {
          const ox = orig.getX(i);
          const oy = orig.getY(i);
          const oz = orig.getZ(i);

          const wave = Math.sin(ox * 0.08 + time * 3.5 * effectiveSpeed)
                     * Math.cos(oy * 0.08 + time * 2.8 * effectiveSpeed)
                     * Math.sin(oz * 0.08 + time * 3.1 * effectiveSpeed);

          const displacement = 1.0 + wave * 0.12 * (1.0 + this.audioLevel * 1.2);
          pos.setXYZ(i, ox * pulse * displacement, oy * pulse * displacement, oz * pulse * displacement);
        }
        pos.needsUpdate = true;

        this.coreMesh.rotation.y += 0.008 * effectiveSpeed;
        this.coreMesh.rotation.x += 0.004 * effectiveSpeed;
      }

      // 2. Inner nucleus rotation
      if (this.nucMesh) {
        this.nucMesh.rotation.y -= 0.015 * effectiveSpeed;
        this.nucMesh.rotation.z += 0.012 * effectiveSpeed;
        const nucScale = 1.0 + this.audioLevel * 0.45;
        this.nucMesh.scale.set(nucScale, nucScale, nucScale);
      }

      // 3. Rings rotation
      if (this.rings) {
        this.rings.forEach((r, idx) => {
          r.rotation.z += 0.012 * r.userData.speed * effectiveSpeed;
          r.rotation.y += 0.006 * r.userData.speed * effectiveSpeed;
          const ringPulse = 1.0 + Math.sin(time * 3 + idx) * 0.04 + this.audioLevel * 0.15;
          r.scale.set(ringPulse, ringPulse, ringPulse);
        });
      }

      // 4. Particle cloud orbiting & swirling
      if (this.particleSystem && this.particleGeom) {
        const pPos = this.particleGeom.attributes.position;
        const pCount = pPos.count;

        for (let i = 0; i < pCount; i++) {
          const vel = this.particleVelocities[i];
          let x = pPos.getX(i);
          let y = pPos.getY(i);
          let z = pPos.getZ(i);

          // Orbit around Y axis
          const cos = Math.cos(vel.thetaSpeed * effectiveSpeed);
          const sin = Math.sin(vel.thetaSpeed * effectiveSpeed);
          const nx = x * cos - z * sin;
          const nz = x * sin + z * cos;
          x = nx;
          z = nz;

          // Gentle breathing displacement
          const r = Math.sqrt(x * x + y * y + z * z);
          if (r > 0.001) {
            const desiredR = vel.baseDist + Math.sin(time * 2 + i) * 6 + (this.audioLevel * 25);
            const scale = desiredR / r;
            x *= scale;
            y *= scale;
            z *= scale;
          }

          pPos.setXYZ(i, x, y, z);
        }
        pPos.needsUpdate = true;
        this.particleSystem.rotation.y += 0.002 * effectiveSpeed;
      }

      // 5. Parallax tilt interpolation
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

  // Global registry and mount helper
  window.AkiraQuantumOrb = {
    instances: new Map(),

    mount(container, options = {}) {
      if (typeof container === "string") {
        container = document.querySelector(container);
      }
      if (!container) return null;

      // Clean existing instance
      if (this.instances.has(container)) {
        this.instances.get(container).destroy();
        this.instances.delete(container);
      }

      const instance = new QuantumOrbInstance(container, options);
      this.instances.set(container, instance);
      return instance;
    },

    setGlobalState(stateName) {
      this.instances.forEach(inst => inst.setState(stateName));
    },

    setGlobalAudio(level) {
      this.instances.forEach(inst => inst.setAudioLevel(level));
    },

    // Bridge with existing AkiraEntity slots
    mountAll(root = document) {
      const slots = root.querySelectorAll("[data-akira-entity], .akira-entity-slot");
      slots.forEach(slot => {
        const size = parseInt(slot.dataset.size || "120", 10);
        // Only mount 3D on medium/large slots (>= 60px) or hero to preserve mobile GPU
        if (size >= 60 || slot.classList.contains("akira-ref-orb") || slot.id === "akiraLiveOrbStage") {
          this.mount(slot, {
            size: size,
            state: slot.dataset.state || "idle",
            enableRings: size > 150,
            enableParticles: size > 100
          });
        }
      });
    }
  };

  // Intercept AkiraEntity if already present
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

  // Auto-mount on DOM ready and section navigation
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      window.AkiraQuantumOrb.mountAll();
    }, 400);
  });
  window.addEventListener("akira:section-shown", (e) => {
    if (e && e.detail && e.detail.section === "home") {
      setTimeout(() => {
        window.AkiraQuantumOrb.mountAll();
      }, 120);
    }
  });

  console.log("[AkiraQuantumOrb] Quantum 3D Core initialized successfully.");
})();
