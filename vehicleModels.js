import * as THREE from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * 高精細載具建模工廠 (VehicleModels)
 * - 以側面輪廓 Chaikin 圓滑化 + 倒角擠出，產生流線車身鈑金
 * - 清漆烤漆 (Clearcoat)、玻璃、鍍鉻、橡膠輪胎、多輻鋁圈與碟煞
 * - 大燈、尾燈、水箱護罩、後視鏡、車門縫、把手、車牌、座椅與方向盤
 * 車頭朝 +Z，輪胎底部貼齊 Y = 0
 */

// ---------------------------------------------------------------------------
// 材質
// ---------------------------------------------------------------------------
function paintMaterial(color) {
  return new THREE.MeshPhysicalMaterial({
    color, roughness: 0.32, metalness: 0.6, clearcoat: 1.0, clearcoatRoughness: 0.06
  });
}

function glassMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x0b1620, roughness: 0.04, metalness: 0.5, transparent: true, opacity: 0.82,
    clearcoat: 1.0, clearcoatRoughness: 0.02
  });
}

const chromeMat = () => new THREE.MeshStandardMaterial({ color: 0xe8ecef, roughness: 0.12, metalness: 1.0 });
const darkMat = () => new THREE.MeshStandardMaterial({ color: 0x0d0f12, roughness: 0.7, metalness: 0.2 });
const plasticMat = () => new THREE.MeshStandardMaterial({ color: 0x1a1d21, roughness: 0.55, metalness: 0.1 });

// ---------------------------------------------------------------------------
// 幾何工具
// ---------------------------------------------------------------------------
function smoothPolygon(points, iterations = 2) {
  let pts = points;
  for (let it = 0; it < iterations; it++) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      out.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]]);
      out.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    pts = out;
  }
  return pts;
}

/** 側面輪廓 (z, y) 沿車寬擠出並倒角，回傳以 X=0 為中心的車身幾何 */
function extrudeProfile(points, width, bevel = 0.08, smooth = 2) {
  const pts = smoothPolygon(points, smooth);
  const shape = new THREE.Shape();
  pts.forEach((p, i) => (i === 0 ? shape.moveTo(p[0], p[1]) : shape.lineTo(p[0], p[1])));
  const depth = Math.max(0.01, width - 2 * bevel);
  let geo = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: 5, curveSegments: 4, steps: 1
  });
  geo.translate(0, 0, -depth / 2);
  geo.rotateY(-Math.PI / 2); // shape.x -> +Z (車頭), 擠出軸 -> X
  geo.deleteAttribute('uv');
  geo = toCreasedNormals(geo, Math.PI / 4);
  return geo;
}

function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

function box(w, h, d, mat, x, y, z) {
  return mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
}

function makePlateTexture(text, bg, fg, border) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = border; ctx.lineWidth = 8; ctx.strokeRect(6, 6, 244, 116);
  ctx.fillStyle = fg;
  ctx.font = 'bold 64px "Arial Narrow", Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 68);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function addPlate(group, text, bg, fg, border, x, y, z, rotY, tilt = 0) {
  const p = new THREE.Mesh(
    new THREE.PlaneGeometry(0.52, 0.26),
    new THREE.MeshStandardMaterial({ map: makePlateTexture(text, bg, fg, border), roughness: 0.4 })
  );
  p.position.set(x, y, z);
  p.rotation.y = rotY;
  p.rotation.x = tilt;
  group.add(p);
}

