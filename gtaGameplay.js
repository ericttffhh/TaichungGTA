/**
 * GTA 開放世界核心玩法系統 (GtaGameplayManager)
 * 1. Web Audio 擬真音效合成引擎 (無須外部音檔，支援槍聲、警笛、車喇叭、金幣與撞擊)
 * 2. 通緝星級系統 (Wanted Level 1~5 星，具備追緝與冷卻消星機制)
 * 3. 臺中市警察局巡邏警車 AI 追擊與 PIT 戰術包抄
 * 4. 車窗鳴槍驅離 (Drive-by Shooting) [J] 鍵 / 彈道光束與槍口火花
 * 5. 街頭懸賞與快遞任務系統 (Street Missions) [Q] 鍵
 * 6. 車輛喇叭與警用警笛系統 (Horn & Siren) [H] 鍵
 */

import * as THREE from 'three';
import { soundManager } from './soundSystem.js';

// ============================================================================
// 1. Web Audio 擬真音效合成引擎 (GtaAudioSynth)
// ============================================================================
export class GtaAudioSynth {
  constructor() {
    this.ctx = null;
    this.sirenOsc1 = null;
    this.sirenOsc2 = null;
    this.sirenGain = null;
    this.isSirenPlaying = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // 槍聲 (白噪音瞬態 + 低通濾波包絡)
  playGunshot() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 白噪音緩衝區
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + 0.15);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(1.0, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 0.15);
  }

  // 警車警笛 (雙頻交替調變 FM Siren)
  setSiren(active) {
    this.init();
    if (!this.ctx) return;

    if (active && !this.isSirenPlaying) {
      this.isSirenPlaying = true;
      const now = this.ctx.currentTime;

      this.sirenOsc1 = this.ctx.createOscillator();
      this.sirenOsc1.type = 'sawtooth';

      // 頻率 LFO 調變 (700Hz ~ 1100Hz 週期 1.2 秒)
      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(1.2, now);

      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(250, now);

      this.sirenOsc1.frequency.setValueAtTime(850, now);
      lfo.connect(this.sirenOsc1.frequency);

      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.setValueAtTime(0.18, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, now);

      this.sirenOsc1.connect(filter);
      filter.connect(this.sirenGain);
      this.sirenGain.connect(this.ctx.destination);

      lfo.start(now);
      this.sirenOsc1.start(now);
      this.sirenLfo = lfo;
    } else if (!active && this.isSirenPlaying) {
      this.isSirenPlaying = false;
      try {
        if (this.sirenOsc1) this.sirenOsc1.stop();
        if (this.sirenLfo) this.sirenLfo.stop();
        if (this.sirenOsc1) this.sirenOsc1.disconnect();
      } catch (e) {}
      this.sirenOsc1 = null;
      this.sirenLfo = null;
    }
  }

  // 車輛喇叭 (雙音調 440Hz + 370Hz)
  playHorn() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    [370, 440].forEach((freq) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    });
  }

  // 金幣 / 懸賞獎金結算音效 (雙音升階叮咚)
  playCashChime() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    [987.77, 1318.51].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.2, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.3);
    });
  }

  // 任務成功凱旋音效 (4 音和弦琶音)
  playMissionSuccess() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.28, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.12 + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.45);
    });
  }

  // 撞擊金屬聲
  playCrash() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }
}

// ============================================================================
// 2. 臺中市警察局 巡邏警車 AI 追擊實體 (PoliceCruiserAI)
// ============================================================================
class PoliceCruiserAI {
  constructor(scene, spawnX, spawnZ, maxSpeed = 26) {
    this.scene = scene;
    this.position = new THREE.Vector3(spawnX, 0.4, spawnZ);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.yaw = 0;
    this.speed = 0;
    this.maxSpeed = maxSpeed;
    this.health = 100;
    this.isDead = false;
    this.arrestTimer = 0;

    this.meshGroup = new THREE.Group();
    this.buildModel();
    this.meshGroup.position.copy(this.position);
    this.scene.add(this.meshGroup);
  }

