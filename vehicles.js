/**
 * 載具與音效物理系統 (VehicleSystem & AudioEngine)
 * 包含勁戰 125 壓車過彎動態、狂飆超跑、車底接觸陰影與 NPC 車流
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.osc1 = null;
    this.osc2 = null;
    this.gain = null;
    this.filter = null;
    this.radioGain = null;
    this.radioTimer = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    this.osc1 = this.ctx.createOscillator();
    this.osc2 = this.ctx.createOscillator();
    this.filter = this.ctx.createBiquadFilter();
    this.gain = this.ctx.createGain();

    this.osc1.type = 'sawtooth';
    this.osc2.type = 'triangle';
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(320, this.ctx.currentTime);
    this.gain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    this.osc1.connect(this.filter);
    this.osc2.connect(this.filter);
    this.filter.connect(this.gain);
    this.gain.connect(this.ctx.destination);

    this.osc1.start();
    this.osc2.start();

    this.radioGain = this.ctx.createGain();
    this.radioGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    this.radioGain.connect(this.ctx.destination);
    this.startRadio();
  }

  updateEngine(speed, isAccel, isScooter) {
    if (!this.ctx || !this.osc1) return;
    const absSpd = Math.abs(speed);
    const baseFreq = isScooter ? 70 : 44;
    const rpm = baseFreq + (absSpd * (isScooter ? 2.4 : 1.7)) + (isAccel ? 20 : 0);
    this.osc1.frequency.setTargetAtTime(rpm, this.ctx.currentTime, 0.05);
    this.osc2.frequency.setTargetAtTime(rpm * (isScooter ? 2.0 : 1.5), this.ctx.currentTime, 0.05);
    this.filter.frequency.setTargetAtTime(280 + absSpd * 18 + (isAccel ? 120 : 0), this.ctx.currentTime, 0.05);
    const vol = isAccel ? 0.12 : (absSpd > 1 ? 0.07 : 0.03);
    this.gain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.06);
  }

  playDrift() {
    if (!this.ctx) return;
    const noise = this.ctx.createBufferSource();
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.15, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < buf.length; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(800, this.ctx.currentTime);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.05, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    noise.connect(f);
    f.connect(g);
    g.connect(this.ctx.destination);
    noise.start();
  }

  startRadio() {
    if (!this.ctx) return;
    const melody = [261.63, 293.66, 329.63, 392.00, 440.00, 392.00, 329.63, 293.66];
    let step = 0;
    this.radioTimer = setInterval(() => {
      if (!STATE.radioPlaying || !this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = (step % 2 === 0) ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(melody[step % melody.length], this.ctx.currentTime);
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.24);
      osc.connect(gain);
      gain.connect(this.radioGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.24);
      step++;
    }, 280);
  }

  toggleRadio() {
    STATE.radioPlaying = !STATE.radioPlaying;
    const btn = document.getElementById('btn-radio');
    if (btn) btn.innerText = STATE.radioPlaying ? '📻 [R] 電台' : '📻 [R] 靜音';
  }
}

class VehicleSystem {
  constructor(scene) {
    this.scene = scene;
    this.playerVehicle = null;
    this.scooterMesh = null;
    this.carMesh = null;
    this.carWheels = [];
    this.scooterWheels = [];
    this.scooterBody = null;
    this.npcScooters = [];
    this.headlight = null;
    this.headlightTarget = null;
  }

  setupVehicles() {
    this.playerVehicle = new THREE.Group();

    // 1. 勁戰 125 經典機車
    this.scooterMesh = this.buildDetailedScooter();
    this.playerVehicle.add(this.scooterMesh);

    // 2. 狂飆 GT 超跑
    this.carMesh = this.buildSportCar();
    this.carMesh.visible = false;
    this.playerVehicle.add(this.carMesh);

    // 車頭聚光燈
    this.headlight = new THREE.SpotLight(0xffffff, 2.5, 65, Math.PI / 5, 0.4);
    this.headlight.position.set(0, 1.2, 1.6);
    this.headlightTarget = new THREE.Object3D();
    this.headlightTarget.position.set(0, 0, 28);
    this.playerVehicle.add(this.headlight);
    this.playerVehicle.add(this.headlightTarget);
    this.headlight.target = this.headlightTarget;

    // 地面大燈柔和光斑
    const glowTex = TextureFactory.createHeadlightGlowTexture();
    const hlGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 22),
      new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0.65, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    hlGlow.rotation.x = -Math.PI / 2;
    hlGlow.position.set(0, 0.04, 12);
    this.playerVehicle.add(hlGlow);

    // 玩家載具車底柔和接觸陰影 (Contact Shadow Decal)
    const shadowTex = TextureFactory.createContactShadowTexture();
    const vehShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 4.2),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.88, depthWrite: false })
    );
    vehShadow.rotation.x = -Math.PI / 2;
    vehShadow.position.set(0, 0.02, 0);
    this.playerVehicle.add(vehShadow);

    // 初始位置：置於台灣大道一段，面朝金沙大樓與台中車站 (0, 0, 50)
    this.playerVehicle.position.set(0, 0, 50);
    this.playerVehicle.rotation.y = Math.PI;
    this.scene.add(this.playerVehicle);

    return this.playerVehicle;
  }

  buildDetailedScooter() {
    const sc = new THREE.Group();
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x0984e3, roughness: 0.25, metalness: 0.6 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.8 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdcdde1, metalness: 0.95 });

    // 車體傾角本體
    this.scooterBody = new THREE.Group();
    sc.add(this.scooterBody);

    // 車頭斜板
    const frontShield = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.8, 0.65), blueMat);
    frontShield.position.set(0, 0.8, 0.65);
    this.scooterBody.add(frontShield);

    // 雙鷹眼大燈
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [-0.15, 0.15].forEach(x => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.05), hlMat);
      hl.position.set(x, 0.82, 0.98);
      this.scooterBody.add(hl);
    });

    // 腳踏板
    const deck = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.8), blackMat);
    deck.position.set(0, 0.42, 0.0);
    this.scooterBody.add(deck);

    // 車身座墊
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.22, 0.9), blackMat);
    seat.position.set(0, 0.72, -0.45);
    this.scooterBody.add(seat);

    // 車身兩側導流側蓋
    [-0.23, 0.23].forEach(x => {
      const flank = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.85), whiteMat);
      flank.position.set(x, 0.58, -0.42);
      this.scooterBody.add(flank);
    });

    // 龍頭手把
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.76, 8), chromeMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 1.15, 0.52);
    this.scooterBody.add(bar);

    // 後視鏡
    [-0.34, 0.34].forEach(x => {
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.02), blackMat);
      mirror.position.set(x, 1.25, 0.52);
      this.scooterBody.add(mirror);
    });

    // 排氣管
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.75, 8), chromeMat);
    pipe.rotation.x = Math.PI / 2 - 0.2;
    pipe.position.set(0.26, 0.35, -0.65);
    this.scooterBody.add(pipe);

    // 3D 騎士
    const rider = this.buildRider();
    this.scooterBody.add(rider);

    // 前後輪胎
    const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.14, 14);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

    const fWheel = new THREE.Mesh(wheelGeo, wheelMat);
    fWheel.position.set(0, 0.3, 0.88);
    sc.add(fWheel);

    const rWheel = new THREE.Mesh(wheelGeo, wheelMat);
    rWheel.position.set(0, 0.3, -0.75);
    sc.add(rWheel);

    this.scooterWheels = [fWheel, rWheel];
    return sc;
  }

  buildRider() {
    const r = new THREE.Group();
    const suitMat = new THREE.MeshStandardMaterial({ color: 0x222f3e, roughness: 0.5 });
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0xff4757, roughness: 0.2, metalness: 0.4 });
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x00d2d3, metalness: 0.9, roughness: 0.1 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.58, 0.26), suitMat);
    torso.position.set(0, 1.05, -0.22);
    torso.rotation.x = 0.25;
    r.add(torso);

    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), helmetMat);
    helmet.position.set(0, 1.45, -0.12);
    r.add(helmet);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.12), visorMat);
    visor.position.set(0, 1.45, -0.01);
    r.add(visor);

    return r;
  }

  buildSportCar() {
    const car = new THREE.Group();
    const redMat = new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.2, metalness: 0.7 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.9 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x2d3436 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 4.2), redMat);
    body.position.y = 0.55;
    car.add(body);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.48, 2.1), glassMat);
    cabin.position.set(0, 0.98, -0.2);
    car.add(cabin);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.35), blackMat);
    wing.position.set(0, 1.05, -1.9);
    car.add(wing);

    const wGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.24, 16);
    wGeo.rotateZ(Math.PI / 2);
    const wMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    this.carWheels = [];

    [[-0.95, 0.38, 1.3], [0.95, 0.38, 1.3], [-0.95, 0.38, -1.3], [0.95, 0.38, -1.3]].forEach(pos => {
      const w = new THREE.Mesh(wGeo, wMat);
      w.position.set(pos[0], pos[1], pos[2]);
      car.add(w);
      this.carWheels.push(w);
    });

    return car;
  }

  spawnNPCs() {
    const colors = [0xffffff, 0xe74c3c, 0xf1c40f, 0x1abc9c, 0x34495e];
    for (let i = 0; i < 14; i++) {
      const npc = this.buildDetailedScooter();
      npc.scale.set(0.85, 0.85, 0.85);

      const col = colors[i % colors.length];
      npc.traverse(n => {
        if (n.isMesh && n.material && n.material.color && n.material.color.getHex() === 0x0984e3) {
          n.material = new THREE.MeshStandardMaterial({ color: col, roughness: 0.3 });
        }
      });

      const dir = i % 2 === 0 ? 1 : -1;
      const xLane = (i % 2 === 0 ? 1 : -1) * (5 + (i % 3) * 3.5);
      const zPos = -220 + (i * 35);
      npc.position.set(xLane, 0, zPos);
      if (dir < 0) npc.rotation.y = Math.PI;

      this.scene.add(npc);
      this.npcScooters.push({ mesh: npc, dir: dir, speed: 20 + Math.random() * 22 });
    }
  }

  swapVehicle() {
    if (STATE.vehType === 'scooter') {
      STATE.vehType = 'car';
      this.scooterMesh.visible = false;
      this.carMesh.visible = true;
      document.getElementById('hud-veh-name').innerText = '狂飆 GT 超跑';
      document.getElementById('hud-veh-badge').querySelector('.veh-icon').innerText = '🚗';
    } else {
      STATE.vehType === 'scooter';
      STATE.vehType = 'scooter';
      this.scooterMesh.visible = true;
      this.carMesh.visible = false;
      document.getElementById('hud-veh-name').innerText = '勁戰 125 經典機車';
      document.getElementById('hud-veh-badge').querySelector('.veh-icon').innerText = '🛵';
    }
  }
}

window.AudioEngine = AudioEngine;
window.VehicleSystem = VehicleSystem;
window.audio = new AudioEngine();