// ---------------------------------------------------------------------------
// 輪胎 / 鋁圈 (軸向為 X，底部貼地由呼叫者設定高度)
// ---------------------------------------------------------------------------
export function createWheel(radius = 0.34, width = 0.24, opts = {}) {
  const { spokes = 5, rimColor = 0xc9ced3, caliperColor = 0xc0392b, brake = true, dark = false } = opts;
  const g = new THREE.Group();
  const rimR = radius * 0.68;

  // 胎面 + 圓弧胎壁
  const hw = width / 2;
  const prof = [
    new THREE.Vector2(rimR * 0.96, -hw * 0.9),
    new THREE.Vector2(radius * 0.9, -hw),
    new THREE.Vector2(radius * 0.985, -hw * 0.78),
    new THREE.Vector2(radius, -hw * 0.45),
    new THREE.Vector2(radius, hw * 0.45),
    new THREE.Vector2(radius * 0.985, hw * 0.78),
    new THREE.Vector2(radius * 0.9, hw),
    new THREE.Vector2(rimR * 0.96, hw * 0.9)
  ];
  const tire = new THREE.Mesh(
    new THREE.LatheGeometry(prof, 36),
    new THREE.MeshStandardMaterial({ color: 0x141517, roughness: 0.92, metalness: 0.0, side: THREE.DoubleSide })
  );
  g.add(tire);

  // 胎面溝紋 (環狀細槽)
  const grooveMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0b, roughness: 1 });
  [-0.22, 0.22].forEach(k => {
    const gr = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.995, width * 0.018, 6, 36), grooveMat);
    gr.rotation.x = Math.PI / 2;
    gr.position.y = k * width;
    g.add(gr);
  });

  const rimMat = new THREE.MeshStandardMaterial({
    color: dark ? 0x2b2f35 : rimColor, roughness: 0.25, metalness: 0.95
  });
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(rimR, rimR, width * 0.86, 32, 1, true), rimMat);
  barrel.material.side = THREE.DoubleSide;
  g.add(barrel);

  // 輪唇
  [-1, 1].forEach(s => {
    const lip = new THREE.Mesh(new THREE.TorusGeometry(rimR, width * 0.035, 8, 32), rimMat);
    lip.rotation.x = Math.PI / 2;
    lip.position.y = s * width * 0.43;
    g.add(lip);
  });

  // 輪輻
  for (let s = -1; s <= 1; s += 2) {
    for (let i = 0; i < spokes; i++) {
      const arm = new THREE.Group();
      arm.rotation.y = (i / spokes) * Math.PI * 2;
      const sp = new THREE.Mesh(new THREE.BoxGeometry(rimR * 0.2, width * 0.1, rimR * 0.92), rimMat);
      sp.position.set(0, 0, rimR * 0.5);
      arm.add(sp);
      arm.position.y = s * width * 0.3;
      g.add(arm);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(rimR * 0.22, rimR * 0.22, width * 0.12, 16), rimMat);
    hub.position.y = s * width * 0.32;
    g.add(hub);
  }

  // 煞車碟盤與卡鉗
  if (brake) {
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(rimR * 0.82, rimR * 0.82, width * 0.14, 28),
      new THREE.MeshStandardMaterial({ color: 0x8b9096, roughness: 0.35, metalness: 0.9 })
    );
    g.add(disc);
    const cal = new THREE.Mesh(
      new THREE.BoxGeometry(rimR * 0.35, width * 0.42, rimR * 0.55),
      new THREE.MeshStandardMaterial({ color: caliperColor, roughness: 0.4, metalness: 0.3 })
    );
    cal.position.set(0, 0, rimR * 0.58);
    g.add(cal);
  }

  g.rotation.z = Math.PI / 2; // 輪軸轉向 X
  const holder = new THREE.Group();
  holder.add(g);
  holder.userData.spin = g;
  return holder;
}

// ---------------------------------------------------------------------------
// 共用車體零件
// ---------------------------------------------------------------------------
function addWheels(car, W, positions, radius, width, wheelOpts) {
  const wheels = [];
  positions.forEach(([sx, z]) => {
    const w = createWheel(radius, width, wheelOpts);
    const x = sx * (W / 2 - width / 2 + 0.035);
    w.position.set(x, radius, z);
    car.add(w);
    wheels.push(w);
    // 輪拱暗影
    const arch = new THREE.Mesh(
      new THREE.CircleGeometry(radius * 1.32, 28),
      new THREE.MeshBasicMaterial({ color: 0x050607 })
    );
    arch.position.set(sx * (W / 2 + 0.006), radius * 1.02, z);
    arch.rotation.y = sx * Math.PI / 2;
    car.add(arch);
  });
  car.userData.wheels = wheels;
}

function addDoorDetails(car, W, zLines, y0, y1, handleZs, handleY) {
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x0a0b0d });
  const hMat = chromeMat();
  [-1, 1].forEach(s => {
    zLines.forEach(z => {
      car.add(box(0.008, y1 - y0, 0.014, lineMat, s * (W / 2 + 0.004), (y0 + y1) / 2, z));
    });
    [[zLines[0], zLines[1]], [zLines[1], zLines[2]]].forEach(([a, b]) => {
      car.add(box(0.008, 0.012, Math.abs(a - b), lineMat, s * (W / 2 + 0.004), y0, (a + b) / 2));
    });
    handleZs.forEach(z => {
      car.add(box(0.025, 0.03, 0.17, hMat, s * (W / 2 + 0.012), handleY, z));
    });
  });
}

