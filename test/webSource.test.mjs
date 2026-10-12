// node --test (see package.json). Pure functions only: no database.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webSourceFor, hostLabel, summariseAcquisition } from '../lib/acquisition.js';

test('without a marketing cookie, entering through the Foundry module beats the app referrer', () => {
  // A GM who clicks Connect inside a self-hosted or Forge-hosted Foundry.
  assert.equal(webSourceFor({ platform: 'web', entry: 'foundry', referrer: '192.168.1.20' }), 'Foundry module');
  assert.equal(webSourceFor({ platform: 'web', entry: 'foundry', referrer: 'mygame.forge-vtt.com' }), 'Foundry module');
});

test('without a marketing cookie, entering through the Foundry module beats an app utm tag', () => {
  assert.equal(webSourceFor({ platform: 'web', entry: 'foundry', utm_source: 'reddit', referrer: 'localhost' }), 'Foundry module');
});

test('without a marketing cookie, entering through the Discord bot beats the app referrer', () => {
  assert.equal(webSourceFor({ platform: 'web', entry: 'discord', referrer: 'discord.com' }), 'Discord bot');
});

test("the marketing site's first visit still comes first", () => {
  assert.equal(webSourceFor({ entry: 'foundry', referrer: 'localhost', site: { ref: 'www.google.com', landing: '/' } }), 'Google');
  assert.equal(webSourceFor({ entry: 'foundry', referrer: 'localhost', site: { utm_source: 'reddit' } }), 'Reddit');
  assert.equal(webSourceFor({ entry: 'home', referrer: 'www.bing.com' }), 'Bing');
  assert.equal(webSourceFor({ entry: 'home' }), 'Direct');
});

test('The Forge and self-hosted Foundry servers are labelled Foundry VTT', () => {
  assert.equal(hostLabel('forge-vtt.com'), 'Foundry VTT');
  assert.equal(hostLabel('mygame.forge-vtt.com'), 'Foundry VTT');
  assert.equal(hostLabel('192.168.1.20'), 'Foundry VTT');
  assert.equal(hostLabel('localhost'), 'Foundry VTT');
  assert.equal(hostLabel('foundryvtt.com'), 'Foundry VTT');
});

test('a Foundry Connect signup lands under Foundry module on the Acquisition tab', () => {
  const today = new Date().toISOString().slice(0, 10);
  const row = { date: today, created_at: new Date(), source: { platform: 'web', entry: 'foundry', referrer: '10.0.0.5' } };
  assert.deepEqual(summariseAcquisition([row], 7).sources, [{ label: 'Foundry module', count: 1 }]);
});
