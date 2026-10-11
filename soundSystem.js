/**
 * 《臺中狂飆 · TAICHUNG RUSH》
 * 全方位開放世界 Web Audio 擬真音效與配樂合成系統 (SoundSystem)
 * 
 * 核心模組架構：
 * 1. 載具動態引擎音效合成器 (勁戰 125 怠速與拉轉、狂飆超跑 V10 咆嘯、警車巡邏引擎、計程車順暢巡航)
 * 2. 氮氣噴射音 (Nitro Boost) 與排氣管回火放炮 (Backfire / Pop)
 * 3. 瀝青輪胎抓地力慘叫與飄移煞車聲 (Tire Screech & Drift)
 * 4. Cannon-es 剛體撞擊與金屬板金擠壓物理碰撞聲 (Collision & Crash)
 * 5. 台中經典機車/汽車雙音喇叭 (Horn) 與警車雙頻警笛 (Police Siren)
 * 6. 車窗開火射擊 (Drive-by Gunshot) 與跳彈流彈音 (Ricochet)
 * 7. GTA 經典星級通緝重音 (Wanted Stinger) 與通緝撤銷 (Wanted Cleared)
 * 8. 吃茶葉蛋補血 (Eat Tea Egg) 與收銀機金幣噴灑 (Cash Cha-Ching)
 * 9. 街頭懸賞任務音效 (Mission Start, Success Fanfare, Fail Wah-wah)
 * 10. 道路時空傳送光束 (Teleport Warp)、更換載具發動點火 (Vehicle Switch)、車輛翻正 (Reset Flip)
 * 11. Google Maps 大地圖與 GPS 導航路徑語音叮咚 (Map Radar, GPS Route, Checkpoint Arrival)
 * 12. 臺中車載多頻道 FM 電台 (Synthwave 狂飆、綠川夜曲 Lo-Fi、經典台語) 與城市氛圍環境底噪
 */

export class SoundSystem {
  constructor() {
    this.ctx = null;
    this.isUnlocked = false;

    // 音量總線
    this.masterGain = null;
    this.sfxGain = null;
    this.engineGain = null;
    this.radioGain = null;
    this.ambientGain = null;

    // 引擎合成器狀態
    this.engineOscSub = null;
    this.engineOscMain = null;
    this.engineFilter = null;
    this.engineVol = null;
    this.currentEngineType = null;
    this.isEngineRunning = false;
    this.lastRPM = 60;
    this.lastSpeed = 0;
    this.lastBackfireTime = 0;

    // 氮氣音效
    this.boostNoise = null;
    this.boostGain = null;
    this.boostFilter = null;
    this.isBoostPlaying = false;

    // 甩尾輪胎摩擦音
    this.skidNoise = null;
    this.skidGain = null;
    this.skidFilter = null;
    this.isSkidPlaying = false;

    // 警車警笛
    this.sirenOsc = null;
    this.sirenLfo = null;
    this.sirenGain = null;
    this.isSirenPlaying = false;

    // 車載 FM 電台 (支援真實在線電台串流與高音量合成器)
    this.radioPlaying = false;
    this.radioStationIdx = 0;
    this.liveAudio = null;
    this.hlsInstance = null;
    this.radioStations = [
      {
        id: 'pbs_tc',
        name: '警察廣播電臺 臺中分臺 FM 94.5 (實況路況交通網)',
        freq: 'FM 94.5',
        type: 'hls',
        url: 'https://stream.pbs.gov.tw/live/TCS/playlist.m3u8',
        tag: '🔴 LIVE 實況'
      },
      {
        id: 'icrt',
        name: 'ICRT 臺中 FM 100.7 (國際熱門流行音樂網)',
        freq: 'FM 100.7',
        type: 'stream',
        url: 'https://n27a-eu.rcs.revma.com/nkdfurztxp3vv',
        tag: '🔴 LIVE 實況'
      },
      {
        id: 'classical',
        name: 'Classical 古典音樂台 FM 97.7 (臺中經典音樂)',
        freq: 'FM 97.7',
        type: 'stream',
        url: 'https://stream.zeno.fm/w66d3dp6ynhvv',
        tag: '🔴 LIVE 實況'
      },
      {
        id: 'lofi_live',
        name: '栗子 24/7 舒眠輕音樂 (Lo-Fi Chill Beats)',
        freq: 'FM 92.0',
        type: 'stream',
        url: 'https://lizeradio.com/radio/stream',
        tag: '🔴 LIVE 實況'
      },
      {
        id: 'synth_rock',
        name: 'FM 98.7 臺中搖滾狂飆 (Synthwave Drive)',
        freq: 'FM 98.7',
        type: 'synth',
        bpm: 124,
        scale: [130.81, 146.83, 155.56, 174.61, 196.00, 207.65, 233.08],
        tag: '⚡ SYNTH 電子'
      },
      {
        id: 'chill_synth',
        name: 'FM 102.5 綠川午夜 Lo-Fi (Night Chill)',
        freq: 'FM 102.5',
        type: 'synth',
        bpm: 84,
        scale: [174.61, 196.00, 220.00, 261.63, 293.66, 329.63, 392.00],
        tag: '⚡ SYNTH 電子'
      }
    ];
    this.radioTimer = null;
    this.radioStep = 0;

    // 城市環境底噪
    this.ambientSource = null;

    // 撞擊防抖冷卻
    this.lastCrashTime = 0;

    // 綁定全域點擊解鎖 Web Audio Context
    this.setupUnlockListeners();
  }