function addMirrors(car, W, paint, y, z) {
  [-1, 1].forEach(s => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), paint);
    m.scale.set(0.55, 0.75, 1.0);
    m.position.set(s * (W / 2 + 0.14), y, z);
    car.add(m);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.09),
      new THREE.MeshStandardMaterial({ color: 0x7e8c99, roughness: 0.05, metalness: 1 }));
    glass.position.set(s * (W / 2 + 0.14), y, z - 0.095);
    glass.rotation.y = Math.PI;
    car.add(glass);
    car.add(box(0.14, 0.03, 0.05, plasticMat(), s * (W / 2 + 0.05), y - 0.05, z + 0.02));
  });
}

function addInterior(car, cabinZ, cabinW, y, seatZs) {
  const trim = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.85 });
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x23262b, roughness: 0.9 });
  car.add(box(cabinW * 0.9, 0.08, 2.0, trim, 0, y - 0.16, cabinZ));
  seatZs.forEach(z => {
    [-1, 1].forEach(s => {
      if (z < cabinZ - 0.2 && s === 0) return;
      const sx = s * cabinW * 0.22;
      car.add(box(0.42, 0.1, 0.46, seatMat, sx, y - 0.1, z));
      const back = box(0.42, 0.46, 0.1, seatMat, sx, y + 0.1, z - 0.2);
      back.rotation.x = -0.18;
      car.add(back);
      car.add(box(0.22, 0.14, 0.08, seatMat, sx, y + 0.38, z - 0.25));
    });
  });
  // 方向盤與儀表台
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.018, 8, 20), trim);
  wheel.position.set(-cabinW * 0.22, y + 0.12, seatZs[0] + 0.5);
  wheel.rotation.x = -1.0;
  car.add(wheel);
  car.add(box(cabinW * 0.88, 0.14, 0.34, trim, 0, y + 0.02, seatZs[0] + 0.72));
}

function addHeadlight(car, x, y, z, w, h, scale = 1) {
  const housing = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 10),
    new THREE.MeshStandardMaterial({ color: 0xdfe6ea, roughness: 0.08, metalness: 0.6 }));
  housing.scale.set(w, h, 0.12 * scale);
  housing.position.set(x, y, z);
  car.add(housing);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4d6, emissiveIntensity: 1.6 }));
  core.scale.set(w * 0.55, h * 0.5, 0.08 * scale);
  core.position.set(x, y, z + 0.035);
  car.add(core);
}

function addTaillight(car, x, y, z, w, h, color = 0xff1030) {
  const t = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.3, roughness: 0.2 }));
  t.scale.set(w, h, 0.1);
  t.position.set(x, y, z);
  car.add(t);
}

function addPillar(car, x, p1, p2, thick, mat) {
  const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
  const m = box(thick, thick, len, mat, x, (p1[1] + p2[1]) / 2, (p1[0] + p2[0]) / 2);
  m.rotation.x = -Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
  car.add(m);
}

function finalize(car, scale = 0.92) {
  car.traverse(c => {
    if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
  });
  car.scale.setScalar(scale);
  return car;
}

