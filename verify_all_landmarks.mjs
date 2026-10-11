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

  const ws = new WebSocket(targets.webSocketDebuggerUrl);
  let id = 1;
  const cbs = new Map();
  function send(method, params = {}) {
    return new Promise(r => {
      const curId = id++;
      cbs.set(curId, r);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });
  }
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && cbs.has(m.id)) {
      cbs.get(m.id)(m.result);
      cbs.delete(m.id);
    }
  };
  await new Promise(r => (ws.onopen = r));
  await send('Runtime.enable');
  await send('Page.enable');

  console.log('Waiting for loader to reach 100%...');
  for (let i = 0; i < 400; i++) {
    await new Promise(r => setTimeout(r, 600));
    const evalRes = await send('Runtime.evaluate', {
      expression: '!!document.getElementById("btn-enter-game")',
      returnByValue: true
    });
    if (evalRes?.result?.value) {
      await send('Runtime.evaluate', { expression: 'document.getElementById("btn-enter-game")?.click()' });
      break;
    }
  }

  await new Promise(r => setTimeout(r, 4000));

  const landmarkIds = [
    'taichung_station',
    'lifang_aimei',
    'asia_grand_hotel',
    'museum_fine_arts',
    'taichung_park',
    'taichung_theater',
    'luce_chapel',
    'miyahara',
    'daqing_station'
  ];

  for (const lid of landmarkIds) {
    console.log(`Teleporting to landmark: ${lid}...`);
    await send('Runtime.evaluate', {
      expression: `window.gameApp.teleportToLandmark('${lid}')`
    });
    // Wait for chunks to load and camera to settle
    await new Promise(r => setTimeout(r, 2500));

    const scr = await send('Page.captureScreenshot', { format: 'png' });
    if (scr?.data) {
      fs.writeFileSync(`verify_${lid}.png`, Buffer.from(scr.data, 'base64'));
      console.log(`Saved verify_${lid}.png`);
    }
  }

  chrome.kill();
  process.exit(0);
}
main();