  // ==========================================================================
  // 1. 初始化與瀏覽器手勢解鎖 (AudioContext Unlock)
  // ==========================================================================
  setupUnlockListeners() {
    const unlockHandler = () => {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          this.isUnlocked = true;
        });
      } else if (this.ctx) {
        this.isUnlocked = true;
      }
    };

    window.addEventListener('click', unlockHandler, { once: false });
    window.addEventListener('keydown', unlockHandler, { once: false });
    window.addEventListener('touchstart', unlockHandler, { once: false });
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();

    // 建立總線 Gain 結構
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // SFX 特效音量
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.9, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    // 引擎音量 (適度混音避免刺耳)
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.24, this.ctx.currentTime);
    this.engineGain.connect(this.masterGain);

    // 電台音樂音量 (提升至 0.85 飽滿清晰震撼音量)
    this.radioGain = this.ctx.createGain();
    this.radioGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
    this.radioGain.connect(this.masterGain);

    // 環境底噪
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    this.ambientGain.connect(this.masterGain);

    // 啟動背景環境風聲與城市微光底噪
    this.startAmbiance();
  }

  // ==========================================================================
  // 2. 擬真載具引擎動力合成器 (Procedural Engine Synthesizer)
  // ==========================================================================
  initEngineSynth(type = 'scooter') {
    this.init();
    if (!this.ctx) return;
    this.stopEngineSynth();

    this.currentEngineType = type;
    const now = this.ctx.currentTime;

    // 低頻重低音震動振盪器 (Sub-bass rumble)
    this.engineOscSub = this.ctx.createOscillator();
    this.engineOscSub.type = (type === 'scooter') ? 'sawtooth' : 'triangle';

    // 主引擎諧波振盪器 (Main cylinder combustion)
    this.engineOscMain = this.ctx.createOscillator();
    this.engineOscMain.type = (type === 'supercar') ? 'sawtooth' : (type === 'police' ? 'sawtooth' : 'square');

    // 引擎低通濾波器 (隨轉速開合，模擬排氣共鳴)
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.Q.setValueAtTime(type === 'supercar' ? 4.5 : 2.0, now);

    // 引擎音量包絡
    this.engineVol = this.ctx.createGain();
    this.engineVol.gain.setValueAtTime(0.08, now);

    // 連線節點
    this.engineOscSub.connect(this.engineFilter);
    this.engineOscMain.connect(this.engineFilter);
    this.engineFilter.connect(this.engineVol);
    this.engineVol.connect(this.engineGain);

    this.engineOscSub.start(now);
    this.engineOscMain.start(now);
    this.isEngineRunning = true;
  }

  updateEngine(type, speed, isAccel, isBraking, isBoost, dt) {
    if (!this.isEngineRunning || this.currentEngineType !== type) {
      this.initEngineSynth(type);
    }
    if (!this.ctx || !this.engineOscSub || !this.engineOscMain) return;

    const absSpd = Math.abs(speed);
    const now = this.ctx.currentTime;

    let baseFreq = 54;
    let maxFreq = 220;
    let filterBase = 220;
    let filterMax = 1800;

    if (type === 'scooter') {
      // 勁戰 125：單缸速克達 62Hz 怠速震顫，拉轉平滑高頻
      baseFreq = 62;
      maxFreq = 240;
      filterBase = 240;
      filterMax = 1200;
    } else if (type === 'supercar') {
      // 競技超跑：低沉 36Hz V10 怠速咆哮，高速可達 420Hz 高亢聲浪
      baseFreq = 36;
      maxFreq = 420;
      filterBase = 180;
      filterMax = 3200;
    } else if (type === 'police') {
      // 警車：美式 V8 巡邏車厚實轟鳴
      baseFreq = 44;
      maxFreq = 320;
      filterBase = 200;
      filterMax = 2200;
    } else if (type === 'taxi') {
      // 計程車：轎車 48Hz 順暢綿密巡航
      baseFreq = 48;
      maxFreq = 280;
      filterBase = 210;
      filterMax = 1600;
    }

    // 計算目標 RPM 與頻率 (加速時大幅提升，倒車與放油門時滑行降轉)
    const speedRatio = Math.min(1.0, absSpd / 140);
    let targetFreq = baseFreq + (maxFreq - baseFreq) * Math.pow(speedRatio, 0.85);

    if (isAccel) targetFreq += 28;
    if (isBoost) targetFreq *= 1.35;
    if (isBraking) targetFreq = Math.max(baseFreq, targetFreq * 0.82);

    this.lastRPM += (targetFreq - this.lastRPM) * Math.min(1.0, 14.0 * dt);

    // 平滑調整振盪頻率與低通濾波截頻
    this.engineOscSub.frequency.setTargetAtTime(this.lastRPM, now, 0.04);
    this.engineOscMain.frequency.setTargetAtTime(this.lastRPM * (type === 'supercar' ? 1.5 : 2.0), now, 0.04);

    const targetCutoff = filterBase + (filterMax - filterBase) * (speedRatio * 0.75 + (isAccel ? 0.25 : 0));
    this.engineFilter.frequency.setTargetAtTime(Math.min(4800, targetCutoff), now, 0.05);

    // 音量動態包絡 (加油門加大聲浪，停等紅燈低調怠速)
    let vol = isAccel ? 0.32 : (absSpd > 2 ? 0.18 : 0.08);
    if (isBoost) vol = 0.45;
    this.engineVol.gain.setTargetAtTime(vol, now, 0.05);

    // 檢測是否急放油門放炮 (Backfire Pop)
    if (this.lastSpeed > 55 && !isAccel && (this.lastSpeed - absSpd > 5)) {
      if (performance.now() - this.lastBackfireTime > 1200) {
        this.playBackfire();
        this.lastBackfireTime = performance.now();
      }
    }
    this.lastSpeed = absSpd;
  }

  stopEngineSynth() {
    if (!this.ctx) return;
    try {
      if (this.engineOscSub) this.engineOscSub.stop();
      if (this.engineOscMain) this.engineOscMain.stop();
      if (this.engineOscSub) this.engineOscSub.disconnect();
      if (this.engineOscMain) this.engineOscMain.disconnect();
    } catch (e) {}
    this.engineOscSub = null;
    this.engineOscMain = null;
    this.isEngineRunning = false;
  }

  // 排氣管放炮回火聲 (Exhaust Backfire Pop)
  playBackfire() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const count = Math.random() > 0.5 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const delay = i * 0.12;
      const noise = this.ctx.createBufferSource();
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.08, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let j = 0; j < buf.length; j++) data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (buf.length * 0.25));
      noise.buffer = buf;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, now + delay);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.08);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      noise.start(now + delay);
    }
  }

  // ==========================================================================
  // 3. 氮氣噴射音 (Nitro Boost) & 輪胎甩尾摩擦聲 (Drift Screech)
  // ==========================================================================
  setBoost(active) {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (active && !this.isBoostPlaying) {
      this.isBoostPlaying = true;
      // 白噪音氣流噴射
      const bufferSize = this.ctx.sampleRate * 1.5;
      const buf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      this.boostNoise = this.ctx.createBufferSource();
      this.boostNoise.buffer = buf;
      this.boostNoise.loop = true;

      this.boostFilter = this.ctx.createBiquadFilter();
      this.boostFilter.type = 'bandpass';
      this.boostFilter.frequency.setValueAtTime(1400, now);
      this.boostFilter.Q.setValueAtTime(3.0, now);

      this.boostGain = this.ctx.createGain();
      this.boostGain.gain.setValueAtTime(0.01, now);
      this.boostGain.gain.linearRampToValueAtTime(0.38, now + 0.15);

      this.boostNoise.connect(this.boostFilter);
      this.boostFilter.connect(this.boostGain);
      this.boostGain.connect(this.sfxGain);

      this.boostNoise.start(now);
    } else if (!active && this.isBoostPlaying) {
      this.isBoostPlaying = false;
      if (this.boostGain) {
        this.boostGain.gain.setValueAtTime(this.boostGain.gain.value, now);
        this.boostGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        setTimeout(() => {
          try {
            if (this.boostNoise) this.boostNoise.stop();
            if (this.boostNoise) this.boostNoise.disconnect();
          } catch (e) {}
          this.boostNoise = null;
        }, 220);
      }
      // 氮氣關閉時的洩壓閥氣音 (Blow-off)
      this.playBlowOff();
    }
  }

  playBlowOff() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.2, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < buf.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (buf.length * 0.3));
    noise.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2600, now);
    filter.frequency.exponentialRampToValueAtTime(1200, now + 0.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
  }

  setDrift(active, intensity = 1.0) {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (active && !this.isSkidPlaying) {
      this.isSkidPlaying = true;
      const bufSize = this.ctx.sampleRate * 1.0;
      const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

      this.skidNoise = this.ctx.createBufferSource();
      this.skidNoise.buffer = buf;
      this.skidNoise.loop = true;

      this.skidFilter = this.ctx.createBiquadFilter();
      this.skidFilter.type = 'bandpass';
      this.skidFilter.frequency.setValueAtTime(850, now);
      this.skidFilter.Q.setValueAtTime(4.2, now);

      this.skidGain = this.ctx.createGain();
      this.skidGain.gain.setValueAtTime(0.01, now);
      this.skidGain.gain.linearRampToValueAtTime(Math.min(0.28, 0.22 * intensity), now + 0.08);

      this.skidNoise.connect(this.skidFilter);
      this.skidFilter.connect(this.skidGain);
      this.skidGain.connect(this.sfxGain);
      this.skidNoise.start(now);
    } else if (active && this.isSkidPlaying) {
      if (this.skidGain) {
        this.skidGain.gain.setTargetAtTime(Math.min(0.28, 0.22 * intensity), now, 0.05);
      }
    } else if (!active && this.isSkidPlaying) {
      this.isSkidPlaying = false;
      if (this.skidGain) {
        this.skidGain.gain.setValueAtTime(this.skidGain.gain.value, now);
        this.skidGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        setTimeout(() => {
          try {
            if (this.skidNoise) this.skidNoise.stop();
            if (this.skidNoise) this.skidNoise.disconnect();
          } catch (e) {}
          this.skidNoise = null;
        }, 140);
      }
    }
  }

  // ==========================================================================
  // 4. 剛體物理碰撞與撞擊音效 (Cannon-es Impact & Crash)
  // ==========================================================================
  playCrash(intensity = 1.0) {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (performance.now() - this.lastCrashTime < 180) return; // 防短時間重複爆音
    this.lastCrashTime = performance.now();

    const clampIntensity = Math.min(2.5, Math.max(0.3, intensity));

    // 1. 低頻金屬重擊低音 (Sub-bass metal punch)
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(130 * clampIntensity, now);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.28);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(Math.min(0.65, 0.45 * clampIntensity), now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now);
    subOsc.stop(now + 0.28);

    // 2. 金屬板金變形刮擦白噪音 (Metallic crumple)
    const bufSize = this.ctx.sampleRate * 0.22;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.4));

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(520, now);
    filter.Q.setValueAtTime(2.2, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4 * clampIntensity, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);
  }

  // ==========================================================================
  // 5. 車輛喇叭 (Horn) 與警車警笛 (Police Siren)
  // ==========================================================================
  playHorn(vehType = 'scooter') {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (vehType === 'scooter') {
      // 經典台灣速克達「嗶嗶」喇叭 (雙音高頻方波)
      [587.33, 622.25].forEach(freq => {
        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1600, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.28);
      });
    } else {
      // 汽車/超跑/計程車雙音黃銅和弦喇叭 (370Hz + 440Hz)
      [370, 440].forEach(freq => {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.38);
      });
    }
  }

  setPoliceSiren(active) {
    this.init();
    if (!this.ctx) return;

    if (active && !this.isSirenPlaying) {
      this.isSirenPlaying = true;
      const now = this.ctx.currentTime;

      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'sawtooth';
      this.sirenOsc.frequency.setValueAtTime(850, now);

      // LFO 調變 (週期 1.25 秒頻率在 700Hz ~ 1250Hz 往復)
      this.sirenLfo = this.ctx.createOscillator();
      this.sirenLfo.frequency.setValueAtTime(1.15, now);

      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(280, now);
      this.sirenLfo.connect(this.sirenOsc.frequency);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, now);

      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.setValueAtTime(0.2, now);

      this.sirenOsc.connect(filter);
      filter.connect(this.sirenGain);
      this.sirenGain.connect(this.sfxGain);

      this.sirenLfo.start(now);
      this.sirenOsc.start(now);
    } else if (!active && this.isSirenPlaying) {
      this.isSirenPlaying = false;
      try {
        if (this.sirenOsc) this.sirenOsc.stop();
        if (this.sirenLfo) this.sirenLfo.stop();
        if (this.sirenOsc) this.sirenOsc.disconnect();
      } catch (e) {}
      this.sirenOsc = null;
      this.sirenLfo = null;
    }
  }

  // ==========================================================================
  // 6. 槍械與戰鬥音效 (Gunshot & Ricochet)
  // ==========================================================================
  playGunshot() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. 白噪音槍口瞬態爆震 (Transient muzzle explosion)
    const bufSize = this.ctx.sampleRate * 0.16;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.18));

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.frequency.exponentialRampToValueAtTime(140, now + 0.16);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);

    // 2. 次低頻開火後座力衝擊波 (Sub-bass thump)
    const kick = this.ctx.createOscillator();
    kick.type = 'sine';
    kick.frequency.setValueAtTime(160, now);
    kick.frequency.exponentialRampToValueAtTime(38, now + 0.14);

    const kickGain = this.ctx.createGain();
    kickGain.gain.setValueAtTime(0.7, now);
    kickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

    kick.connect(kickGain);
    kickGain.connect(this.sfxGain);
    kick.start(now);
    kick.stop(now + 0.14);

    // 30% 機率伴隨跳彈流彈尖嘯
    if (Math.random() > 0.65) {
      setTimeout(() => this.playRicochet(), 60);
    }
  }

  playRicochet() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400 + Math.random() * 800, now);
    osc.frequency.exponentialRampToValueAtTime(600 + Math.random() * 200, now + 0.18);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  // ==========================================================================
  // 7. GTA 核心玩法互動音效 (Wanted, Cash, Mission, Eat Egg)
  // ==========================================================================

  // 通緝星級上升 (依需求停用聲音，僅保留螢幕亮紅邊特效)
  playWantedStarUp(level = 1) {
    // 依需求關閉通緝音效
  }

  // 通緝消除 (依需求停用聲音)
  playWantedCleared() {
    // 依需求關閉通緝消除音效
  }


  // 吃茶葉蛋補血 (Eat Tea Egg) - 咬碎聲 + 治癒上升和弦
  playEatEgg() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. 咬碎脆口聲 (Bite crunch)
    const bufSize = this.ctx.sampleRate * 0.1;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.2));

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const nFilter = this.ctx.createBiquadFilter();
    nFilter.type = 'highpass';
    nFilter.frequency.setValueAtTime(1200, now);
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.28, now);
    nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    noise.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(this.sfxGain);
    noise.start(now);

    // 2. 治癒琶音 (C5, E5, G5, C6)
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + 0.08 + idx * 0.07);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.22, now + 0.08 + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08 + idx * 0.07 + 0.28);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + 0.08 + idx * 0.07);
      osc.stop(now + 0.08 + idx * 0.07 + 0.28);
    });
  }

  // 獲得獎金收銀機「叮鈴鏗鏘」 (Cash Cha-Ching)
  playCashChime() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 鈴鐺升音 (B5 -> E6)
    [987.77, 1318.51].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.28, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.35);
    });

    // 金幣鏗鏘散落金屬聲
    [1600, 2200, 3100].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + 0.12 + idx * 0.04);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, now + 0.12 + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12 + idx * 0.04 + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + 0.12 + idx * 0.04);
      osc.stop(now + 0.12 + idx * 0.04 + 0.18);
    });
  }

  // 接取街頭任務 (Mission Accepted)
  playMissionStart() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 戰術鼓點衝擊 + 呼叫器雙音
    [329.63, 440.0, 587.33].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now + idx * 0.09);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.2, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.09 + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.22);
    });
  }

  // 任務成功凱旋樂 (Mission Success Fanfare)
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
      gain.gain.setValueAtTime(0.32, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.12 + 0.45);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.45);
    });
  }

  // ==========================================================================
  // 8. 傳送、載具切換與 UI 音效 (Teleport, Vehicle Switch, UI)
  // ==========================================================================

  // 時空傳送光束 (Teleport Warp Whoosh)
  playTeleport() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 上升再急墜之蟲洞掃頻 (Cosmic warp sweep)
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(2800, now + 0.22);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.5);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.setValueAtTime(4.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.42, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  // 切換載具：點火發動與關門聲 (Vehicle Switch Ignition & Door Slam)
  playVehicleSwitch() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 起步馬達短促點火 (Starter crank)
    for (let i = 0; i < 3; i++) {
      const delay = i * 0.07;
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(80, now + delay);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.18, now + delay);
      g.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.05);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + delay);
      osc.stop(now + delay + 0.05);
    }

    // 厚實車門關門聲 (Heavy Door Slam)
    const slam = this.ctx.createOscillator();
    slam.type = 'sawtooth';
    slam.frequency.setValueAtTime(110, now + 0.24);
    slam.frequency.exponentialRampToValueAtTime(35, now + 0.45);
    const slamG = this.ctx.createGain();
    slamG.gain.setValueAtTime(0.35, now + 0.24);
    slamG.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
    slam.connect(slamG);
    slamG.connect(this.sfxGain);
    slam.start(now + 0.24);
    slam.stop(now + 0.45);
  }

  // 車輛翻正 (Reset / Flip)
  playResetFlip() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  // Google Maps 大地圖開關 (Map Hologram Toggle)
  playMapToggle(isOpen) {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    if (isOpen) {
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
    } else {
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(350, now + 0.12);
    }

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  // GPS 導航路線設定 (GPS Path Set Chime)
  playGPSRoute() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    [659.25, 880.0].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.24, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.25);
    });
  }

  // 抵達導航目的地 (Destination Arrival)
  playGPSArrival() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    [523.25, 659.25, 1046.5].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.28, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.35);
    });
  }

  // 輕巧按鈕點擊音 (Tactile UI Click)
  playUIClick() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(750, now);
    osc.frequency.exponentialRampToValueAtTime(350, now + 0.04);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  // ==========================================================================
  // 9. 車載多頻道 FM 電台合成器 (Taiwanese In-Car Radio FM Synthesizer)
  // ==========================================================================
  toggleRadio() {
    this.init();
    if (!this.ctx) return false;

    if (!this.radioPlaying) {
      this.radioPlaying = true;
      this.startRadioTrack();
      return true;
    } else {
      this.radioPlaying = false;
      this.stopRadioTrack();
      return false;
    }
  }

  nextStation() {
    this.init();
    if (!this.ctx) return null;
    this.radioStationIdx = (this.radioStationIdx + 1) % this.radioStations.length;
    if (this.radioPlaying) {
      this.stopRadioTrack();
      this.startRadioTrack();
    }
    return this.radioStations[this.radioStationIdx];
  }

  getCurrentStation() {
    return this.radioStations[this.radioStationIdx];
  }

  startRadioTrack() {
    this.stopRadioTrack();
    const station = this.radioStations[this.radioStationIdx];
    if (!station) return;

    if (station.url) {
      if (!this.liveAudio) {
        this.liveAudio = new Audio();
        this.liveAudio.crossOrigin = 'anonymous';
      }
      this.liveAudio.volume = 1.0;

      if (station.type === 'hls') {
        if (typeof window !== 'undefined' && window.Hls && window.Hls.isSupported()) {
          if (this.hlsInstance) {
            this.hlsInstance.destroy();
          }
          this.hlsInstance = new window.Hls();
          this.hlsInstance.loadSource(station.url);
          this.hlsInstance.attachMedia(this.liveAudio);
          this.hlsInstance.on(window.Hls.Events.MANIFEST_PARSED, () => {
            this.liveAudio.play().catch(() => this.startProceduralSynth(station));
          });
          this.hlsInstance.on(window.Hls.Events.ERROR, (event, data) => {
            if (data && data.fatal) {
              console.warn('[Radio] HLS stream error, fallback to synth:', data);
              this.startProceduralSynth(station);
            }
          });
          return;
        } else if (this.liveAudio.canPlayType('application/vnd.apple.mpegurl')) {
          this.liveAudio.src = station.url;
          this.liveAudio.play().catch(() => this.startProceduralSynth(station));
          return;
        }
      } else {
        this.liveAudio.src = station.url;
        this.liveAudio.play().catch(() => this.startProceduralSynth(station));
        return;
      }
    }

    // 預設或合成頻道播放
    this.startProceduralSynth(station);
  }

  startProceduralSynth(station) {
    if (this.radioTimer) clearInterval(this.radioTimer);
    if (!station || !station.scale) {
      station = this.radioStations.find(s => s.type === 'synth') || this.radioStations[4];
    }
    const bpm = station.bpm || 120;
    const intervalMs = (60 / bpm) * 1000 * 0.5; // 8分音符步進

    this.radioStep = 0;
    this.radioTimer = setInterval(() => {
      if (!this.radioPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;
      const step = this.radioStep++;

      // 貝斯底線 (Bassline) - 音量提升至 0.45
      if (step % 2 === 0) {
        const bassNote = station.scale[(step / 2) % station.scale.length] * 0.5;
        const bOsc = this.ctx.createOscillator();
        bOsc.type = 'sawtooth';
        bOsc.frequency.setValueAtTime(bassNote, now);

        const bFilter = this.ctx.createBiquadFilter();
        bFilter.type = 'lowpass';
        bFilter.frequency.setValueAtTime(420, now);

        const bGain = this.ctx.createGain();
        bGain.gain.setValueAtTime(0.45, now);
        bGain.gain.exponentialRampToValueAtTime(0.01, now + (intervalMs / 1000) * 1.8);

        bOsc.connect(bFilter);
        bFilter.connect(bGain);
        bGain.connect(this.radioGain);

        bOsc.start(now);
        bOsc.stop(now + (intervalMs / 1000) * 1.8);
      }

      // 主旋律合成器 (Melody lead) - 音量提升至 0.35
      if (step % 3 === 0 || step % 7 === 0) {
        const melNote = station.scale[(step * 2) % station.scale.length] * 2;
        const mOsc = this.ctx.createOscillator();
        mOsc.type = 'triangle';
        mOsc.frequency.setValueAtTime(melNote, now);

        const mGain = this.ctx.createGain();
        mGain.gain.setValueAtTime(0.35, now);
        mGain.gain.exponentialRampToValueAtTime(0.001, now + (intervalMs / 1000) * 1.2);

        mOsc.connect(mGain);
        mGain.connect(this.radioGain);

        mOsc.start(now);
        mOsc.stop(now + (intervalMs / 1000) * 1.2);
      }
    }, intervalMs);
  }

  stopRadioTrack() {
    if (this.liveAudio) {
      this.liveAudio.pause();
      this.liveAudio.removeAttribute('src');
      this.liveAudio.load();
    }
    if (this.hlsInstance) {
      this.hlsInstance.destroy();
      this.hlsInstance = null;
    }
    if (this.radioTimer) {
      clearInterval(this.radioTimer);
      this.radioTimer = null;
    }
  }

  // ==========================================================================
  // 10. 城市環境氛圍底噪 (City Street Ambiance)
  // ==========================================================================
  startAmbiance() {
    if (this.ambientSource || !this.ctx) return;
    const bufSize = this.ctx.sampleRate * 2.5;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    // 粉紅微風噪聲
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      d[i] = (b0 + b1 + b2) * 0.08;
    }

    this.ambientSource = this.ctx.createBufferSource();
    this.ambientSource.buffer = buf;
    this.ambientSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, this.ctx.currentTime);

    this.ambientSource.connect(filter);
    filter.connect(this.ambientGain);
    this.ambientSource.start();
  }
}

// 建立全域單例模式，方便全專案各模組呼叫
export const soundManager = new SoundSystem();
window.soundManager = soundManager;