// ---------------------------------------------------------------------------
// 四門轎車 (小黃計程車 / 警車)
// ---------------------------------------------------------------------------
export function buildSedan({ paintColor = 0xfbc02d, plate = null, extras = null } = {}) {
  const car = new THREE.Group();
  const W = 1.82;
  const paint = paintMaterial(paintColor);
  const glass = glassMaterial();
  const dark = darkMat();

  const body = new THREE.Mesh(extrudeProfile([
    [-2.22, 0.34], [-2.28, 0.58], [-2.18, 0.84], [-1.85, 0.93],
    [-1.1, 0.95], [1.0, 0.97], [1.7, 0.88], [2.15, 0.72],
    [2.28, 0.54], [2.22, 0.34], [1.9, 0.27], [-1.9, 0.27]
  ], W, 0.1), paint);
  car.add(body);

  const cw = W * 0.88;
  const cabin = new THREE.Mesh(extrudeProfile([
    [-1.38, 0.9], [-0.98, 1.34], [-0.7, 1.4], [0.3, 1.42], [0.62, 1.36], [1.08, 0.92]
  ], cw, 0.05, 2), glass);
  car.add(cabin);

  // 車頂鈑金
  const roof = new THREE.Mesh(extrudeProfile([
    [-1.05, 1.34], [-0.85, 1.42], [0.28, 1.45], [0.5, 1.4], [0.55, 1.35], [-0.95, 1.33]
  ], cw * 0.98, 0.04, 1), paint);
  car.add(roof);

  // 立柱
  const hx = cw / 2 - 0.02;
  [-1, 1].forEach(s => {
    addPillar(car, s * hx, [1.08, 0.92], [0.6, 1.4], 0.065, paint);
    addPillar(car, s * hx, [-1.38, 0.9], [-0.98, 1.38], 0.085, paint);
    addPillar(car, s * hx, [-0.2, 0.92], [-0.2, 1.4], 0.06, paint);
  });

  addInterior(car, -0.1, cw, 1.0, [0.2, -0.85]);

  // 底盤、前後保桿
  car.add(box(W * 0.9, 0.14, 4.1, dark, 0, 0.3, 0));
  car.add(box(W * 0.98, 0.16, 0.12, dark, 0, 0.38, 2.24));
  car.add(box(W * 0.98, 0.16, 0.12, dark, 0, 0.4, -2.22));

  // 水箱護罩與進氣口
  car.add(box(0.95, 0.15, 0.05, dark, 0, 0.56, 2.27));
  car.add(box(1.0, 0.025, 0.05, chromeMat(), 0, 0.65, 2.275));
  car.add(box(1.0, 0.025, 0.05, chromeMat(), 0, 0.47, 2.275));
  car.add(box(1.0, 0.1, 0.06, dark, 0, 0.3, 2.22));
  for (let i = 0; i < 4; i++) car.add(box(0.9, 0.012, 0.055, chromeMat(), 0, 0.5 + i * 0.04, 2.285));

  [-1, 1].forEach(s => {
    addHeadlight(car, s * 0.66, 0.72, 2.2, 0.38, 0.17);
    addTaillight(car, s * 0.68, 0.82, -2.26, 0.4, 0.15);
    car.add(box(0.14, 0.07, 0.08, new THREE.MeshStandardMaterial({ color: 0xff9800, emissive: 0xff7a00, emissiveIntensity: 0.7 }),
      s * 0.92, 0.5, 2.18));
    // 霧燈
    const fog = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12), new THREE.MeshBasicMaterial({ color: 0xfff7d0 }));
    fog.position.set(s * 0.72, 0.36, 2.285);
    car.add(fog);
    // 排氣尾管
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.14, 12), chromeMat());
    tip.rotation.x = Math.PI / 2;
    tip.position.set(s * 0.55, 0.32, -2.3);
    car.add(tip);
  });

  addWheels(car, W, [[-1, 1.4], [1, 1.4], [-1, -1.4], [1, -1.4]], 0.34, 0.24,
    { spokes: 5, rimColor: 0xd0d5da, brake: true, caliperColor: 0x7f8c8d });
  addDoorDetails(car, W, [1.05, 0.0, -1.3], 0.38, 0.92, [0.62, -0.4], 0.84);
  addMirrors(car, cw + 0.05, paint, 1.0, 0.9);

  if (plate) {
    addPlate(car, plate.text, plate.bg, plate.fg, plate.border, 0, 0.42, 2.292, 0);
    addPlate(car, plate.text, plate.bg, plate.fg, plate.border, 0, 0.5, -2.31, Math.PI);
  }
  if (extras) extras(car, { paint, glass, dark, W });

  return finalize(car);
}

