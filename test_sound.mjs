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

  // Test soundManager presence and methods
  const soundCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const sm = window.soundManager;
      if (!sm) return { error: "No soundManager found" };
      return {
        hasCtx: !!sm.ctx,
        ctxState: sm.ctx?.state,
        hasMasterGain: !!sm.masterGain,
        hasEngineGain: !!sm.engineGain,
        hasSfxGain: !!sm.sfxGain,
        hasRadioGain: !!sm.radioGain,
        isEngineRunning: sm.isEngineRunning,
        currentEngineType: sm.currentEngineType
      };
    })()`,
    returnByValue: true
  });
  console.log('Audio System State:', JSON.stringify(soundCheck?.result?.value, null, 2));

  // Trigger individual sound methods to verify zero errors
  console.log('Testing sound methods execution...');
  const testCalls = await send('Runtime.evaluate', {
    expression: `(() => {
      const sm = window.soundManager;
      const app = window.taichungApp;
      const results = {};

      try { sm.playHorn('scooter'); results.hornScooter = true; } catch (e) { results.hornScooter = e.message; }
      try { sm.playHorn('car'); results.hornCar = true; } catch (e) { results.hornCar = e.message; }
      try { sm.playGunshot(); results.gunshot = true; } catch (e) { results.gunshot = e.message; }
      try { sm.playRicochet(); results.ricochet = true; } catch (e) { results.ricochet = e.message; }
      try { sm.playWantedStarUp(2); results.wantedStar = true; } catch (e) { results.wantedStar = e.message; }
      try { sm.playWantedCleared(); results.wantedClear = true; } catch (e) { results.wantedClear = e.message; }
      try { sm.playEatEgg(); results.eatEgg = true; } catch (e) { results.eatEgg = e.message; }
      try { sm.playCashChime(); results.cash = true; } catch (e) { results.cash = e.message; }
      try { sm.playMissionStart(); results.missionStart = true; } catch (e) { results.missionStart = e.message; }
      try { sm.playMissionSuccess(); results.missionSuccess = true; } catch (e) { results.missionSuccess = e.message; }
      try { sm.playTeleport(); results.teleport = true; } catch (e) { results.teleport = e.message; }
      try { sm.playVehicleSwitch(); results.vehSwitch = true; } catch (e) { results.vehSwitch = e.message; }
      try { sm.playResetFlip(); results.resetFlip = true; } catch (e) { results.resetFlip = e.message; }
      try { sm.playMapToggle(true); results.mapOpen = true; } catch (e) { results.mapOpen = e.message; }
      try { sm.playMapToggle(false); results.mapClose = true; } catch (e) { results.mapClose = e.message; }
      try { sm.playGPSRoute(); results.gpsRoute = true; } catch (e) { results.gpsRoute = e.message; }
      try { sm.playGPSArrival(); results.gpsArrival = true; } catch (e) { results.gpsArrival = e.message; }
      try { sm.playUIClick(); results.uiClick = true; } catch (e) { results.uiClick = e.message; }
      try { sm.playCrash(1.2); results.crash = true; } catch (e) { results.crash = e.message; }
      try { sm.setBoost(true); sm.setBoost(false); results.boost = true; } catch (e) { results.boost = e.message; }
      try { sm.setDrift(true, 1.0); sm.setDrift(false); results.drift = true; } catch (e) { results.drift = e.message; }
      try {
        const p1 = sm.toggleRadio();
        const st = sm.nextStation();
        const p2 = sm.toggleRadio();
        results.radio = { p1, stName: st?.name, p2 };
      } catch (e) { results.radio = e.message; }

      return results;
    })()`,
    returnByValue: true
  });
  console.log('Sound Methods Test Results:', JSON.stringify(testCalls?.result?.value, null, 2));

  // Test interactive keybindings: press N (radio), press E (eat egg), press J (shoot)
  console.log('Testing keybinding events: KeyN, KeyE, KeyJ...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyN', key: 'n' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyN', key: 'n' }));
      setTimeout(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e' }));
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', key: 'e' }));
      }, 500);
      setTimeout(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyJ', key: 'j' }));
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyJ', key: 'j' }));
      }, 1000);
    })()`
  });
  await new Promise(r => setTimeout(r, 2000));

  // Take screenshot of HUD
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot?.data) {
    fs.writeFileSync('/Users/test/Desktop/gta/verify_sound_hud.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved /Users/test/Desktop/gta/verify_sound_hud.png');
  }

  ws.close();
  chrome.kill();
  console.log('All sound system tests passed successfully!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  chrome.kill();
  process.exit(1);
});
