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

// ---------------------------------------------------------------------------
// 台灣經典三陽/中華藍色小貨車 (發財車)
// ---------------------------------------------------------------------------
export function buildTruck() {
  const truck = new THREE.Group();
  const W = 1.78;
  const bluePaint = paintMaterial(0x1976d2); // 經典發財藍
  const dark = darkMat();
  const plastic = plasticMat();
  const glass = glassMaterial();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0xb07d4b, roughness: 0.85 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.5, metalness: 0.7 });

  // 1. 車頭駕駛艙 (Cab)
  const cabL = 1.45;
  const cabZ = 1.15;
  // 駕駛室外殼 (微弧箱型)
  const cab = box(W, 1.25, cabL, bluePaint, 0, 0.98, cabZ);
  truck.add(cab);

  // 擋風玻璃 (大面積微斜)
  const fWindshield = box(W * 0.88, 0.55, 0.08, glass, 0, 1.15, cabZ + cabL / 2 + 0.01);
  fWindshield.rotation.x = -0.15;
  truck.add(fWindshield);

  // 兩側車窗
  [-1, 1].forEach(s => {
    truck.add(box(0.06, 0.45, 0.65, glass, s * (W / 2 + 0.01), 1.12, cabZ - 0.05));
    // 車門把手 (黑色復古把手)
    truck.add(box(0.04, 0.04, 0.16, dark, s * (W / 2 + 0.02), 0.88, cabZ - 0.2));
    // 經典車門噴漆文字：「限乘 2 人 總重 1.95 噸」
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('限乘2人 總重1.95噸', 128, 32);
    const doorTex = new THREE.CanvasTexture(c);
    doorTex.colorSpace = THREE.SRGBColorSpace;
    const doorMat = new THREE.MeshBasicMaterial({ map: doorTex, transparent: true });
    const doorSign = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.18), doorMat);
    doorSign.position.set(s * (W / 2 + 0.02), 0.75, cabZ - 0.1);
    doorSign.rotation.y = s * Math.PI / 2;
    truck.add(doorSign);

    // 車頭兩側加長大後視鏡 (發財車招牌長臂鏡)
    const arm = box(0.24, 0.02, 0.02, dark, s * (W / 2 + 0.12), 1.08, cabZ + 0.35);
    truck.add(arm);
    const mirror = box(0.04, 0.28, 0.14, dark, s * (W / 2 + 0.24), 1.08, cabZ + 0.35);
    truck.add(mirror);
    const mirrorGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.24),
      new THREE.MeshStandardMaterial({ color: 0xdde5ed, roughness: 0.1, metalness: 0.9 }));
    mirrorGlass.position.set(s * (W / 2 + 0.24) - s * 0.021, 1.08, cabZ + 0.35);
    mirrorGlass.rotation.y = Math.PI;
    truck.add(mirrorGlass);
  });

  // 雨刷 (雙刷)
  [-0.3, 0.2].forEach(x => {
    const wiper = box(0.35, 0.02, 0.02, dark, x, 0.96, cabZ + cabL / 2 + 0.04);
    wiper.rotation.z = -0.3;
    truck.add(wiper);
  });

  // 前黑色塑料保險桿 + 水箱護罩
  truck.add(box(W * 1.02, 0.32, 0.18, plastic, 0, 0.48, cabZ + cabL / 2 + 0.08));
  // 散熱格柵
  for (let i = 0; i < 3; i++) {
    truck.add(box(0.8, 0.02, 0.02, dark, 0, 0.52 + i * 0.06, cabZ + cabL / 2 + 0.18));
  }
  // 車頭廠徽 (金色菱形)
  const badge = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.1, 4),
    new THREE.MeshStandardMaterial({ color: 0xffd54f, metalness: 0.8, roughness: 0.2 }));
  badge.rotation.x = Math.PI / 2;
  badge.position.set(0, 0.72, cabZ + cabL / 2 + 0.09);
  truck.add(badge);

  // 大燈與方向燈 (方型復古燈具)
  [-1, 1].forEach(s => {
    // 方形大燈
    truck.add(box(0.24, 0.18, 0.06,
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4d6, emissiveIntensity: 1.5 }),
      s * 0.62, 0.52, cabZ + cabL / 2 + 0.18));
    // 側邊琥珀色角燈
    truck.add(box(0.08, 0.16, 0.06,
      new THREE.MeshStandardMaterial({ color: 0xff9800, emissive: 0xff9800, emissiveIntensity: 1.2 }),
      s * 0.78, 0.52, cabZ + cabL / 2 + 0.17));
  });

  // 前車牌
  addPlate(truck, 'TD-3368', '#ffffff', '#111111', '#1976d2', 0, 0.38, cabZ + cabL / 2 + 0.18, 0);

  // 2. 底盤大樑與傳動軸
  const bedL = 2.45;
  const bedZ = -0.8;
  truck.add(box(0.9, 0.12, 4.4, metalMat, 0, 0.36, 0.1));
  truck.add(box(0.08, 0.08, 3.2, metalMat, 0, 0.32, -0.2)); // 傳動軸
  // 備胎 (懸掛在貨斗下方)
  const spare = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.18, 16), dark);
  spare.rotation.z = Math.PI / 2;
  spare.position.set(0, 0.32, -1.5);
  truck.add(spare);

  // 3. 貨斗 (Flatbed with Drop Sides)
  const bedW = W * 1.04;
  // 貨斗底板 (鐵/木質)
  truck.add(box(bedW, 0.08, bedL, woodMat, 0, 0.58, bedZ));
  // 貨斗圍欄 (左右兩側活動木板/鐵板)
  [-1, 1].forEach(s => {
    truck.add(box(0.04, 0.32, bedL, bluePaint, s * (bedW / 2 - 0.02), 0.74, bedZ));
    // 欄杆強化立柱
    for (let k = -1; k <= 1; k++) {
      truck.add(box(0.06, 0.36, 0.05, metalMat, s * (bedW / 2 - 0.01), 0.74, bedZ + k * 0.8));
    }
  });
  // 貨斗前端護網 (防止貨物撞擊駕駛艙後玻璃)
  truck.add(box(bedW * 0.92, 0.45, 0.04, metalMat, 0, 0.95, bedZ + bedL / 2 - 0.02));
  // 貨斗尾門 (開關尾板)
  truck.add(box(bedW, 0.32, 0.04, bluePaint, 0, 0.74, bedZ - bedL / 2 + 0.02));

  // 4. 滿載台味貨物！ (農產菜籃、紙箱、鳳梨瓦楞箱)
  const crateMatGreen = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.6 });
  const crateMatRed = new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.6 });
  const boxMat = new THREE.MeshStandardMaterial({ color: 0xd7ccc8, roughness: 0.8 });

  // 疊放的蔬果菜籃
  truck.add(box(0.55, 0.32, 0.55, crateMatGreen, -0.4, 0.78, bedZ + 0.5));
  truck.add(box(0.55, 0.32, 0.55, crateMatGreen, -0.4, 1.1, bedZ + 0.5));
  truck.add(box(0.55, 0.32, 0.55, crateMatRed, 0.35, 0.78, bedZ + 0.5));

  // 台中名產瓦楞紙箱 (東泉 / 太陽餅 標記)
  const cartonC = document.createElement('canvas');
  cartonC.width = 128; cartonC.height = 128;
  const cctx = cartonC.getContext('2d');
  cctx.fillStyle = '#c7a77b'; cctx.fillRect(0, 0, 128, 128);
  cctx.fillStyle = '#b71c1c'; cctx.font = 'bold 20px sans-serif';
  cctx.fillText('臺中特產', 16, 40);
  cctx.font = '16px sans-serif';
  cctx.fillText('易碎物品 ⬆', 16, 75);
  const cartonTex = new THREE.CanvasTexture(cartonC);
  const cartonMat = new THREE.MeshStandardMaterial({ map: cartonTex, roughness: 0.85 });

  const cBox1 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.5, 0.7), cartonMat);
  cBox1.position.set(0.2, 0.88, bedZ - 0.3);
  cBox1.rotation.y = 0.12;
  truck.add(cBox1);

  const cBox2 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.5), cartonMat);
  cBox2.position.set(-0.35, 0.84, bedZ - 0.4);
  truck.add(cBox2);

  // 藍色防水帆布
  const tarpMat = new THREE.MeshStandardMaterial({ color: 0x0d47a1, roughness: 0.7 });
  const tarp = box(0.6, 0.28, 0.5, tarpMat, 0.3, 0.76, bedZ - 0.95);
  tarp.rotation.y = -0.08;
  truck.add(tarp);

  // 5. 尾部車燈、擋泥板、車牌
  [-1, 1].forEach(s => {
    // 橫式三色尾燈 (紅/黃/白)
    truck.add(box(0.28, 0.09, 0.04,
      new THREE.MeshStandardMaterial({ color: 0xd32f2f, emissive: 0xd32f2f, emissiveIntensity: 1.5 }),
      s * 0.65, 0.46, bedZ - bedL / 2 - 0.03));
    // 復古後擋泥板 (黑色橡膠片帶紅色反光板)
    truck.add(box(0.26, 0.28, 0.02, dark, s * 0.72, 0.3, -1.75));
    truck.add(box(0.18, 0.04, 0.02,
      new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xff1744, emissiveIntensity: 1.2 }),
      s * 0.72, 0.22, -1.76));
  });
  // 後車牌
  addPlate(truck, 'TD-3368', '#ffffff', '#111111', '#1976d2', 0, 0.45, bedZ - bedL / 2 - 0.04, Math.PI);

  // 6. 輪胎 (前輪距 1.35, 後輪距 -1.25)
  addWheels(truck, W * 0.94, [[-1, 1.35], [1, 1.35], [-1, -1.25], [1, -1.25]], 0.34, 0.22, {
    spokes: 6, rimColor: 0xe0e0e0, dark: false, caliperColor: 0x757575
  });

  return finalize(truck, 0.96);
}

