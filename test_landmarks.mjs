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
  console.log('Connecting to Chrome on port 9788...');
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
    console.error('Failed to get debugger URL');
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
      console.log('[BROWSER]', m.params.args.map(a => a.value !== undefined ? a.value : a.description).join(' '));
    }
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      console.error('[EXCEPTION]', d?.text, d?.url, d?.lineNumber, d?.columnNumber, d?.exception?.description);
    }
    if (m.id && cbs.has(m.id)) {
      cbs.get(m.id)(m.result);
      cbs.delete(m.id);
    }
  };

  await new Promise(r => (ws.onopen = r));
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: 'http://127.0.0.1:8080/index.html' });

  console.log('Waiting for loader to reach 100%...');
  let reachedReady = false;
  for (let i = 0; i < 400; i++) {
    await new Promise(r => setTimeout(r, 600));
    const evalRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const box = document.getElementById('ld-ready-box');
        const pctEl = document.getElementById('ld-pct');
        const pct = pctEl ? pctEl.textContent : '';
        const ready = box && !box.classList.contains('hidden');
        return { pct, ready };
      })()`,
      returnByValue: true
    });
    const res = evalRes?.result?.value;
    if (i % 5 === 0) console.log(`Loader status [${i}]:`, res);
    if (res?.ready) {
      console.log('Loader complete! Clicking enter game...');
      await send('Runtime.evaluate', { expression: 'document.getElementById("btn-enter-game")?.click()' });
      reachedReady = true;
      break;
    }
  }

  if (!reachedReady) {
    console.error('Loader did not finish in time!');
    ws.close();
    chrome.kill();
    process.exit(1);
  }

  await new Promise(r => setTimeout(r, 2000));

  // Query landmarks list in window.taichungApp
  const lmRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const app = window.taichungApp;
      if (!app) return { error: "No taichungApp" };
      return {
        count: app.landmarks ? app.landmarks.length : 0,
        landmarks: app.landmarks.map(l => ({ id: l.id, name: l.name, pos: [Math.round(l.x), Math.round(l.z)] }))
      };
    })()`,
    returnByValue: true
  });
  console.log('Registered Landmarks:', JSON.stringify(lmRes?.result?.value, null, 2));

  const testList = [
    { id: 'taichung_park', file: 'screenshot_taichung_park.png', name: '台中公園 湖心亭' },
    { id: 'miyahara', file: 'screenshot_miyahara.png', name: '宮原眼科' },
    { id: 'second_market', file: 'screenshot_second_market.png', name: '台中第二市場 六角樓' },
    { id: 'taichung_theater', file: 'screenshot_theater.png', name: '台中國家歌劇院' },
    { id: 'luce_chapel', file: 'screenshot_luce_chapel.png', name: '東海大學 路思義教堂' }
  ];

  for (const item of testList) {
    console.log(`Teleporting to ${item.name} (${item.id})...`);
    await send('Runtime.evaluate', {
      expression: `(() => {
        const app = window.taichungApp;
        app.teleportToLandmark("${item.id}");
        const lm = app.landmarks.find(l => l.id === "${item.id}");
        if (lm && app.vehicle?.body) {
          const dx = lm.x - app.vehicle.body.position.x;
          const dz = lm.z - app.vehicle.body.position.z;
          const yaw = Math.atan2(dx, dz);
          app.vehicle.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), yaw);
          if (app.camera) {
            // position camera slightly behind and looking at landmark
            app.camera.position.set(app.vehicle.body.position.x - dx*0.3, 8, app.vehicle.body.position.z - dz*0.3);
            app.camera.lookAt(lm.x, 6, lm.z);
          }
        }
      })()`
    });
    // Wait for chunk streaming to load around new location
    await new Promise(r => setTimeout(r, 2500));

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    if (shot?.data) {
      fs.writeFileSync(`/Users/test/Desktop/gta/${item.file}`, Buffer.from(shot.data, 'base64'));
      console.log(`Successfully saved /Users/test/Desktop/gta/${item.file}`);
    }
  }

  ws.close();
  chrome.kill();
  console.log('All landmark tests completed!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  chrome.kill();
  process.exit(1);
});