// 計程車專屬細節
export function buildTaxi() {
  return buildSedan({
    paintColor: 0xfbc02d,
    plate: { text: 'TDC-1688', bg: '#d32f2f', fg: '#ffffff', border: '#ffffff' },
    extras: (car, { W }) => {
      // 棋盤格腰線
      const c = document.createElement('canvas');
      c.width = 512; c.height = 32;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fbc02d'; ctx.fillRect(0, 0, 512, 32);
      for (let x = 0; x < 512; x += 16) {
        ctx.fillStyle = (x / 16) % 2 === 0 ? '#111' : '#fff';
        ctx.fillRect(x, 0, 16, 16);
        ctx.fillStyle = (x / 16) % 2 === 0 ? '#fff' : '#111';
        ctx.fillRect(x, 16, 16, 16);
      }
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const stripeMat = new THREE.MeshBasicMaterial({ map: tex });
      [-1, 1].forEach(s => {
        const st = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 0.07), stripeMat);
        st.position.set(s * (W / 2 + 0.009), 0.62, -0.1);
        st.rotation.y = s * Math.PI / 2;
        car.add(st);
      });
      // 車頂 TAXI 燈箱
      const sc = document.createElement('canvas');
      sc.width = 256; sc.height = 96;
      const sx = sc.getContext('2d');
      sx.fillStyle = '#fffde7'; sx.fillRect(0, 0, 256, 96);
      sx.fillStyle = '#d32f2f'; sx.font = 'bold 44px Arial'; sx.textAlign = 'center';
      sx.fillText('TAXI', 128, 48);
      sx.fillStyle = '#1565c0'; sx.font = 'bold 22px "Noto Sans TC", sans-serif';
      sx.fillText('臺中 · 計程車', 128, 82);
      const stex = new THREE.CanvasTexture(sc);
      stex.colorSpace = THREE.SRGBColorSpace;
      const signMat = new THREE.MeshStandardMaterial({ map: stex, emissive: 0xffffff, emissiveMap: stex, emissiveIntensity: 0.55 });
      const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.26), signMat);
      sign.position.set(0, 1.58, -0.1);
      car.add(sign);
      car.add(box(0.5, 0.04, 0.2, darkMat(), 0, 1.47, -0.1));
    }
  });
}

// 警車專屬細節
export function buildPoliceCar() {
  return buildSedan({
    paintColor: 0xf4f6f8,
    plate: { text: 'POL-110', bg: '#ffffff', fg: '#111111', border: '#1d4ed8' },
    extras: (car, { W, dark }) => {
      const navy = new THREE.MeshPhysicalMaterial({ color: 0x0f1f4a, roughness: 0.3, metalness: 0.5, clearcoat: 1 });
      [-1, 1].forEach(s => {
        // 車門深藍區塊與反光條
        car.add(box(0.012, 0.3, 2.35, navy, s * (W / 2 + 0.006), 0.58, -0.2));
        car.add(box(0.014, 0.035, 2.35, new THREE.MeshStandardMaterial({ color: 0xe53935, roughness: 0.3 }),
          s * (W / 2 + 0.008), 0.72, -0.2));
        // 引擎蓋深色飾條
      });
      car.add(box(0.5, 0.004, 1.4, navy, 0, 0.99, 1.2));
      // 警徽
      const badge = new THREE.Mesh(new THREE.CircleGeometry(0.11, 6), new THREE.MeshStandardMaterial({ color: 0xffc400, metalness: 0.8, roughness: 0.3 }));
      [-1, 1].forEach(s => {
        badge.clone();
        const b = badge.clone();
        b.position.set(s * (W / 2 + 0.016), 0.58, 0.7);
        b.rotation.y = s * Math.PI / 2;
        car.add(b);
      });
      // 車頂爆閃燈條
      car.add(box(1.15, 0.05, 0.3, dark, 0, 1.5, -0.1));
      const redMat = new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xff1744, emissiveIntensity: 2.2, transparent: true, opacity: 0.95 });
      const blueMat = new THREE.MeshStandardMaterial({ color: 0x1a6dff, emissive: 0x1a6dff, emissiveIntensity: 2.2, transparent: true, opacity: 0.95 });
      const redBar = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.38, 4, 10), redMat);
      redBar.rotation.z = Math.PI / 2; redBar.position.set(-0.3, 1.57, -0.1);
      const blueBar = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.38, 4, 10), blueMat);
      blueBar.rotation.z = Math.PI / 2; blueBar.position.set(0.3, 1.57, -0.1);
      car.add(redBar); car.add(blueBar);
      car.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 10), chromeMat(), 0, 1.59, -0.1));
      // 保桿牛角
      car.add(box(1.2, 0.07, 0.05, dark, 0, 0.52, 2.33));
    }
  });
}