// ---------------------------------------------------------------------------
// 臺中市公車 300 號 (快捷公車 / BRT 專用道客運)
// ---------------------------------------------------------------------------
export function buildBus() {
  const bus = new THREE.Group();
  const W = 2.25;
  const L = 8.6;
  const H = 2.45;

  const whitePaint = paintMaterial(0xf5f7fa);
  const busGreen = new THREE.MeshPhysicalMaterial({ color: 0x00897b, roughness: 0.3, metalness: 0.2 });
  const busCyan = new THREE.MeshPhysicalMaterial({ color: 0x00bcd4, roughness: 0.3, metalness: 0.2 });
  const glass = glassMaterial();
  const dark = darkMat();

  // 1. 公車長條主體 (流線微倒角)
  const body = box(W, H, L, whitePaint, 0, H / 2 + 0.32, 0);
  bus.add(body);

  // 臺中綠川/柳川雙色躍動線條 (Sides Livery)
  [-1, 1].forEach(s => {
    // 綠色下飾條
    bus.add(box(0.02, 0.28, L * 0.95, busGreen, s * (W / 2 + 0.012), 0.68, 0));
    // 青綠波浪斜紋
    bus.add(box(0.02, 0.16, L * 0.88, busCyan, s * (W / 2 + 0.014), 0.94, 0.2));

    // 車身「臺中市公車」與「Taichung City Bus」文字水貼
    const c = document.createElement('canvas');
    c.width = 512; c.height = 96;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#00695c';
    ctx.font = 'bold 36px "Noto Sans TC", sans-serif';
    ctx.fillText('臺中市公車 300', 30, 48);
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#00897b';
    ctx.fillText('TAICHUNG CITY BUS · 臺灣大道專用道', 30, 78);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const signMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.45), signMat);
    signMesh.position.set(s * (W / 2 + 0.016), 1.25, 0.2);
    signMesh.rotation.y = s * Math.PI / 2;
    bus.add(signMesh);

    // 兩側長條景觀大車窗 (Dark Tinted Windows)
    bus.add(box(0.03, 0.92, L * 0.82, glass, s * (W / 2 + 0.01), 1.95, -0.15));
    // 窗柱隔欄
    for (let k = -3; k <= 3; k++) {
      bus.add(box(0.04, 0.94, 0.06, dark, s * (W / 2 + 0.012), 1.95, k * 0.95 - 0.15));
    }

    // 輪拱防撞黑飾條
    bus.add(box(0.03, 0.08, 1.2, dark, s * (W / 2 + 0.01), 0.72, 2.75));
    bus.add(box(0.03, 0.08, 1.2, dark, s * (W / 2 + 0.01), 0.72, -2.6));
  });

  // 右側雙片摺疊車門 (前後雙門)
  [-1.6, 1.8].forEach(doorZ => {
    // 門框
    bus.add(box(0.03, 1.75, 1.05, dark, W / 2 + 0.018, 1.2, doorZ));
    // 雙玻璃門扇
    bus.add(box(0.04, 1.6, 0.46, glass, W / 2 + 0.02, 1.22, doorZ - 0.24));
    bus.add(box(0.04, 1.6, 0.46, glass, W / 2 + 0.02, 1.22, doorZ + 0.24));
    // 黃色安全踏板線
    bus.add(box(0.04, 0.05, 1.05,
      new THREE.MeshStandardMaterial({ color: 0xffeb3b, emissive: 0xffeb3b, emissiveIntensity: 0.8 }),
      W / 2 + 0.02, 0.35, doorZ));
  });

  // 2. 車頭造型 (Front Face)
  const frontZ = L / 2;
  // 大面積彎曲前擋風玻璃
  const frontWindshield = box(W * 0.94, 1.15, 0.08, glass, 0, 1.88, frontZ + 0.02);
  frontWindshield.rotation.x = -0.06;
  bus.add(frontWindshield);

  // 車頭上方巨幅 LED 電子路線顯示牌 (LED Destination Sign)
  const ledC = document.createElement('canvas');
  ledC.width = 512; ledC.height = 128;
  const lctx = ledC.getContext('2d');
  lctx.fillStyle = '#0a0a0c'; lctx.fillRect(0, 0, 512, 128);
  lctx.fillStyle = '#ff8f00'; lctx.font = 'bold 72px monospace';
  lctx.textAlign = 'left';
  lctx.fillText('300', 25, 90);
  lctx.fillStyle = '#ffb300'; lctx.font = 'bold 36px "Noto Sans TC", sans-serif';
  lctx.fillText('靜宜大學 ⇄ 臺中車站', 165, 82);
  const ledTex = new THREE.CanvasTexture(ledC);
  ledTex.colorSpace = THREE.SRGBColorSpace;
  const ledMat = new THREE.MeshStandardMaterial({
    map: ledTex, emissive: 0xffb300, emissiveMap: ledTex, emissiveIntensity: 1.4
  });
  const frontLED = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.38, 0.1), ledMat);
  frontLED.position.set(0, 2.58, frontZ + 0.03);
  bus.add(frontLED);

  // 公車垂直矩陣前大燈 + 日行燈條
  [-1, 1].forEach(s => {
    // 燈罩座
    bus.add(box(0.26, 0.48, 0.06, dark, s * 0.85, 0.72, frontZ + 0.04));
    // 三顆垂直 LED 大燈
    for (let k = 0; k < 3; k++) {
      bus.add(box(0.18, 0.1, 0.04,
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4d6, emissiveIntensity: 1.8 }),
        s * 0.85, 0.58 + k * 0.13, frontZ + 0.07));
    }
    // 側邊後視鏡 (大型客車雙層兔耳鏡)
    const mirrorStem = box(0.35, 0.04, 0.04, dark, s * (W / 2 + 0.18), 2.3, frontZ - 0.2);
    bus.add(mirrorStem);
    const mirrorBox = box(0.08, 0.55, 0.18, dark, s * (W / 2 + 0.36), 2.1, frontZ - 0.2);
    bus.add(mirrorBox);
  });

  // 前保險桿與前車牌
  bus.add(box(W * 1.01, 0.28, 0.12, dark, 0, 0.42, frontZ + 0.06));
  addPlate(bus, 'KKA-3000', '#ffffff', '#111111', '#00897b', 0, 0.42, frontZ + 0.13, 0);

  // 3. 車頂冷氣空調機與通風逃生艙口 (Roof HVAC Units)
  const acMat = new THREE.MeshStandardMaterial({ color: 0xe0e6ed, roughness: 0.4 });
  // 前後雙冷氣機組
  [-1.2, 1.8].forEach(acZ => {
    bus.add(box(1.5, 0.28, 1.8, acMat, 0, H + 0.46, acZ));
    // 黑色散熱進氣排柵
    bus.add(box(1.2, 0.04, 0.8, dark, 0, H + 0.61, acZ));
  });
  // 車頂逃生天窗
  bus.add(box(0.7, 0.06, 0.7, whitePaint, 0, H + 0.35, -2.8));

  // 4. 車尾細節 (Rear Face)
  const rearZ = -L / 2;
  // 後景觀玻璃
  bus.add(box(W * 0.85, 0.65, 0.06, glass, 0, 2.1, rearZ - 0.02));
  // 車尾小型 LED 路線標示「300」
  const rLedC = document.createElement('canvas');
  rLedC.width = 128; rLedC.height = 64;
  const rlctx = rLedC.getContext('2d');
  rlctx.fillStyle = '#0a0a0c'; rlctx.fillRect(0, 0, 128, 64);
  rlctx.fillStyle = '#ff8f00'; rlctx.font = 'bold 44px monospace';
  rlctx.textAlign = 'center'; rlctx.textBaseline = 'middle';
  rlctx.fillText('300', 64, 32);
  const rLedTex = new THREE.CanvasTexture(rLedC);
  const rLedMat = new THREE.MeshStandardMaterial({
    map: rLedTex, emissive: 0xff8f00, emissiveMap: rLedTex, emissiveIntensity: 1.4
  });
  const rearLED = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.25, 0.06), rLedMat);
  rearLED.position.set(0, 2.62, rearZ - 0.02);
  bus.add(rearLED);

  // 車尾直立式三色尾燈條
  [-1, 1].forEach(s => {
    bus.add(box(0.12, 0.7, 0.05, dark, s * 0.95, 1.1, rearZ - 0.03));
    // 煞車紅燈、方向燈黃、倒車白
    bus.add(box(0.08, 0.26, 0.04,
      new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xff1744, emissiveIntensity: 1.6 }),
      s * 0.95, 1.28, rearZ - 0.05));
    bus.add(box(0.08, 0.16, 0.04,
      new THREE.MeshStandardMaterial({ color: 0xff9800, emissive: 0xff9800, emissiveIntensity: 1.2 }),
      s * 0.95, 1.05, rearZ - 0.05));
    bus.add(box(0.08, 0.14, 0.04,
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.0 }),
      s * 0.95, 0.88, rearZ - 0.05));
  });

  // 後車牌
  addPlate(bus, 'KKA-3000', '#ffffff', '#111111', '#00897b', 0, 0.52, rearZ - 0.04, Math.PI);

  // 5. 大型客車車輪 (前輪單軸，後輪雙軸或長輪距)
  // 前輪 Z: 2.75, 後輪 Z: -2.6
  addWheels(bus, W * 0.96, [[-1, 2.75], [1, 2.75], [-1, -2.6], [1, -2.6]], 0.48, 0.32, {
    spokes: 8, rimColor: 0xdde2e6, dark: false, caliperColor: 0x455a64
  });

  return finalize(bus, 0.86);
}

export { createWheel as buildDetailedWheel };

