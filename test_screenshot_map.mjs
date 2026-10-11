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

  // Wait 3 seconds in game
  await new Promise(r => setTimeout(r, 3000));

  // Click btn-open-map to open Google Maps
  console.log('Opening Google Maps modal...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      document.getElementById('btn-open-map')?.click();
    })()`
  });

  await new Promise(r => setTimeout(r, 1500));

  console.log('Capturing map screenshot...');
  const scr = await send('Page.captureScreenshot', { format: 'png' });
  if (scr?.data) {
    fs.writeFileSync('/Users/test/Desktop/gta/verify_map_outlines.png', Buffer.from(scr.data, 'base64'));
    console.log('Successfully saved /Users/test/Desktop/gta/verify_map_outlines.png!');
  }

  chrome.kill();
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  chrome.kill();
  process.exit(1);
});
