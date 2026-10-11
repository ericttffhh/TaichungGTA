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
  constructor(scene, spawnX, spawnZ) {
    this.scene = scene;
    this.position = new THREE.Vector3(spawnX, 0.4, spawnZ);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.yaw = 0;
    this.speed = 0;
    this.maxSpeed = 26; // 約 94 km/h
    this.health = 100;
    this.isDead = false;

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

    if (distToPlayer > 300) {
      // 距離過遠，自動跳近重新包抄攔截
      const behindAngle = Math.random() * Math.PI * 2;
      this.position.set(playerPos.x + Math.sin(behindAngle) * 70, 0.4, playerPos.z + Math.cos(behindAngle) * 70);
      this.speed = 10;
      return;
    }

    // 計算目標轉向偏角
    const targetYaw = Math.atan2(dx, dz);
    let diffYaw = targetYaw - this.yaw;
    while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
    while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;

    this.yaw += diffYaw * Math.min(1.0, 3.2 * dt);

    // 追逐加速控制
    if (distToPlayer > 8) {
      this.speed = Math.min(this.maxSpeed, this.speed + 14 * dt);
    } else {
      // PIT 包抄近身撞擊衝刺
      this.speed = Math.min(this.maxSpeed * 1.15, this.speed + 22 * dt);
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
// ============================================================================
export class GtaGameplayManager {
  constructor(app) {
    this.app = app;
    this.audio = soundManager;

    // 通緝星級 (0~5 星)
    this.wantedStars = 0;
    this.wantedCooldown = 0; // 脫離警車視線冷卻時間
    this.lastOffenseTime = 0;

    // 金幣與懸賞
    this.cash = 88888;

    // 警車管理
    this.policeCruisers = [];
    this.policeSpawnCooldown = 0;

    // 子彈軌跡與特效
    this.bullets = [];

    // 當前街頭任務
    this.currentMission = null;
    this.missionTimer = 0;

    // 喇叭與警笛狀態
    this.isSirenActive = false;

    // 預設經典任務列表
    this.missionCatalog = [
      {
        id: 'mission_station_courier',
        title: '📦【台中車站緊急急件】',
        desc: '在 50 秒內急速奔馳抵達台中火車站！',
        targetX: -5.0,
        targetZ: 125.5,
        targetName: '臺中火車站',
        timeLimit: 50,
        reward: 6000
      },
      {
        id: 'mission_hotel_vip',
        title: '💼【李方艾美機密公文】',
        desc: '將急件在 45 秒內護送至李方艾美酒店！',
        targetX: -196.3,
        targetZ: 136.0,
        targetName: '李方艾美酒店',
        timeLimit: 45,
        reward: 8000
      },
      {
        id: 'mission_mrt_rush',
        title: '🏎️【亞洲大飯店極速接送】',
        desc: '在 40 秒內衝往亞洲大飯店！',
        targetX: -172.7,
        targetZ: -89.0,
        targetName: '亞洲大飯店',
        timeLimit: 40,
        reward: 7500
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
  }

  // 增加/設定通緝星級
  addWanted(stars = 1) {
    this.wantedStars = Math.min(5, this.wantedStars + stars);
    this.wantedCooldown = 12.0; // 12 秒內避開警車可消星
    this.updateWantedUI();

    this.app.showToast(`🚨 通緝星級上升至 ${this.wantedStars} 星！警網全面攔截！`);
  }

  // 完全消除通緝
  clearWanted() {
    this.wantedStars = 0;
    this.wantedCooldown = 0;
    soundManager.setPoliceSiren(false);
    this.updateWantedUI();

    // 遣散警車
    this.policeCruisers.forEach((p) => p.dispose());
    this.policeCruisers = [];
    this.app.showToast('✅ 成功甩開警方！通緝已撤銷。');
  }

  // 更新通緝星級 HUD 與螢幕紅邊警示特效
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

    // ★ 通緝螢幕閃爍紅邊警示特效 (無聲音，僅亮紅邊)
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
  }

  // 車窗鳴槍 (Drive-by Shooting) [J] 鍵
  shootGun() {
    this.audio.playGunshot();

    const carPos = this.app.vehicle.body.position;
    const carYaw = this.app.vehicle.currentYaw;

    // 車頭正向
    const fwdX = Math.sin(carYaw);
    const fwdZ = Math.cos(carYaw);

    // 建立 3D 子彈光束 (Tracer Beam)
    const tracerGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -3.5)
    ]);
    const tracerMat = new THREE.LineBasicMaterial({ color: 0xfff000, linewidth: 3 });
    const tracerLine = new THREE.Line(tracerGeom, tracerMat);

    tracerLine.position.set(carPos.x + fwdX * 2.2, carPos.y + 0.4, carPos.z + fwdZ * 2.2);
    tracerLine.rotation.y = carYaw;
    this.app.scene.add(tracerLine);

    this.bullets.push({
      mesh: tracerLine,
      pos: new THREE.Vector3(tracerLine.position.x, tracerLine.position.y, tracerLine.position.z),
      dir: new THREE.Vector3(fwdX, 0, fwdZ),
      speed: 180, // 180 m/s
      life: 0.6 // 壽命 0.6 秒
    });

    // 違規鳴槍吸引警察關注 (觸發 1 星通緝)
    if (this.wantedStars === 0) {
      this.addWanted(1);
    }
  }

  // 觸發或領取街頭任務 [Q] 鍵
  triggerMission() {
    if (this.currentMission) {
      this.app.showToast(`⚠️ 目前已有進行中的任務：${this.currentMission.title}`);
      return;
    }

    const mission = this.missionCatalog[this.missionIndex % this.missionCatalog.length];
    this.missionIndex++;

    this.currentMission = mission;
    this.missionTimer = mission.timeLimit;

    if (mission.targetType === 'survive_wanted') {
      this.addWanted(mission.requiredStars || 3);
      this.app.showToast(`🎯 接取任務：${mission.title}（倒數 ${mission.timeLimit} 秒）`);
    } else {
      // 鎖定 GPS 導航至任務目標
      this.app.gpsTarget = {
        x: mission.targetX,
        z: mission.targetZ,
        name: mission.targetName
      };
      const hint = document.getElementById('gps-target-hint');
      if (hint) hint.classList.remove('hidden');
      const targetNameEl = document.getElementById('gps-target-name');
      if (targetNameEl) targetNameEl.textContent = mission.targetName;

      soundManager.playMissionStart();
      this.app.showToast(`🎯 接取任務：${mission.title}！已設定 GPS 導航`);
    }
  }

  // 任務成功結算
  completeMission() {
    if (!this.currentMission) return;
    const reward = this.currentMission.reward || 5000;
    const title = this.currentMission.title;

    this.addCash(reward);
    soundManager.playMissionSuccess();
    this.app.showToast(`🎉 任務完成！獲得賞金 +$${reward.toLocaleString()}！`);

    // 清除任務與 GPS 導航
    this.currentMission = null;
    this.app.gpsTarget = null;
    document.getElementById('gps-target-hint')?.classList.add('hidden');
  }

  // 鳴喇叭 / 切換警笛 [H] 鍵
  triggerHorn() {
    if (this.app.vehicle.type === 'police') {
      this.isSirenActive = !this.isSirenActive;
      soundManager.setPoliceSiren(this.isSirenActive);
      this.app.showToast(this.isSirenActive ? '🚨 警笛長鳴開啟！' : '🔇 警笛關閉');
    } else {
      soundManager.playHorn(this.app.vehicle?.type || 'scooter');
      this.app.showToast('📢 叭叭！');
    }
  }

  // 每幀更新循環
  update(dt) {
    const playerPos = this.app.vehicle?.body?.position;
    if (!playerPos) return;

    // 1. 子彈彈道更新與命中判定
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
          const killed = cop.takeDamage(45);
          this.audio.playCrash();
          if (killed) {
            this.addCash(1500);
            this.app.showToast('💥 擊毀臺中巡邏警車！獲得懸賞 +$1,500');
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

    // 2. 警車生成與追捕巡邏
    const desiredCops = Math.min(3, this.wantedStars);
    this.policeSpawnCooldown -= dt;

    if (this.policeCruisers.length < desiredCops && this.policeSpawnCooldown <= 0) {
      this.policeSpawnCooldown = 3.5;
      // 在玩家後方 60 米處生成警車
      const angle = (this.app.vehicle.currentYaw || 0) + Math.PI + (Math.random() - 0.5) * 0.8;
      const spawnX = playerPos.x + Math.sin(angle) * 60;
      const spawnZ = playerPos.z + Math.cos(angle) * 60;

      const newCop = new PoliceCruiserAI(this.app.scene, spawnX, spawnZ);
      this.policeCruisers.push(newCop);
    }

    // 3. 更新所有追逐警車 AI
    for (let i = this.policeCruisers.length - 1; i >= 0; i--) {
      const cop = this.policeCruisers[i];
      if (cop.isDead) continue;

      cop.update(dt, playerPos, this.app.vehicle.body.velocity, () => {
        // 撞擊玩家
        this.audio.playCrash();
        this.app.vehicle.health = Math.max(0, (this.app.vehicle.health || 100) - 8);
        const hpBar = document.getElementById('health-bar');
        if (hpBar) hpBar.style.width = `${this.app.vehicle.health}%`;
        this.app.showToast('💥 遭到臺中警車 PIT 包抄撞擊！HP 受到損耗');

        if (this.app.vehicle.health <= 0) {
          this.app.showToast('💀 車輛徹底毀損！已原地緊急吊掛維修');
          this.app.vehicle.resetPosition();
          this.app.vehicle.health = 100;
          if (hpBar) hpBar.style.width = '100%';
          this.clearWanted();
        }
      });
    }

    // 4. 通緝消退冷卻檢測 (遠離警車 100 米以上時星級慢慢消除)
    if (this.wantedStars > 0) {
      const nearestCopDist = this.policeCruisers.reduce((min, c) => {
        if (c.isDead) return min;
        return Math.min(min, c.position.distanceTo(playerPos));
      }, Infinity);

      if (nearestCopDist > 75) {
        this.wantedCooldown -= dt;
        // 星級閃爍提示
        if (Math.floor(this.wantedCooldown * 3) % 2 === 0) {
          this.updateWantedUI();
        }
        if (this.wantedCooldown <= 0) {
          this.wantedStars--;
          this.wantedCooldown = 8.0;
          this.updateWantedUI();
          if (this.wantedStars === 0) {
            this.clearWanted();
          } else {
            this.app.showToast(`📉 甩開部分警力！通緝降至 ${this.wantedStars} 星`);
          }
        }
      } else {
        this.wantedCooldown = 12.0; // 再次被發現，重設冷卻
      }
    }

    // 5. 街頭任務進度與倒數
    if (this.currentMission) {
      this.missionTimer -= dt;

      // 檢查目標抵達判定
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
