import { spawn } from 'child_process';

const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new',
  '--remote-debugging-port=9790',
  '--window-size=1280,720',
  'http://127.0.0.1:8080/index.html'
]);

async function run() {
  await new Promise(r => setTimeout(r, 1500));
  let targets = null;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9790/json');
      const list = await res.json();
      const page = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) { targets = page; break; }
    } catch(e) {}
    await new Promise(r => setTimeout(r, 400));
  }
  if (!targets) {
    console.error('No debugger target');
    chrome.kill();
    process.exit(1);
  }

  const ws = new WebSocket(targets.webSocketDebuggerUrl);
  let id = 1;
  const cbs = new Map();
  const send = (method, params = {}) => new Promise(res => {
    const curId = id++;
    cbs.set(curId, res);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && cbs.has(m.id)) {
      cbs.get(m.id)(m.result);
      cbs.delete(m.id);
    }
  };
  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable');

  console.log('Waiting for loader...');
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 500));
    const evalRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const box = document.getElementById('ld-ready-box');
        return box && !box.classList.contains('hidden');
      })()`,
      returnByValue: true
    });
    if (evalRes?.result?.value) {
      console.log('Loader complete! Entering game...');
      await send('Runtime.evaluate', { expression: 'document.getElementById("btn-enter-game")?.click()' });
      break;
    }
  }

  // Wait for HUD
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 500));
    const hudRes = await send('Runtime.evaluate', {
      expression: '!document.getElementById("hud")?.classList.contains("hidden")',
      returnByValue: true
    });
    if (hudRes?.result?.value) {
      console.log('HUD active!');
      break;
    }
  }

  await new Promise(r => setTimeout(r, 3000));

  const infoRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const app = window.taichungApp;
      return {
        renderCalls: app.renderer.info.render.calls,
        triangles: app.renderer.info.render.triangles,
        lines: app.renderer.info.render.lines,
        geometries: app.renderer.info.memory.geometries,
        textures: app.renderer.info.memory.textures,
        sceneChildren: app.scene.children.length,
        roadMeshVerts: app.roadMesh?.geometry?.attributes?.position?.count,
        sidewalkVerts: app.sidewalkMesh?.geometry?.attributes?.position?.count,
        crossroadVerts: app.crossroadMesh?.geometry?.attributes?.position?.count
      };
    })()`,
    returnByValue: true
  });
  console.log('RENDER INFO:', infoRes?.result?.value);

  const perfRes = await send('Runtime.evaluate', {
    expression: `new Promise(resolve => {
      const app = window.taichungApp;
      let tPhysics = 0, tVehicle = 0, tChunk = 0, tMinimap = 0, tTraffic = 0, tPed = 0, tProps = 0, tGta = 0, tRender = 0;
      const N = 30;
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
      });
    })`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('PERF BREAKDOWN:', perfRes?.result?.value);

  chrome.kill();
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  chrome.kill();
  process.exit(1);
});
