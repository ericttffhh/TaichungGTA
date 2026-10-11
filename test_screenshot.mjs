import { spawn } from 'child_process';
import fs from 'fs';

const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new',
  '--remote-debugging-port=9788',
  '--window-size=1280,720',
  '--autoplay-policy=no-user-gesture-required',
  'http://127.0.0.1:8080/index.html'
]);

async function main() {
  console.log('Connecting to Chrome DevTools on port 9788...');
  let targets = null;
  for (let i = 0; i < 30; i++) {
    try {
      await new Promise(r => setTimeout(r, 400));
      const res = await fetch('http://127.0.0.1:9788/json');
      const list = await res.json();
      const page = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) {
        targets = page;
        break;
      }
    } catch (e) {}
  }

  if (!targets?.webSocketDebuggerUrl) {
    console.error('Failed to get page debugger URL');
    chrome.kill();
    process.exit(1);
  }

  console.log('WebSocket CDP connected!');
  const ws = new WebSocket(targets.webSocketDebuggerUrl);
  let id = 1;
  const cbs = new Map();

  function send(method, params = {}) {
    return new Promise(res => {
      const curId = id++;
      cbs.set(curId, res);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });
  }

  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.method === 'Runtime.consoleAPICalled') {
      console.log('[BROWSER]', m.params.args.map(a => a.value || a.description).join(' '));
    }
    if (m.id && cbs.has(m.id)) {
      cbs.get(m.id)(m.result);
      cbs.delete(m.id);
    }
  };

  await new Promise(r => (ws.onopen = r));
  await send('Runtime.enable');
  await send('Page.enable');

  console.log('Waiting for loader to reach 100%...');
  let reachedReady = false;
  for (let i = 0; i < 400; i++) {
    await new Promise(r => setTimeout(r, 600));
    const evalRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const box = document.getElementById('ld-ready-box');
        const pctEl = document.getElementById('ld-pct');
        const pct = pctEl ? pctEl.textContent : '';
        const isReady = box && !box.classList.contains('hidden');
        return { pct, ready: !!isReady };
      })()`,
      returnByValue: true
    });
    const val = evalRes?.result?.value;
    if (i % 5 === 0) console.log(`Progress: ${val?.pct || '0%'} (ready: ${val?.ready})`);
    if (val?.ready) {
      console.log('Loader 100% complete! Clicking enter game button...');
      await send('Runtime.evaluate', { expression: 'document.getElementById("btn-enter-game")?.click()' });
      reachedReady = true;
      break;
    }
  }

  if (!reachedReady) {
    console.warn('Warning: loader did not reach ready state in time!');
  }

  console.log('Waiting for HUD and 3D scene to activate...');
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 500));
    const hudRes = await send('Runtime.evaluate', {
      expression: '!document.getElementById("hud")?.classList.contains("hidden")',
      returnByValue: true
    });
    if (hudRes?.result?.value) {
      console.log('HUD active! 3D scene rendering!');
      break;
    }
  }

  // Wait 3 seconds for camera and meshes to settle
  console.log('Waiting 3 seconds for camera and textures to settle...');
  await new Promise(r => setTimeout(r, 3000));

  console.log('--- TEST 1: GTA 街頭任務 [Q] ---');
  await send('Runtime.evaluate', {
    expression: 'window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyQ" }))'
  });
  await new Promise(r => setTimeout(r, 1000));

  console.log('--- TEST 2: GTA 車窗鳴槍 [J] 觸發 1 星通緝 ---');
  await send('Runtime.evaluate', {
    expression: 'window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyJ" }))'
  });
  await new Promise(r => setTimeout(r, 800));

  console.log('--- TEST 3: 駕駛行駛 [W] 加速 ---');
  await send('Runtime.evaluate', {
    expression: 'window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }))'
  });
  await new Promise(r => setTimeout(r, 2200));
  await send('Runtime.evaluate', {
    expression: 'window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW" }))'
  });
  await new Promise(r => setTimeout(r, 1200));

  const scr1 = await send('Page.captureScreenshot', { format: 'png' });
  if (scr1?.data) {
    fs.writeFileSync('/Users/test/Desktop/gta/in_game_street_view.png', Buffer.from(scr1.data, 'base64'));
    console.log('Successfully saved /Users/test/Desktop/gta/in_game_street_view.png!');
  }

  console.log('--- TEST 4: [T] 道路傳送測試 ---');
  await send('Runtime.evaluate', {
    expression: 'window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyT" }))'
  });
  await new Promise(r => setTimeout(r, 2500));

  const fpsEval = await send('Runtime.evaluate', {
    expression: `new Promise(resolve => {
      let frames = 0;
      const start = performance.now();
      function count() {
        frames++;
        if (performance.now() - start < 1000) {
          requestAnimationFrame(count);
        } else {
          resolve(Math.round(frames * 1000 / (performance.now() - start)));
        }
      }
      requestAnimationFrame(count);
    })`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('⚡ Measured Realtime FPS:', fpsEval?.result?.value);

  const diagEval = await send('Runtime.evaluate', {
    expression: `new Promise(resolve => {
      const app = window.taichungApp;
      const calls = app.renderer.info.render.calls;
      const triangles = app.renderer.info.render.triangles;
      const geometries = app.renderer.info.memory.geometries;

      let tPhysics = 0, tVehicle = 0, tChunk = 0, tMinimap = 0, tTraffic = 0, tPed = 0, tProps = 0, tGta = 0, tRender = 0;
      const N = 20;
      for (let i = 0; i < N; i++) {
        let t0 = performance.now();
        app.physicsWorld.step(1/60);
        let t1 = performance.now();
        app.vehicle.update(app.inputs, 1/60);
        let t2 = performance.now();
        const carPos = app.vehicle.meshGroup.position;
        app.chunkManager.update(carPos, 1/60, app.vehicle.body);
        let t3 = performance.now();
        app.drawMinimap(carPos);
        let t4 = performance.now();
        app.gtaManager.update(1/60);
        let t5 = performance.now();
        app.streetPropsSystem.update(1/60);
        let t6 = performance.now();
        app.trafficSystem.update(1/60, app.vehicle);
        let t7 = performance.now();
        app.pedestrianSystem.update(1/60, app.vehicle);
        let t8 = performance.now();
        app.renderer.render(app.scene, app.camera);
        let t9 = performance.now();

        tPhysics += (t1 - t0);
        tVehicle += (t2 - t1);
        tChunk += (t3 - t2);
        tMinimap += (t4 - t3);
        tGta += (t5 - t4);
        tProps += (t6 - t5);
        tTraffic += (t7 - t6);
        tPed += (t8 - t7);
        tRender += (t9 - t8);
      }

      resolve({
        calls,
        triangles,
        geometries,
        breakdown: {
          physicsMs: +(tPhysics / N).toFixed(2),
          vehicleMs: +(tVehicle / N).toFixed(2),
          chunkMs: +(tChunk / N).toFixed(2),
          minimapMs: +(tMinimap / N).toFixed(2),
          gtaMs: +(tGta / N).toFixed(2),
          propsMs: +(tProps / N).toFixed(2),
          trafficMs: +(tTraffic / N).toFixed(2),
          pedMs: +(tPed / N).toFixed(2),
          renderMs: +(tRender / N).toFixed(2),
          totalFrameMs: +((tPhysics + tVehicle + tChunk + tMinimap + tGta + tProps + tTraffic + tPed + tRender) / N).toFixed(2)
        }
      });
    })`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('⚡ Diagnostics:', JSON.stringify(diagEval?.result?.value, null, 2));

  const statusEval = await send('Runtime.evaluate', {
    expression: `(() => {
      const app = window.taichungApp;
      return {
        wanted: app?.gtaManager?.wantedStars,
        cash: app?.gtaManager?.cash,
        speed: app?.vehicle?.speed,
        carPos: app?.vehicle?.body?.position,
        roadName: app?.locationName?.textContent,
        activeChunks: app?.chunkManager?.activeChunks?.size
      };
    })()`,
    returnByValue: true
  });
  console.log('GTA State Check:', JSON.stringify(statusEval?.result?.value, null, 2));

  console.log('Capturing in-game screenshot...');
  const scr = await send('Page.captureScreenshot', { format: 'png' });
  if (scr?.data) {
    fs.writeFileSync('/Users/test/Desktop/gta/verify_gta_features.png', Buffer.from(scr.data, 'base64'));
    console.log('Successfully saved /Users/test/Desktop/gta/verify_gta_features.png!');
  }

  chrome.kill();
  process.exit(0);
}

main().catch(err => {
  console.error('Error during capture:', err);
  chrome.kill();
  process.exit(1);
});
