// node --test (see package.json). Pure functions only: no database.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isFoundryFirstTouch, isFoundryHost } from '../lib/acquisition.js';

test('entering through the /foundry pairing page is a Foundry first touch', () => {
  assert.equal(isFoundryFirstTouch({ platform: 'web', entry: 'foundry', landing: '/foundry' }), true);
});

test('a Foundry server as the app referrer is a Foundry first touch', () => {
  for (const referrer of ['localhost', '127.0.0.1', '192.168.1.20', '10.0.0.5', '172.20.3.4', '[::1]', 'fd12:3456:789a::1',
    'mygame.forge-vtt.com', 'forge-vtt.com', 'foundryvtt.com', 'http://192.168.1.20:30000/game']) {
    assert.equal(isFoundryFirstTouch({ entry: 'home', referrer }), true, referrer);
  }
});

test("the marketing site's first referrer or utm tag can point at Foundry", () => {
  assert.equal(isFoundryFirstTouch({ entry: 'home', referrer: 'www.d20-loot-tracker.com', site: { ref: 'foundryvtt.com', landing: '/' } }), true);
  assert.equal(isFoundryFirstTouch({ entry: 'home', site: { utm_source: 'Foundry', landing: '/' } }), true);
  assert.equal(isFoundryFirstTouch({ entry: 'home', utm_source: 'foundry' }), true);
});

test("a first landing on one of the marketing site's Foundry pages is a Foundry first touch", () => {
  for (const landing of ['/foundry-vtt-loot-tracker', '/guides/foundry-vtt-module-guide', '/vs/foundry-vtt-loot-tracker/', '/foundry-vtt-loot-tracker?x=1']) {
    assert.equal(isFoundryFirstTouch({ entry: 'home', referrer: 'www.d20-loot-tracker.com', site: { ref: 'www.google.com', landing } }), true, landing);
  }
});

test('other first touches are not Foundry', () => {
  const cases = [
    null,
    undefined,
    {},
    { entry: 'home', referrer: 'www.google.com' },
    { entry: 'invite', landing: '/' },
    { entry: 'home', referrer: 'www.d20-loot-tracker.com', site: { ref: 'www.google.com', landing: '/pathfinder-1e-loot-tracker' } },
    { entry: 'home', utm_source: 'reddit' },
    { entry: 'home', referrer: '8.8.8.8' },
    { entry: 'home', referrer: '172.32.0.1' },
    { entry: 'home', referrer: 'notforge-vtt.com' },
    { entry: 'home', referrer: 'forge-vtt.com.example.net' },
    { entry: 'home', referrer: 'fc::1' },
  ];
  for (const source of cases) assert.equal(isFoundryFirstTouch(source), false, JSON.stringify(source));
});

test('isFoundryHost ignores scheme, port and path', () => {
  assert.equal(isFoundryHost('https://game.forge-vtt.com/game'), true);
  assert.equal(isFoundryHost('localhost:30000'), true);
  assert.equal(isFoundryHost('https://www.google.com/'), false);
});