  buildModel() {
    // 臺中市政府警察局 黑白配色巡邏車
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.35, metalness: 0.2 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.35 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.1, metalness: 0.8 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.8 });

    // 車身下盤
    const lower = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 4.4), bodyMat);
    lower.position.y = 0.45;
    this.meshGroup.add(lower);

    // 白色側門與車頂
    const whiteDoor = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.52, 2.2), whiteMat);
    whiteDoor.position.set(0, 0.46, 0.1);
    this.meshGroup.add(whiteDoor);

    // 車頂駕駛艙
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.52, 2.1), glassMat);
    cabin.position.set(0, 0.95, -0.1);
    this.meshGroup.add(cabin);

    // 白色車頂蓋
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 1.8), whiteMat);
    roof.position.set(0, 1.23, -0.1);
    this.meshGroup.add(roof);

    // 紅藍 LED 爆閃長條警燈 (Strobe Lightbar)
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.25), bodyMat);
    barBase.position.set(0, 1.3, -0.1);
    this.meshGroup.add(barBase);

    this.redLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.1, 0.2),
      new THREE.MeshBasicMaterial({ color: 0xff0022 })
    );
    this.redLight.position.set(-0.3, 1.36, -0.1);
    this.meshGroup.add(this.redLight);

    this.blueLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.1, 0.2),
      new THREE.MeshBasicMaterial({ color: 0x0066ff })
    );
    this.blueLight.position.set(0.3, 1.36, -0.1);
    this.meshGroup.add(this.blueLight);

    // 4 個輪胎
    const wheelGeom = new THREE.CylinderGeometry(0.34, 0.34, 0.26, 12);
    [
      [-0.95, 0.34, 1.35],
      [0.95, 0.34, 1.35],
      [-0.95, 0.34, -1.35],
      [0.95, 0.34, -1.35]
    ].forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wheelGeom, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      this.meshGroup.add(wheel);
    });
  }

  update(dt, playerPos, playerVel, onRamPlayer) {
    if (this.isDead) return;

    // 警燈交替閃爍 (8 Hz)
    const flashState = Math.floor(performance.now() / 120) % 2 === 0;
    this.redLight.material.color.setHex(flashState ? 0xff0033 : 0x330006);
    this.blueLight.material.color.setHex(!flashState ? 0x0088ff : 0x001133);

    // 計算往玩家的向量
    const dx = playerPos.x - this.position.x;
    const dz = playerPos.z - this.position.z;
    const distToPlayer = Math.hypot(dx, dz);

    // 距離超過 150 米直接宣告跟丟並標記銷毀，絕不瞬移作弊！
    if (distToPlayer > 150) {
      this.isDead = true;
      this.dispose();
      return;
    }

    // 計算目標轉向偏角 (警車轉向有物理慣性，玩家拐彎進巷弄能甩開)
    const targetYaw = Math.atan2(dx, dz);
    let diffYaw = targetYaw - this.yaw;
    while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
    while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;

    this.yaw += diffYaw * Math.min(1.0, 2.2 * dt);

    // 追逐速度：一般追逐最高時速約 80 km/h，玩家全速或超跑/氮氣能明確拉開距離
    if (distToPlayer > 8) {
      this.speed = Math.min(22, this.speed + 12 * dt);
    } else {
      // 近身包抄衝刺
      this.speed = Math.min(25, this.speed + 16 * dt);
    }

    this.position.x += Math.sin(this.yaw) * this.speed * dt;
    this.position.z += Math.cos(this.yaw) * this.speed * dt;

    this.meshGroup.position.copy(this.position);
    this.meshGroup.rotation.y = this.yaw;

    // 與玩家車身碰撞判定 (PIT 戰術撞擊)
    if (distToPlayer < 2.8) {
      onRamPlayer(this);
      // 警車自身稍微反彈
      this.position.x -= Math.sin(this.yaw) * 1.5;
      this.position.z -= Math.cos(this.yaw) * 1.5;
      this.speed *= 0.4;
    }
  }

  takeDamage(amt) {
    this.health -= amt;
    if (this.health <= 0 && !this.isDead) {
      this.isDead = true;
      this.meshGroup.rotation.z = 0.5; // 側翻毀損
      this.meshGroup.position.y = 0.2;
      return true; // 擊毀
    }
    return false;
  }

  dispose() {
    this.scene.remove(this.meshGroup);
  }
}

// ============================================================================
// 3. GTA 開放世界核心玩法管理系統 (GtaGameplayManager)
// 包含：多元兼職副業(計程車/美食外送/警網追緝/極速計時)、測速照相機、
// 特技跳台、8處台中城市文創寶藏探索、地下改裝工坊
// ============================================================================
export class GtaGameplayManager {
  constructor(app) {
    this.app = app;
    this.audio = soundManager;

    // 通緝星級 (0~5 星)
    this.wantedStars = 0;
    this.wantedCooldown = 0;
    this.lastOffenseTime = 0;

    // 金幣與懸賞
    this.cash = 88888;

    // 警車管理
    this.policeCruisers = [];
    this.policeSpawnCooldown = 0;

    // 子彈軌跡與特效
    this.bullets = [];

    // 當前任務或副業
    this.currentMission = null;
    this.missionTimer = 0;

    // 喇叭與警笛狀態
    this.isSirenActive = false;

    // 改裝工坊升級數值
    this.upgrades = {
      nitro: 0,
      armor: 0,
      gun: 0,
      egg: 0
    };

    // 收集品狀態
    this.collectibles = [];
    this.collectedCount = 0;

    // 測速照相桿列表
    this.speedTraps = [];

    // 特技跳台列表
    this.stuntRamps = [];

    // 特技飛行計時
    this.airTime = 0;
    this.isAirborne = false;

    // 預設經典任務列表
    this.missionCatalog = [
      {
        id: 'mission_station_courier',
        title: '📦【台中車站緊急急件】',
        desc: '在 50 秒內急速奔馳抵達台中火車站！',
        targetX: 75.0,
        targetZ: 0.0,
        targetName: '臺中火車站',
        timeLimit: 50,
        reward: 6000
      },
      {
        id: 'mission_hotel_vip',
        title: '💼【李方艾美機密公文】',
        desc: '將急件在 45 秒內護送至李方艾美酒店！',
        targetX: 55.0,
        targetZ: 95.0,
        targetName: '李方艾美酒店',
        timeLimit: 45,
        reward: 8000
      },
      {
        id: 'mission_miyahara',
        title: '🍨【宮原眼科冰品極速特送】',
        desc: '在 45 秒內衝往綠川旁的宮原眼科！',
        targetX: -12.0,
        targetZ: 48.0,
        targetName: '宮原眼科',
        timeLimit: 45,
        reward: 7000
      },
      {
        id: 'mission_park_pavilion',
        title: '🌳【台中公園湖心亭特快車】',
        desc: '在 55 秒內全速抵達百年古蹟湖心亭！',
        targetX: -75.0,
        targetZ: -210.0,
        targetName: '台中公園湖心亭',
        timeLimit: 55,
        reward: 9000
      },
      {
        id: 'mission_escape_cops',
        title: '🚨【中區警網大逃殺】',
        desc: '在 3 星通緝追捕下生存並成功甩開警方！',
        targetType: 'survive_wanted',
        requiredStars: 3,
        timeLimit: 55,
        reward: 15000
      }
    ];

    this.missionIndex = 0;
    this.updateWantedUI();
    this.updateCashUI();

    // 初始化地圖互動元素：寶藏箱、測速照相桿、特技跳台
    this.setupWorldActivities();
    this.initWorkshopUI();
  }

