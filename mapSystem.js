/**
 * Google Maps 台中市區導航地圖系統 (GoogleMapSystem)
 * 嚴格對標 Google Maps 台中市區視角 (第二、四、五張圖)
 * 專注台中市區 (中區、西區、北區、南區、東區、西屯七期、北屯捷運)
 */

class GoogleMapSystem {
  constructor(canvas, playerVehicle) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.playerVehicle = playerVehicle;
    this.selectedPlace = null;
    this.currentFilter = 'all';

    this.initEvents();
  }

  initEvents() {
    this.resize();

    // 搜尋功能
    const searchInput = document.getElementById('gmaps-search-input');
    const searchBtn = document.getElementById('gmaps-search-btn');
    const handleSearch = () => {
      const q = (searchInput?.value || '').trim().toLowerCase();
      if (!q) return;
      const all = TAICHUNG_URBAN_POIS.concat(MRT_GREEN_LINE_DATA).concat(TRA_LINE_DATA);
      const hit = all.find(p => (p.name && p.name.toLowerCase().includes(q)) || (p.code && p.code.toLowerCase().includes(q)));
      if (hit) {
        this.openPlaceCard(hit);
        STATE.mapPanX = -hit.x;
        STATE.mapPanY = -hit.z;
        STATE.mapZoom = 1.4;
        this.render();
      } else {
        this.showToast(`🔍 找不到「${q}」，請搜尋市區地點或捷運站`);
      }
    };
    searchInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSearch(); });
    searchBtn?.addEventListener('click', handleSearch);

    // 分類 Chips
    document.querySelectorAll('.gmaps-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.gmaps-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.currentFilter = chip.dataset.filter || 'all';
        this.render();
      });
    });

    // 縮放與定位按鈕
    document.getElementById('map-zoom-in')?.addEventListener('click', () => {
      STATE.mapZoom = Math.min(3.2, STATE.mapZoom * 1.3);
      this.render();
    });
    document.getElementById('map-zoom-out')?.addEventListener('click', () => {
      STATE.mapZoom = Math.max(0.4, STATE.mapZoom * 0.77);
      this.render();
    });
    document.getElementById('map-center-player')?.addEventListener('click', () => {
      STATE.mapPanX = -this.playerVehicle.position.x;
      STATE.mapPanY = -this.playerVehicle.position.z;
      STATE.mapZoom = 1.3;
      this.render();
    });
    document.getElementById('map-reset-view')?.addEventListener('click', () => {
      STATE.mapPanX = 60;
      STATE.mapPanY = 40;
      STATE.mapZoom = 0.85;
      this.render();
    });

    // 地點卡片關閉與導航
    document.getElementById('btn-close-place-card')?.addEventListener('click', () => {
      document.getElementById('gmaps-place-card')?.classList.add('hidden');
      this.selectedPlace = null;
      this.render();
    });
    document.getElementById('place-nav-btn')?.addEventListener('click', () => {
      if (this.selectedPlace) {
        this.setGPS(this.selectedPlace.x, this.selectedPlace.z, this.selectedPlace.name);
      }
    });
    document.getElementById('place-teleport-btn')?.addEventListener('click', () => {
      if (this.selectedPlace) {
        window.taichungApp?.teleportToCoords(this.selectedPlace.x, this.selectedPlace.z, this.selectedPlace.name);
        document.getElementById('btn-close-map')?.click();
      }
    });
    document.getElementById('gmaps-route-btn')?.addEventListener('click', () => {
      if (this.selectedPlace) {
        this.setGPS(this.selectedPlace.x, this.selectedPlace.z, this.selectedPlace.name);
      } else {
        this.setGPS(75, 0, '台中車站');
      }
    });

    // 拖曳平移
    this.canvas.addEventListener('mousedown', (e) => {
      STATE.isDraggingMap = true;
      STATE.dragStartX = e.clientX;
      STATE.dragStartY = e.clientY;
    });
    window.addEventListener('mousemove', (e) => {
      if (!STATE.isDraggingMap || !STATE.isMapOpen) return;
      const dx = (e.clientX - STATE.dragStartX) / (STATE.mapZoom * 0.8);
      const dy = (e.clientY - STATE.dragStartY) / (STATE.mapZoom * 0.8);
      STATE.mapPanX += dx;
      STATE.mapPanY += dy;
      STATE.dragStartX = e.clientX;
      STATE.dragStartY = e.clientY;
      this.render();
    });
    window.addEventListener('mouseup', () => { STATE.isDraggingMap = false; });

    // 滾輪縮放
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      STATE.mapZoom = Math.min(3.5, Math.max(0.4, STATE.mapZoom * zoomFactor));
      this.render();
    }, { passive: false });

    // 點擊地圖選擇地點
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const cx = this.canvas.width / 2;
      const cy = this.canvas.height / 2;
      const scale = 0.8 * STATE.mapZoom;

      const wx = (clickX - cx) / scale - STATE.mapPanX;
      const wz = (clickY - cy) / scale - STATE.mapPanY;

      // 命中測試
      const allPOIs = TAICHUNG_URBAN_POIS.concat(MRT_GREEN_LINE_DATA);
      let hit = null;
      for (const p of allPOIs) {
        if (Math.hypot(p.x - wx, p.z - wz) < 18 / scale) {
          hit = p;
          break;
        }
      }

      if (hit) {
        this.openPlaceCard(hit);
        this.render();
      } else {
        this.setGPS(wx, wz, `自訂位置 (${Math.round(wx)}, ${Math.round(wz)})`);
      }
    });
  }

  resize() {
    const container = document.getElementById('map-canvas-container') || document.querySelector('.gmaps-viewport');
    if (container) {
      this.canvas.width = container.clientWidth || window.innerWidth;
      this.canvas.height = container.clientHeight || window.innerHeight;
      if (STATE.isMapOpen) this.render();
    }
  }

  openPlaceCard(place) {
    this.selectedPlace = place;
    const card = document.getElementById('gmaps-place-card');
    if (!card) return;
    document.getElementById('place-badge').innerText = place.code ? `捷運 ${place.code} · 車站` : (place.badge || '熱門地標');
    document.getElementById('place-title').innerText = place.code ? `${place.name} (${place.code})` : place.name;
    document.getElementById('place-address').innerText = place.address || '台中市區';
    card.classList.remove('hidden');
  }

  setGPS(x, z, name) {
    STATE.gpsTarget = { x, z, name };
    document.getElementById('gps-target-hint')?.classList.remove('hidden');
    document.getElementById('gps-target-name').innerText = name;
    document.getElementById('minimap-gps-pin')?.classList.remove('hidden');
    this.showToast(`🚩 GPS 導航已鎖定：${name}`);
    if (STATE.isMapOpen) this.render();
  }

  showToast(msg) {
    const toast = document.getElementById('toast-notice');
    if (!toast) return;
    toast.innerText = msg;
    toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
  }

  // ★★★ Google Maps 台中市區向量渲染引擎 (對標第二、四、五張圖) ★★★
  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = 0.8 * STATE.mapZoom;

    // 1. Google Maps 經典底色 (#f1f3f4)
    ctx.fillStyle = '#f1f3f4';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(STATE.mapPanX, STATE.mapPanY);

    // 2. 綠地公園 (Google Maps #ceead6)
    ctx.fillStyle = '#ceead6';
    // 台中公園 (Taichung Park)
    const tp = TAICHUNG_PARK_ZONE;
    ctx.beginPath();
    ctx.roundRect(tp.minX, tp.minZ, tp.maxX - tp.minX, tp.maxZ - tp.minZ, 14);
    ctx.fill();
    ctx.fillStyle = '#2e7d32';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('🌳 台中公園 (湖心亭)', tp.minX + 15, tp.cz);

    // 湧泉公園 (帝國製糖廠)
    const sf = SUGAR_FACTORY_ZONE;
    ctx.fillStyle = '#ceead6';
    ctx.beginPath();
    ctx.roundRect(sf.minX, sf.minZ, sf.maxX - sf.minX, sf.maxZ - sf.minZ, 14);
    ctx.fill();
    ctx.fillStyle = '#2e7d32';
    ctx.fillText('🌳 湧泉公園 (帝國製糖廠)', sf.minX + 10, sf.cz);

    // 3. 水系 (Google Maps 水藍色 #c4e3ed)
    ctx.fillStyle = '#c4e3ed';
    // 台中公園日月湖
    ctx.beginPath();
    ctx.ellipse(tp.lake.cx, tp.lake.cz, tp.lake.rx, tp.lake.rz, 0, 0, Math.PI * 2);
    ctx.fill();

    // 湧泉公園星泉湖
    ctx.beginPath();
    ctx.ellipse(sf.lake.cx, sf.lake.cz, sf.lake.rx, sf.lake.rz, 0, 0, Math.PI * 2);
    ctx.fill();

    // 綠川水岸景觀曲流
    ctx.strokeStyle = '#00cec9';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(LUCHUAN_CANAL.x, LUCHUAN_CANAL.zStart);
    ctx.lineTo(LUCHUAN_CANAL.x, LUCHUAN_CANAL.zEnd);
    ctx.stroke();

    ctx.fillStyle = '#00cec9';
    ctx.font = '12px sans-serif';
    ctx.fillText('~ 綠川水岸景觀廊道 ~', LUCHUAN_CANAL.x + 15, 0);

    // 3.5 全臺中 Overture Maps 真實建築輪廓 (Google Maps 柔和淡灰幾何街廓)
    if (window.chunkManager) {
      const viewX = -STATE.mapPanX;
      const viewZ = -STATE.mapPanY;
      const viewRadius = Math.max(w, h) / scale * 0.75;
      const outlines = window.chunkManager.getBuildingOutlinesInRadius(viewX, viewZ, viewRadius);

      ctx.fillStyle = '#e8eaed';
      ctx.strokeStyle = '#d6d9dc';
      ctx.lineWidth = 0.8;

      for (let b = 0; b < outlines.length; b++) {
        const ring = outlines[b];
        if (!ring || ring.length < 3) continue;

        ctx.beginPath();
        for (let p = 0; p < ring.length; p++) {
          if (p === 0) ctx.moveTo(ring[p].x, ring[p].z);
          else ctx.lineTo(ring[p].x, ring[p].z);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // 4. 台中市區真實街道網 (對標第五張圖真實街道)
    DOWNTOWN_ROADS.forEach(road => {
      const isArterial = road.type === 'arterial';
      const isTaiwanBlvd = road.name.includes('臺灣大道');

      // 灰色外邊
      ctx.strokeStyle = isTaiwanBlvd ? '#ea8600' : '#dadce0';
      ctx.lineWidth = road.width * 0.9;
      ctx.beginPath();
      ctx.moveTo(road.x1, road.z1);
      ctx.lineTo(road.x2, road.z2);
      ctx.stroke();

      // 白色中心 (臺灣大道為經典 Google Maps 金黃)
      ctx.strokeStyle = isTaiwanBlvd ? '#fbbc04' : '#ffffff';
      ctx.lineWidth = road.width * 0.65;
      ctx.stroke();

      // 路名文字
      ctx.fillStyle = '#202124';
      ctx.font = isArterial ? 'bold 12px "Noto Sans TC", sans-serif' : '10px "Noto Sans TC", sans-serif';
      const midX = (road.x1 + road.x2) / 2;
      const midZ = (road.z1 + road.z2) / 2;
      ctx.fillText(road.name, midX + 3, midZ - 3);
    });

    // 5. 台中捷運綠線 (Taichung MRT Green Line #00a86b，對標第二張圖)
    ctx.shadowColor = 'rgba(0, 168, 107, 0.4)';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#00a86b';
    ctx.lineWidth = 6;
    ctx.beginPath();
    MRT_GREEN_LINE_DATA.forEach((st, idx) => {
      if (idx === 0) ctx.moveTo(st.x, st.z);
      else ctx.lineTo(st.x, st.z);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    MRT_GREEN_LINE_DATA.forEach(st => {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(st.x, st.z, st.hub ? 8 : 5.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#00a86b';
      ctx.beginPath();
      ctx.arc(st.x, st.z, st.hub ? 4.5 : 3.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1e372e';
      ctx.font = st.hub ? 'bold 12px "Noto Sans TC", sans-serif' : '10px "Noto Sans TC", sans-serif';
      ctx.fillText(`${st.code} ${st.name}`, st.x + 8, st.z + 4);
    });

    // 6. 台鐵高架鐵路山線 (TRA Viaduct，對標第五張圖貫穿車站斜線)
    ctx.strokeStyle = '#3c4043';
    ctx.lineWidth = 7;
    ctx.beginPath();
    TRA_LINE_DATA.forEach((st, idx) => {
      if (idx === 0) ctx.moveTo(st.x, st.z);
      else ctx.lineTo(st.x, st.z);
    });
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 8]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 7. POI 標記
    const allPOIs = TAICHUNG_URBAN_POIS;
    allPOIs.forEach(poi => {
      if (this.currentFilter !== 'all' && poi.category !== this.currentFilter) return;

      const isTra = poi.category === 'tra';
      const isFood = poi.category === 'food';
      const isMall = poi.category === 'mall';
      const col = isTra ? '#1a73e8' : (isFood ? '#ea8600' : (isMall ? '#9c27b0' : '#e53935'));

      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(poi.x, poi.z, 6.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(poi.x, poi.z, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#202124';
      ctx.font = 'bold 11px "Noto Sans TC", sans-serif';
      ctx.fillText(poi.name, poi.x + 9, poi.z + 4);
    });

    // 8. 選中地點標記
    if (this.selectedPlace) {
      const sp = this.selectedPlace;
      ctx.fillStyle = 'rgba(26, 115, 232, 0.25)';
      ctx.beginPath();
      ctx.arc(sp.x, sp.z, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#1a73e8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sp.x, sp.z, 11, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 9. GPS 導航路徑線 (Google Maps 藍色路徑)
    if (STATE.gpsTarget) {
      const px = this.playerVehicle.position.x;
      const pz = this.playerVehicle.position.z;
      const tx = STATE.gpsTarget.x;
      const tz = STATE.gpsTarget.z;

      ctx.strokeStyle = 'rgba(26, 115, 232, 0.35)';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(px, pz);
      ctx.lineTo(tx, tz);
      ctx.stroke();

      ctx.strokeStyle = '#1a73e8';
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(px, pz);
      ctx.lineTo(tx, tz);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#ea4335';
      ctx.beginPath();
      ctx.arc(tx, tz, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(tx, tz, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#d93025';
      ctx.font = 'bold 13px "Noto Sans TC", sans-serif';
      ctx.fillText(`🚩 ${STATE.gpsTarget.name}`, tx + 12, tz + 4);
    }

    // 10. 玩家位置 (Google Maps 藍色圓點 + 視角光錐)
    const px = this.playerVehicle.position.x;
    const pz = this.playerVehicle.position.z;
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(-this.playerVehicle.rotation.y);

    const fovGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 50);
    fovGrad.addColorStop(0, 'rgba(66, 133, 244, 0.45)');
    fovGrad.addColorStop(1, 'rgba(66, 133, 244, 0)');
    ctx.fillStyle = fovGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 50, -Math.PI / 2 - 0.45, -Math.PI / 2 + 0.45);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4285f4';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    ctx.restore();
  }
}

window.GoogleMapSystem = GoogleMapSystem;