// ---------------------------------------------------------------------------
// 紅黑流線型超跑
// ---------------------------------------------------------------------------
export function buildSupercar() {
  const car = new THREE.Group();
  const W = 1.96;
  const paint = paintMaterial(0xb4001a);
  const glass = glassMaterial();
  const dark = darkMat();
  const carbon = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.35, metalness: 0.6 });

  const body = new THREE.Mesh(extrudeProfile([
    [-2.2, 0.34], [-2.32, 0.62], [-2.12, 0.88], [-1.5, 0.98],
    [-0.5, 0.95], [0.4, 0.82], [1.3, 0.66], [2.0, 0.52],
    [2.3, 0.42], [2.25, 0.3], [1.9, 0.25], [-1.9, 0.25]
  ], W, 0.12), paint);
  car.add(body);

  const cw = W * 0.8;
  const cabin = new THREE.Mesh(extrudeProfile([
    [-1.3, 0.92], [-0.75, 1.2], [-0.3, 1.26], [0.2, 1.22], [0.95, 0.84]
  ], cw, 0.06, 2), glass);
  car.add(cabin);
  const roof = new THREE.Mesh(extrudeProfile([
    [-0.9, 1.17], [-0.6, 1.24], [0.05, 1.27], [0.3, 1.2], [0.0, 1.17]
  ], cw * 0.96, 0.03, 1), paint);
  car.add(roof);
  addInterior(car, -0.2, cw, 0.98, [0.15, -0.6]);

  // 底盤與前分流器 / 後擴散器
  car.add(box(W * 0.92, 0.1, 4.2, dark, 0, 0.28, 0));
  car.add(box(W * 0.98, 0.04, 0.4, carbon, 0, 0.27, 2.12));
  car.add(box(W * 0.8, 0.12, 0.3, carbon, 0, 0.36, -2.2));
  for (let i = -3; i <= 3; i++) {
    car.add(box(0.018, 0.12, 0.34, dark, i * 0.2, 0.37, -2.22));
  }

  // 前大燈 (窄長)、進氣口、尾燈燈條
  [-1, 1].forEach(s => {
    addHeadlight(car, s * 0.7, 0.6, 2.15, 0.46, 0.1);
    car.add(box(0.5, 0.12, 0.05, dark, s * 0.45, 0.42, 2.26));
    // 側進氣口
    car.add(box(0.05, 0.2, 0.75, dark, s * (W / 2 + 0.005), 0.66, -0.95));
    for (let k = 0; k < 4; k++) car.add(box(0.052, 0.012, 0.7, carbon, s * (W / 2 + 0.01), 0.58 + k * 0.045, -0.95));
    // 雙出尾管
    [-0.1, 0.1].forEach(dx => {
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.18, 14), chromeMat());
      tip.rotation.x = Math.PI / 2;
      tip.position.set(s * 0.45 + dx * 0.7, 0.4, -2.33);
      car.add(tip);
    });
  });
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 1.4, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0xff1030, emissive: 0xff1030, emissiveIntensity: 1.8 }));
  tail.rotation.z = Math.PI / 2;
  tail.position.set(0, 0.84, -2.3);
  car.add(tail);
  car.add(box(0.5, 0.05, 0.08, dark, 0, 0.62, 2.29));
  car.add(box(1.0, 0.18, 0.06, dark, 0, 0.42, 2.27));

  // 尾翼
  car.add(box(1.9, 0.045, 0.45, carbon, 0, 1.28, -2.1));
  [-1, 1].forEach(s => {
    car.add(box(0.045, 0.2, 0.55, carbon, s * 0.95, 1.2, -2.1));
    car.add(box(0.06, 0.32, 0.1, carbon, s * 0.5, 1.13, -2.05));
  });

  addWheels(car, W, [[-1, 1.38], [1, 1.38], [-1, -1.38], [1, -1.38]], 0.355, 0.28,
    { spokes: 10, rimColor: 0x23272d, dark: true, caliperColor: 0xe53935 });
  addDoorDetails(car, W, [0.9, 0.05, -0.8], 0.4, 0.92, [0.5], 0.8);
  addMirrors(car, cw + 0.15, paint, 0.98, 0.7);
  addPlate(car, 'TC-8888', '#ffffff', '#111111', '#222222', 0, 0.55, -2.34, Math.PI);

  return finalize(car, 0.94);
}

export { createWheel as buildDetailedWheel };