  // 初始化世界地圖特殊活動
  setupWorldActivities() {
    const scene = this.app.scene;
    if (!scene) return;

    // 1. 設置 8 處【台中城市文創金幣寶藏 (City Treasures)】
    const treasureSpots = [
      { name: '臺中車站高架穹頂寶箱', x: 75, z: 15 },
      { name: '李方艾美旋轉飛碟金庫', x: 55, z: 110 },
      { name: '宮原眼科綠川水岸寶藏', x: -12, z: 62 },
      { name: '自由路太陽餅文化寶藏', x: -95, z: 32 },
      { name: '第二市場東泉辣醬寶箱', x: -195, z: 60 },
      { name: '台中公園湖心亭秘寶', x: -75, z: -195 },
      { name: '帝國製糖廠湧泉湖畔寶藏', x: 235, z: -130 },
      { name: 'LaLaport 購物商場頂樓寶箱', x: 210, z: -205 }
    ];

    treasureSpots.forEach((spot, idx) => {
      const g = new THREE.Group();
      // 金色旋轉發光寶箱主體
      const boxMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        roughness: 0.25,
        metalness: 0.85,
        emissive: 0xffa500,
        emissiveIntensity: 0.4
      });
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.9), boxMat);
      box.position.y = 0.8;
      g.add(box);

      // 箱頂裝飾金環
      const lid = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 8, 16), boxMat);
      lid.position.y = 1.35;
      g.add(lid);

      // 地面旋轉金色導引光圈
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffe066,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.8, 24), ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.08;
      g.add(ring);

      g.position.set(spot.x, 0, spot.z);
      scene.add(g);

      this.collectibles.push({
        id: idx,
        name: spot.name,
        mesh: g,
        pos: new THREE.Vector3(spot.x, 0.8, spot.z),
        collected: false
      });
    });

    // 2. 設置 4 處【極速測速照相機 (Speed Traps)】
    const trapSpots = [
      { name: '臺灣大道一段 (東向)', x: -60, z: 12, yaw: Math.PI / 2, limit: 70 },
      { name: '臺灣大道一段 (西向)', x: -210, z: -12, yaw: -Math.PI / 2, limit: 75 },
      { name: '建國路車站前', x: 42, z: -80, yaw: 0, limit: 65 },
      { name: '民權路老市府路口', x: -140, z: 142, yaw: Math.PI / 2, limit: 70 }
    ];

    trapSpots.forEach((ts) => {
      const g = new THREE.Group();
      // 照相金屬直柱
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x57606f, roughness: 0.4, metalness: 0.7 });
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 4.2, 12), poleMat);
      pole.position.y = 2.1;
      g.add(pole);

      // 黃黑斜紋反光基座
      const baseMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.3 });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 1.2, 12), baseMat);
      base.position.y = 0.6;
      g.add(base);

      // 照相鏡頭金屬箱體
      const boxMat = new THREE.MeshStandardMaterial({ color: 0x2f3542, roughness: 0.2 });
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.7), boxMat);
      box.position.y = 3.8;
      g.add(box);

      // 雙鏡頭 (測速鏡頭 + 高壓氙氣閃光燈)
      const lensMat = new THREE.MeshBasicMaterial({ color: 0x00d2d3 });
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.18, 16), lensMat);
      lens.position.set(0.2, 3.8, 0.36);
      g.add(lens);

      const strobeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const strobe = new THREE.Mesh(new THREE.CircleGeometry(0.14, 16), strobeMat);
      strobe.position.set(-0.2, 3.8, 0.36);
      g.add(strobe);

      g.position.set(ts.x, 0, ts.z);
      g.rotation.y = ts.yaw;
      scene.add(g);

      this.speedTraps.push({
        name: ts.name,
        pos: new THREE.Vector3(ts.x, 0, ts.z),
        limit: ts.limit,
        lastTriggerTime: 0
      });
    });

    // 3. 設置 2 處【街頭特技跳台 (Stunt Ramps)】
    const rampSpots = [
      { name: '臺灣大道極速跳台', x: -110, z: -1, yaw: -Math.PI / 2 },
      { name: '建國路車站前特技台', x: 48, z: 80, yaw: 0 }
    ];

    rampSpots.forEach((rs) => {
      const g = new THREE.Group();
      // 斜坡幾何體 (寬 5.5m, 長 6.5m, 高 1.8m)
      const rampGeom = new THREE.BoxGeometry(5.5, 0.4, 7.0);
      const rampMat = new THREE.MeshStandardMaterial({
        color: 0xe74c3c,
        roughness: 0.4,
        metalness: 0.3
      });
      const ramp = new THREE.Mesh(rampGeom, rampMat);
      ramp.rotation.x = -0.26;
      ramp.position.set(0, 0.9, 0);
      g.add(ramp);

      // 兩側安全反光條
      const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });
      [-2.6, 2.6].forEach((sx) => {
        const border = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.6, 7.0), stripeMat);
        border.rotation.x = -0.26;
        border.position.set(sx, 1.0, 0);
        g.add(border);
      });

      g.position.set(rs.x, 0, rs.z);
      g.rotation.y = rs.yaw;
      scene.add(g);

      this.stuntRamps.push({
        name: rs.name,
        pos: new THREE.Vector3(rs.x, 0, rs.z)
      });
    });
  }

  // 初始化改裝工坊彈窗操作
  initWorkshopUI() {
    const modal = document.getElementById('workshop-modal');
    const btnOpen = document.getElementById('btn-shop');
    const btnClose = document.getElementById('btn-close-workshop');

    const openWorkshop = () => {
      if (!modal) return;
      modal.classList.remove('hidden');
      this.updateWorkshopDisplay();
      if (document.exitPointerLock) document.exitPointerLock();
    };

    const closeWorkshop = () => {
      if (!modal) return;
      modal.classList.add('hidden');
    };

    btnOpen?.addEventListener('click', openWorkshop);
    btnClose?.addEventListener('click', closeWorkshop);

    // 快捷鍵 [U] 開關改裝工坊
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyU' || e.key === 'u' || e.key === 'U') {
        if (modal && !modal.classList.contains('hidden')) {
          closeWorkshop();
        } else {
          openWorkshop();
        }
      }
    });

    // 購買升級事件監聽
    document.querySelectorAll('.btn-upgrade-action').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const type = e.target.dataset.type;
        this.purchaseUpgrade(type);
      });
    });
  }

  // 更新工坊顯示數值與升級狀態
  updateWorkshopDisplay() {
    const cashEl = document.getElementById('shop-current-cash');
    if (cashEl) cashEl.textContent = `$${this.cash.toLocaleString()}`;

    const prices = {
      nitro: [12000, 25000, 50000],
      armor: [15000, 30000, 60000],
      gun: [20000, 45000, 80000],
      egg: [8000, 16000, 32000]
    };

    // 氮氣
    const lvlNitro = this.upgrades.nitro;
    const btnNitro = document.getElementById('btn-buy-nitro');
    const textNitro = document.getElementById('lvl-nitro');
    if (textNitro) textNitro.textContent = `Lv.${lvlNitro} ${lvlNitro >= 3 ? '(已達滿級)' : ''}`;
    if (btnNitro) {
      if (lvlNitro >= 3) {
        btnNitro.textContent = '已升至滿級';
        btnNitro.classList.add('maxed');
      } else {
        btnNitro.textContent = `升級 ($${prices.nitro[lvlNitro].toLocaleString()})`;
        btnNitro.classList.remove('maxed');
      }
    }

    // 裝甲
    const lvlArmor = this.upgrades.armor;
    const btnArmor = document.getElementById('btn-buy-armor');
    const textArmor = document.getElementById('lvl-armor');
    if (textArmor) textArmor.textContent = `Lv.${lvlArmor} ${lvlArmor >= 3 ? '(已達滿級)' : ''}`;
    if (btnArmor) {
      if (lvlArmor >= 3) {
        btnArmor.textContent = '已升至滿級';
        btnArmor.classList.add('maxed');
      } else {
        btnArmor.textContent = `升級 ($${prices.armor[lvlArmor].toLocaleString()})`;
        btnArmor.classList.remove('maxed');
      }
    }

    // 機槍
    const lvlGun = this.upgrades.gun;
    const btnGun = document.getElementById('btn-buy-gun');
    const textGun = document.getElementById('lvl-gun');
    if (textGun) textGun.textContent = `Lv.${lvlGun} ${lvlGun >= 2 ? '(雙管連發火網)' : ''}`;
    if (btnGun) {
      if (lvlGun >= 2) {
        btnGun.textContent = '已升至滿級';
        btnGun.classList.add('maxed');
      } else {
        btnGun.textContent = `升級 ($${prices.gun[lvlGun].toLocaleString()})`;
        btnGun.classList.remove('maxed');
      }
    }

    // 茶葉蛋
    const lvlEgg = this.upgrades.egg;
    const btnEgg = document.getElementById('btn-buy-egg');
    const textEgg = document.getElementById('lvl-egg');
    const cap = 3 + lvlEgg * 2;
    if (textEgg) textEgg.textContent = `Lv.${lvlEgg} (${cap} 顆上限)`;
    if (btnEgg) {
      if (lvlEgg >= 3) {
        btnEgg.textContent = '已升至滿級';
        btnEgg.classList.add('maxed');
      } else {
        btnEgg.textContent = `擴容 ($${prices.egg[lvlEgg].toLocaleString()})`;
        btnEgg.classList.remove('maxed');
      }
    }
  }

  // 購買強化工坊升級項目
  purchaseUpgrade(type) {
    const prices = {
      nitro: [12000, 25000, 50000],
      armor: [15000, 30000, 60000],
      gun: [20000, 45000, 80000],
      egg: [8000, 16000, 32000]
    };
    const maxLvls = { nitro: 3, armor: 3, gun: 2, egg: 3 };

    const curLvl = this.upgrades[type] || 0;
    if (curLvl >= maxLvls[type]) {
      this.app.showToast('✅ 此項目已達最高升級等級！');
      return;
    }

    const cost = prices[type][curLvl];
    if (this.cash < cost) {
      this.app.showToast(`❌ 現金不足！需要 $${cost.toLocaleString()}，請多接任務或探索寶藏！`);
      return;
    }

    this.cash -= cost;
    this.upgrades[type] = curLvl + 1;
    this.updateCashUI();
    this.updateWorkshopDisplay();
    this.audio.playCashChime();

    // 立即生效升級數值
    if (type === 'egg') {
      this.app.eggCount = Math.min(3 + this.upgrades.egg * 2, (this.app.eggCount || 3) + 2);
      const eggEl = document.getElementById('egg-count-val');
      if (eggEl) eggEl.textContent = `${this.app.eggCount} 顆`;
    }

    this.app.showToast(`🚀 強化成功！【${type.toUpperCase()}】已提升至 Lv.${this.upgrades[type]}`);
  }

  // 增加/設定通緝星級
  addWanted(stars = 1) {
    this.wantedStars = Math.min(5, this.wantedStars + stars);
    this.wantedCooldown = 12.0;
    this.policeSpawnCooldown = 0; // 重設冷卻，警網立即調派巡邏車！
    this.updateWantedUI();
    soundManager.setPoliceSiren(true);
    this.app.showToast(`🚨 通緝星級上升至 ${this.wantedStars} 星！警網全面出動追捕！`);
  }

  // ★ 遭警方逮捕 (BUSTED) 系統
  triggerBusted() {
    if (this.isBusted) return;
    this.isBusted = true;

    soundManager.playCrash(1.0);

    const bustedEl = document.getElementById('busted-overlay');
    if (bustedEl) {
      bustedEl.classList.remove('hidden');
      bustedEl.classList.add('active');
    }

    // 扣除交保與罰金
    const fine = Math.min(this.cash, Math.max(1500, Math.round(this.cash * 0.04) + this.wantedStars * 800));
    this.cash = Math.max(0, this.cash - fine);
    this.updateCashUI();

    // 消除通緝與警車
    this.clearWanted();
    this.policeCruisers.forEach((p) => p.dispose());
    this.policeCruisers = [];
    soundManager.setPoliceSiren(false);

    this.app.showToast(`👮 遭到臺中市政府警察局逮捕拘提 (BUSTED)！裁處交保罰金 -${fine.toLocaleString()}`);

    setTimeout(() => {
      if (bustedEl) {
        bustedEl.classList.remove('active');
        bustedEl.classList.add('hidden');
      }
      this.isBusted = false;

      // 移送獲釋：安全遣送至【臺灣大道一段】繁華市中心主幹道起點，杜絕傳入死角巷弄
      this.app.teleportToCoords(-160, 8, '臺灣大道一段 · 市中心主幹道');
      if (this.app.vehicle) this.app.vehicle.health = 100;
      const hpBar = document.getElementById('health-bar');
      if (hpBar) hpBar.style.width = '100%';
      this.app.showToast('🕊️ 已交保獲釋！已安全護送回【臺灣大道一段】，車輛已修復完成，請遵守交通法規！');
    }, 2800);
  }

  // 完全消除通緝
  clearWanted() {
    this.wantedStars = 0;
    this.wantedCooldown = 0;
    soundManager.setPoliceSiren(false);
    this.updateWantedUI();

    this.policeCruisers.forEach((p) => p.dispose());
    this.policeCruisers = [];
    this.app.showToast('✅ 成功甩開警方！通緝已撤銷。');
  }

  // 更新通緝星級 HUD
  updateWantedUI() {
    const starContainer = document.getElementById('wanted-stars');
    if (starContainer) {
      const stars = starContainer.querySelectorAll('.star');
      stars.forEach((s, idx) => {
        if (idx < this.wantedStars) {
          s.classList.add('active');
          s.style.color = this.wantedStars >= 4 ? '#e74c3c' : '#f1c40f';
        } else {
          s.classList.remove('active');
          s.style.color = 'rgba(255, 255, 255, 0.15)';
        }
      });
    }

    const redBorder = document.getElementById('wanted-red-border');
    if (redBorder) {
      if (this.wantedStars > 0) {
        redBorder.classList.add('active');
        if (this.wantedStars >= 4) {
          redBorder.classList.add('high-alert');
        } else {
          redBorder.classList.remove('high-alert');
        }
      } else {
        redBorder.classList.remove('active', 'high-alert');
      }
    }
  }

  // 增加獎金
  addCash(amt) {
    this.cash += amt;
    this.updateCashUI();
    this.audio.playCashChime();
  }

  updateCashUI() {
    const cashEl = document.getElementById('cash-val');
    if (cashEl) {
      cashEl.textContent = `$${this.cash.toLocaleString()}`;
    }
    const shopCashEl = document.getElementById('shop-current-cash');
    if (shopCashEl) {
      shopCashEl.textContent = `$${this.cash.toLocaleString()}`;
    }
  }

  // 車窗鳴槍 (Drive-by Shooting) [J] 鍵 (支援工坊多發衝鋒槍改裝)
  shootGun() {
    this.audio.playGunshot();

    const carPos = this.app.vehicle.body.position;
    const carYaw = this.app.vehicle.currentYaw;

    const fwdX = Math.sin(carYaw);
    const fwdZ = Math.cos(carYaw);

    const shotCount = 1 + this.upgrades.gun * 2; // Lv.0=1發, Lv.1=3發, Lv.2=5發

    for (let s = 0; s < shotCount; s++) {
      const spread = (s - (shotCount - 1) / 2) * 0.08;
      const angle = carYaw + spread;
      const dx = Math.sin(angle);
      const dz = Math.cos(angle);

      const tracerGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -3.5)
      ]);
      const tracerMat = new THREE.LineBasicMaterial({
        color: this.upgrades.gun > 0 ? 0xff4757 : 0xfff000,
        linewidth: 3
      });
      const tracerLine = new THREE.Line(tracerGeom, tracerMat);

      tracerLine.position.set(carPos.x + dx * 2.2, carPos.y + 0.4, carPos.z + dz * 2.2);
      tracerLine.rotation.y = angle;
      this.app.scene.add(tracerLine);

      this.bullets.push({
        mesh: tracerLine,
        pos: new THREE.Vector3(tracerLine.position.x, tracerLine.position.y, tracerLine.position.z),
        dir: new THREE.Vector3(dx, 0, dz),
        speed: 185,
        life: 0.65
      });
    }

    if (this.wantedStars === 0) {
      this.addWanted(1);
    }
  }

  // 觸發街頭副業或任務 [Q] 鍵 (智慧推薦副業)
  triggerMission() {
    if (this.currentMission) {
      this.app.showToast(`⚠️ 目前已有進行中的任務：${this.currentMission.title}`);
      return;
    }

    const vehType = this.app.vehicle?.type;

    // 1. 若開計程車：接送客人載客副業
    if (vehType === 'taxi') {
      const taxiDestinations = [
        { name: '宮原眼科冰品旗艦店', x: -12, z: 48, desc: '「司機！麻煩送我去宮原眼科買冰淇淋！」' },
        { name: '李方艾美金沙大樓', x: 55, z: 95, desc: '「運將大哥，我要趕去李方艾美開國際會議！」' },
        { name: '第二市場美食街', x: -195, z: 45, desc: '「少年仔，載我去第二市場吃老牌炒麵加東泉！」' },
        { name: '台中公園湖心亭', x: -75, z: -210, desc: '「去台中公園散步，麻煩開順一點謝謝！」' }
      ];
      const dest = taxiDestinations[Math.floor(Math.random() * taxiDestinations.length)];

      this.currentMission = {
        type: 'taxi_job',
        title: `🚕【計程車載客接送 · ${dest.name}】`,
        targetX: dest.x,
        targetZ: dest.z,
        targetName: dest.name,
        timeLimit: 50,
        reward: 5800
      };
      this.missionTimer = 50;

      this.setGps(dest.x, dest.z, dest.name);
      soundManager.playMissionStart();
      this.app.showToast(`🙋 載到乘客！${dest.desc}`);
      return;
    }

    // 2. 若騎機車：經典美食外送副業
    if (vehType === 'scooter') {
      const foodDeliveries = [
        { name: '繼光香香雞創始總店', x: -45, z: 25, item: '酥脆香香雞一份' },
        { name: '自由路太陽餅博物館', x: -95, z: 20, item: '現烤特產太陽餅禮盒' },
        { name: '第二市場老牌炒麵', x: -195, z: 45, item: '大碗炒麵加東泉辣醬' }
      ];
      const food = foodDeliveries[Math.floor(Math.random() * foodDeliveries.length)];

      this.currentMission = {
        type: 'food_delivery',
        title: `🛵【台中熊貓特快外送 · ${food.item}】`,
        targetX: food.x,
        targetZ: food.z,
        targetName: food.name,
        timeLimit: 45,
        reward: 5200
      };
      this.missionTimer = 45;

      this.setGps(food.x, food.z, food.name);
      soundManager.playMissionStart();
      this.app.showToast(`📦 接到外送訂單！火速送往：${food.name}（${food.item}）`);
      return;
    }

    // 3. 一般任務列表循環
    const mission = this.missionCatalog[this.missionIndex % this.missionCatalog.length];
    this.missionIndex++;

    this.currentMission = mission;
    this.missionTimer = mission.timeLimit;

    if (mission.targetType === 'survive_wanted') {
      this.addWanted(mission.requiredStars || 3);
      this.app.showToast(`🎯 接取任務：${mission.title}（倒數 ${mission.timeLimit} 秒）`);
    } else {
      this.setGps(mission.targetX, mission.targetZ, mission.targetName);
      soundManager.playMissionStart();
      this.app.showToast(`🎯 接取任務：${mission.title}！已設定 GPS 導航`);
    }
  }

  setGps(x, z, name) {
    this.app.gpsTarget = { x, z, name };
    const hint = document.getElementById('gps-target-hint');
    if (hint) hint.classList.remove('hidden');
    const targetNameEl = document.getElementById('gps-target-name');
    if (targetNameEl) targetNameEl.textContent = name;
  }

  // 任務成功結算
  completeMission() {
    if (!this.currentMission) return;
    const reward = this.currentMission.reward || 5000;
    const title = this.currentMission.title;

    this.addCash(reward);
    soundManager.playMissionSuccess();
    this.app.showToast(`🎉 ${title} 順利完成！獲得賞金 +$${reward.toLocaleString()}！`);

    this.currentMission = null;
    this.app.gpsTarget = null;
    document.getElementById('gps-target-hint')?.classList.add('hidden');
  }

  // 鳴喇叭 / 切換警笛 [H] 鍵
  triggerHorn() {
    if (this.app.vehicle?.type === 'police') {
      this.isSirenActive = !this.isSirenActive;
      soundManager.setPoliceSiren(this.isSirenActive);
      this.app.showToast(this.isSirenActive ? '🚨 警笛長鳴開啟！' : '🔇 警笛關閉');
    } else {
      soundManager.playHorn(this.app.vehicle?.type || 'scooter');
      this.app.showToast('📢 叭叭！');
    }
  }

  // 檢查寶藏拾取
  checkCollectibles(playerPos) {
    const time = performance.now() * 0.002;
    this.collectibles.forEach((item) => {
      if (item.collected) return;

      // 旋轉與微浮動動畫
      item.mesh.rotation.y = time * 1.5;
      item.mesh.position.y = Math.sin(time * 3) * 0.15;

      const dist = Math.hypot(playerPos.x - item.pos.x, playerPos.z - item.pos.z);
      if (dist < 3.2) {
        item.collected = true;
        this.app.scene.remove(item.mesh);
        this.collectedCount++;

        this.addCash(10000);
        soundManager.playMissionSuccess();

        const badgeEl = document.getElementById('collectibles-val');
        if (badgeEl) badgeEl.textContent = `${this.collectedCount}/8`;

        this.app.showToast(`🎁 找到台中秘寶：【${item.name}】！獲得豐厚賞金 +$10,000！(${this.collectedCount}/8)`);
      }
    });
  }

  // 檢查測速照相機
  checkSpeedTraps(playerPos, speed) {
    const now = performance.now();
    this.speedTraps.forEach((trap) => {
      if (now - trap.lastTriggerTime < 8000) return; // 8 秒冷卻

      const dist = Math.hypot(playerPos.x - trap.pos.x, playerPos.z - trap.pos.z);
      if (dist < 14 && speed > trap.limit) {
        trap.lastTriggerTime = now;

        // 快門白閃特效
        const flashOverlay = document.getElementById('speed-cam-flash');
        if (flashOverlay) {
          flashOverlay.classList.add('flashing');
          setTimeout(() => flashOverlay.classList.remove('flashing'), 200);
        }

        // 快門音效
        soundManager.playUIClick();

        // 速度評級
        let grade = 'B';
        let bonus = 1000;
        if (speed >= 125) {
          grade = 'S 極速傳說';
          bonus = 4500;
        } else if (speed >= 95) {
          grade = 'A 狂飆達人';
          bonus = 2500;
        }

        this.addCash(bonus);
        this.app.showToast(`📸【${trap.name} 測速照相】時速 ${Math.round(speed)} KM/H！評級：${grade}！獎金 +$${bonus.toLocaleString()}`);
      }
    });
  }

  // 檢查特技跳台與滯空判定
  checkStuntRamps(playerPos, dt) {
    if (this.app.playerMode !== 'vehicle') return;

    // 檢查是否衝過跳台觸發飛躍衝力
    this.stuntRamps.forEach((ramp) => {
      const dist = Math.hypot(playerPos.x - ramp.pos.x, playerPos.z - ramp.pos.z);
      if (dist < 4.5 && this.app.vehicle?.speed > 45 && this.app.vehicle.body.position.y < 2.0) {
        // 給予向上的特技彈跳衝力
        this.app.vehicle.body.velocity.y = 8.5;
        this.app.showToast('🚀 衝上特技跳台！空中特技展開！');
      }
    });

    // 滯空時間計算
    if (this.app.vehicle?.body?.position?.y > 1.2) {
      this.isAirborne = true;
      this.airTime += dt;
    } else if (this.isAirborne) {
      // 落地結算
      if (this.airTime > 0.8) {
        const bonus = Math.round(this.airTime * 2000);
        this.addCash(bonus);
        this.app.showToast(`🤸 特技落地！滯空 ${this.airTime.toFixed(1)} 秒！獲得特技獎勵 +$${bonus.toLocaleString()}`);
      }
      this.isAirborne = false;
      this.airTime = 0;
    }
  }

  // 每幀更新循環
  update(dt) {
    const playerPos = this.app.playerMode === 'vehicle'
      ? this.app.vehicle?.body?.position
      : this.app.character?.mesh?.position;

    if (!playerPos) return;

    // 1. 更新寶藏箱、測速照相桿與特技跳台
    this.checkCollectibles(playerPos);
    if (this.app.playerMode === 'vehicle' && this.app.vehicle) {
      this.checkSpeedTraps(playerPos, this.app.vehicle.speed || 0);
      this.checkStuntRamps(playerPos, dt);
    }

    // 2. 子彈彈道更新與命中判定
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life -= dt;
      b.pos.addScaledVector(b.dir, b.speed * dt);
      b.mesh.position.copy(b.pos);

      // 檢查是否命中追逐警車
      let hit = false;
      for (let pIdx = this.policeCruisers.length - 1; pIdx >= 0; pIdx--) {
        const cop = this.policeCruisers[pIdx];
        if (cop.isDead) continue;
        const dist = cop.position.distanceTo(b.pos);
        if (dist < 2.5) {
          hit = true;
          const killed = cop.takeDamage(50);
          this.audio.playCrash();
          if (killed) {
            this.addCash(2000);
            this.app.showToast('💥 擊毀臺中巡邏警車！獲得懸賞 +$2,000');
          }
          break;
        }
      }

      if (b.life <= 0 || hit) {
        this.app.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        b.mesh.material.dispose();
        this.bullets.splice(i, 1);
      }
    }

    // 3. 清理已陣亡或已徹底跟丟的警車
    this.policeCruisers = this.policeCruisers.filter(c => !c.isDead);

    const activeCops = this.policeCruisers.filter(c => !c.isDead);
    const nearestCopDist = activeCops.length > 0
      ? activeCops.reduce((min, c) => Math.min(min, c.position.distanceTo(playerPos)), Infinity)
      : Infinity;

    // 只有在【現場確實有警車】且【最近警車距離大於 65 米】時，才算正在甩開警方！
    const isEvading = activeCops.length > 0 && nearestCopDist > 65;

    // 目標警車數量 (1星: 1輛, 2星: 2輛, 3星: 3輛, 4-5星: 4輛)
    const desiredCops = Math.min(4, Math.max(1, this.wantedStars));
    this.policeSpawnCooldown -= dt;

    const playerSpeed = this.app.playerMode === 'vehicle'
      ? (this.app.vehicle?.speed || 0)
      : (this.app.character?.speed || 0);

    // 4. 警車生成邏輯：通緝中且警車未滿編
    if (this.wantedStars > 0 && this.policeCruisers.length < desiredCops && !this.isBusted) {
      // 若現場無警車立即出動；現場已有警車時若未被甩開且冷卻完畢則調派增援
      const shouldSpawn = activeCops.length === 0 || (!isEvading && this.policeSpawnCooldown <= 0);
      if (shouldSpawn) {
        this.policeSpawnCooldown = activeCops.length === 0 ? 0.6 : 6.5;

        const playerYaw = this.app.playerMode === 'vehicle'
          ? (this.app.vehicle?.currentYaw || 0)
          : (this.app.character?.yaw || 0);

        // 前方攔截 (60m) 或後方追擊 (-52m)
        const spawnAhead = Math.random() < 0.4 && activeCops.length > 0;
        const spawnDist = spawnAhead ? 60 : -52;
        const rawX = playerPos.x + Math.sin(playerYaw) * spawnDist + (Math.random() - 0.5) * 14;
        const rawZ = playerPos.z + Math.cos(playerYaw) * spawnDist + (Math.random() - 0.5) * 14;

        const roadPt = this.app.findNearestRoadPoint
          ? this.app.findNearestRoadPoint(rawX, rawZ, 120)
          : { x: rawX, z: rawZ, angle: playerYaw };

        const copSpeed = 23 + Math.min(8, this.wantedStars * 2);
        const newCop = new PoliceCruiserAI(this.app.scene, roadPt.x, roadPt.z, copSpeed);
        newCop.yaw = Math.atan2(playerPos.x - roadPt.x, playerPos.z - roadPt.z);
        this.policeCruisers.push(newCop);

        soundManager.setPoliceSiren(true);
        if (activeCops.length === 0) {
          this.app.showToast(`🚨 臺中市警局巡邏網出動！${this.wantedStars} 星警車展開包抄攔截！`);
        }
      }
    }

    if (this.wantedStars === 0 || this.policeCruisers.length === 0) {
      if (!this.isSirenActive) {
        soundManager.setPoliceSiren(false);
      }
    }

    // 5. 更新所有追逐警車 AI
    let maxArrestTimer = 0;
    for (let i = this.policeCruisers.length - 1; i >= 0; i--) {
      const cop = this.policeCruisers[i];
      if (cop.isDead) continue;

      cop.update(
        dt,
        playerPos,
        this.app.vehicle?.body?.velocity || new THREE.Vector3(),
        () => {
          this.audio.playCrash();
          const armorReduction = this.upgrades.armor * 2;
          const dmg = Math.max(3, 8 - armorReduction);
          this.app.vehicle.health = Math.max(0, (this.app.vehicle.health || 100) - dmg);
          const hpBar = document.getElementById('health-bar');
          if (hpBar) hpBar.style.width = `${this.app.vehicle.health}%`;
          this.app.showToast('💥 遭到臺中警車 PIT 包抄撞擊！');

          if (this.app.vehicle.health <= 0) {
            this.triggerBusted();
          }
        },
        () => {
          this.triggerBusted();
        },
        playerSpeed
      );

      if (cop.arrestTimer > maxArrestTimer) {
        maxArrestTimer = cop.arrestTimer;
      }
    }

    // 逮捕壓制倒數提示
    if (maxArrestTimer > 0.4 && !this.isBusted) {
      const pct = Math.min(100, Math.round((maxArrestTimer / 1.8) * 100));
      this.app.showToast(`⚠️ 遭警方貼身包圍壓制！立即突圍加速！(逮捕倒數 ${pct}%)`);
    }

    // 6. ★ GTA 經典甩開警方機制 (Evade & Lose Cops)
    if (this.wantedStars > 0) {
      if (isEvading) {
        // 警方已跟丟失去視線！進入逃脫倒數 (只需保持 5.5 秒)
        this.wantedCooldown -= dt;

        // 星星閃爍提示（GTA 經典視覺回饋）
        const isBlink = Math.floor(this.wantedCooldown * 4) % 2 === 0;
        const starContainer = document.getElementById('wanted-stars');
        if (starContainer) {
          const stars = starContainer.querySelectorAll('.star');
          stars.forEach((s, idx) => {
            if (idx < this.wantedStars) {
              s.style.opacity = isBlink ? '0.2' : '1.0';
            }
          });
        }

        // 倒數結束：成功降星或完全擺脫！
        if (this.wantedCooldown <= 0) {
          this.wantedStars--;
          this.wantedCooldown = 5.5;
          this.updateWantedUI();

          if (this.wantedStars <= 0) {
            this.clearWanted();
            this.addCash(2500);
            this.audio.playMissionSuccess();
            this.app.showToast('🎉 成功甩開臺中警方追捕！通緝已全面解除！獲得脫逃獎金 +$2,500');
          } else {
            this.app.showToast(`📉 成功甩開追緝！通緝降至 ${this.wantedStars} 星，繼續保持距離！`);
          }
        }
      } else {
        // 重新被警車近距離目擊，恢復正常星級顯示並重設倒數
        if (this.wantedCooldown < 5.0 && (!this._lastSpottedTime || performance.now() - this._lastSpottedTime > 3500)) {
          this._lastSpottedTime = performance.now();
          this.app.showToast('⚠️ 再次被警車發現！請加速拐彎甩開！');
        }
        this.wantedCooldown = 5.5;
        this.updateWantedUI();
      }
    }

    // 6. 街頭任務或兼職副業進度與倒數
    if (this.currentMission) {
      this.missionTimer -= dt;

      if (this.currentMission.targetType === 'survive_wanted') {
        if (this.wantedStars === 0) {
          this.completeMission();
        } else if (this.missionTimer <= 0) {
          this.app.showToast('❌ 任務失敗：未能於時限內甩開警方追捕！');
          this.currentMission = null;
        }
      } else {
        const dist = Math.hypot(
          playerPos.x - this.currentMission.targetX,
          playerPos.z - this.currentMission.targetZ
        );

        if (dist < 28) {
          this.completeMission();
        } else if (this.missionTimer <= 0) {
          this.app.showToast(`❌ 任務失敗：已超過時限！`);
          this.currentMission = null;
          this.app.gpsTarget = null;
          document.getElementById('gps-target-hint')?.classList.add('hidden');
        }
      }
    }
  }
}

