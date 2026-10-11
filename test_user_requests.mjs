import { spawn } from 'child_process';
import fs from 'fs';

const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new',
  '--remote-debugging-port=9789',
  '--window-size=1280,720',
  '--autoplay-policy=no-user-gesture-required',
  'http://127.0.0.1:8080/index.html'
]);

async function main() {
  console.log('Connecting to Chrome DevTools on port 9789...');
  let targets = null;
  for (let i = 0; i < 30; i++) {
    try {
      await new Promise(r => setTimeout(r, 400));
      const res = await fetch('http://127.0.0.1:9789/json');
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
      const text = m.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
      if (!text.includes('[TaichungRush] 串流 Chunk')) {
        console.log('[BROWSER]', text);
      }
    }
    if (m.id && cbs.has(m.id)) {
      cbs.get(m.id)(m.result);
      cbs.delete(m.id);
    }
  };

  await new Promise(r => (ws.onopen = r));
  await send('Runtime.enable');
  await send('Page.enable');

  console.log('Waiting for loader to reach ready state...');
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
      console.log('Loader complete! Entering game...');
      await send('Runtime.evaluate', { expression: 'document.getElementById("btn-enter-game")?.click()' });
      break;
    }
  }

  await new Promise(r => setTimeout(r, 2000));

  // 1. Verify Daqing station road network
  console.log('Verifying Daqing road network...');
  const daqingRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const app = window.gameApp || window.taichungApp;
      if (!app || !app.roadSegments) return { error: 'No roadSegments', appExists: !!app };
      const daqingX = -3833.7, daqingZ = 2118.2;
      const nearRoads = app.roadSegments.filter(r => {
        return r.points.some(p => Math.hypot(p.x - daqingX, p.z - daqingZ) < 1200);
      });
      return {
        totalRoadSegments: app.roadSegments.length,
        daqingRoadsCount: nearRoads.length,
        sampleRoadNames: [...new Set(nearRoads.map(r => r.name).filter(Boolean))].slice(0, 10)
      };
    })()`,
    returnByValue: true
  });
  console.log('Daqing roads info:', JSON.stringify(daqingRes?.result?.value, null, 2));

  // 2. Verify traffic lights & crossroads
  console.log('Verifying traffic lights & crossroads...');
  const trafficLightRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const app = window.gameApp || window.taichungApp;
      const lightsCount = app?.streetPropsSystem?.lightPositions?.length || 0;
      const junctionCount = app?.junctionList?.length || 0;
      return { lightsCount, junctionCount };
    })()`,
    returnByValue: true
  });
  console.log('Traffic lights info:', JSON.stringify(trafficLightRes?.result?.value, null, 2));

  // 3. Verify pedestrians and hit/wanted
  console.log('Verifying pedestrians...');
  const pedRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const app = window.gameApp || window.taichungApp;
      const peds = app?.pedestrianSystem?.pedestrians || [];
      return {
        totalPedestrians: peds.length,
        activePositions: peds.slice(0, 5).map(p => ({
          x: Math.round(p.group.position.x),
          z: Math.round(p.group.position.z),
          state: p.state,
          isPolice: p.isPolice
        }))
      };
    })()`,
    returnByValue: true
  });
  console.log('Pedestrians info:', JSON.stringify(pedRes?.result?.value, null, 2));

  // Teleport player near Daqing Station to capture Daqing road network
  console.log('Teleporting to Daqing Station...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const app = window.gameApp || window.taichungApp;
      const daqingX = -3833.7, daqingZ = 2118.2;
      if (app && app.vehicle) {
        app.vehicle.body.position.set(daqingX + 15, 1.8, daqingZ + 35);
        app.vehicle.body.velocity.set(0, 0, 0);
        app.vehicle.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -0.7);
        app.chunkManager.update({ x: daqingX + 15, y: 1.8, z: daqingZ + 35 }, 0.016);
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 2200));

  const screenShot2 = await send('Page.captureScreenshot', { format: 'png' });
  if (screenShot2?.data) {
    fs.writeFileSync('verify_daqing_roads.png', Buffer.from(screenShot2.data, 'base64'));
    console.log('Saved verify_daqing_roads.png');
  }

  // Teleport back near city center crossroads to capture traffic lights and rounded sidewalks
  console.log('Positioning camera at intersection with traffic light and pedestrians...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const app = window.gameApp || window.taichungApp;
      const j = app.junctionList.find(j => j.connectedCount >= 4 && Math.hypot(j.x, j.z) > 120 && Math.hypot(j.x, j.z) < 600) || app.junctionList[0];
      if (j && app.vehicle) {
        app.vehicle.body.position.set(j.x, 1.2, j.z - 18);
        app.vehicle.body.velocity.set(0, 0, 0);
        app.vehicle.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), 0);
        app.chunkManager.update({ x: j.x, y: 1.2, z: j.z - 18 }, 0.016);
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  const screenShot1 = await send('Page.captureScreenshot', { format: 'png' });
  if (screenShot1?.data) {
    fs.writeFileSync('verify_intersection_lights.png', Buffer.from(screenShot1.data, 'base64'));
    console.log('Saved verify_intersection_lights.png');
  }

  // Test pedestrian hit collision
  console.log('Testing pedestrian hit collision...');
  const hitTestRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const app = window.gameApp || window.taichungApp;
      if (!app || !app.pedestrianSystem) return 'No pedestrianSystem';
      const ped = app.pedestrianSystem.pedestrians[0];
      if (!ped) return 'No ped';
      const v = app.vehicle;
      if (v) {
        // Place ped right in front of vehicle
        ped.group.position.set(v.body.position.x, 0.22, v.body.position.z + 1.2);
        ped.state = 'walking';
        v.body.velocity.set(0, 0, 12); // ~43 km/h
        app.pedestrianSystem.update(0.05, v);
        return {
          pedState: ped.state,
          pedVy: Math.round(ped.vy),
          wantedStars: app.gtaManager?.wantedStars,
          cash: app.gtaManager?.cash
        };
      }
      return 'No vehicle';
    })()`,
    returnByValue: true
  });
  console.log('Hit collision test result:', JSON.stringify(hitTestRes?.result?.value, null, 2));

  await new Promise(r => setTimeout(r, 500));
  const screenShot3 = await send('Page.captureScreenshot', { format: 'png' });
  if (screenShot3?.data) {
    fs.writeFileSync('verify_pedestrian_hit.png', Buffer.from(screenShot3.data, 'base64'));
    console.log('Saved verify_pedestrian_hit.png');
  }

  ws.close();
  chrome.kill();
  console.log('All tests completed successfully!');
}

main().catch(err => {
  console.error(err);
  chrome.kill();
  process.exit(1);
});
