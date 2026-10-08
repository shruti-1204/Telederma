/**
 * TeleDerma Medicine Alternative Finder
 * HTTP API Integration Tests
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const app = require('../src/server');

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app).listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe('Medicine API Endpoints', () => {
  it('GET /health returns 200 and healthy status', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'healthy');
  });

  it('GET /api/medicines/search?q=DemoDerm returns matching results', async () => {
    const res = await fetch(`${baseUrl}/api/medicines/search?q=DemoDerm`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.query.toLowerCase(), 'demoderm');
    assert.ok(data.results.length > 0);

    const first = data.results[0];
    assert.ok(first.id);
    assert.ok(first.brandName);
    assert.ok(first.productName);
    assert.ok(first.dosageForm);
  });

  it('GET /api/medicines/search without q query parameter returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/medicines/search`);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.ok(data.error.includes("Query parameter 'q' is required"));
  });

  it('GET /api/medicines/1 returns medicine details with disclaimer', async () => {
    const res = await fetch(`${baseUrl}/api/medicines/1`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.medicine.id, 1);
    assert.equal(data.medicine.brandName, 'DemoDerm');
    assert.ok(Array.isArray(data.medicine.activeIngredients));
    assert.ok(data.medicine.disclaimer.includes('Consult your dermatologist'));
  });

  it('GET /api/medicines/invalid-id returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/medicines/not-a-number`);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
  });

  it('GET /api/medicines/99999 returns 404 for non-existent medicine', async () => {
    const res = await fetch(`${baseUrl}/api/medicines/99999`);
    assert.equal(res.status, 404);
    const data = await res.json();
    assert.equal(data.success, false);
  });

  it('GET /api/medicines/1/alternatives returns sorted exact matches', async () => {
    const res = await fetch(`${baseUrl}/api/medicines/1/alternatives`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.targetMedicine.id, 1);
    assert.ok(data.alternatives.length > 0);

    // Verify target medicine excluded
    assert.ok(data.alternatives.every((alt) => alt.id !== 1));

    // Verify all returned alternatives have matchType EXACT_COMPOSITION
    assert.ok(data.alternatives.every((alt) => alt.matchType === 'EXACT_COMPOSITION'));

    // Verify sorting by price ascending
    for (let i = 0; i < data.alternatives.length - 1; i++) {
      const p1 = data.alternatives[i].price;
      const p2 = data.alternatives[i + 1].price;
      if (p1 !== null && p2 !== null) {
        assert.ok(p1 <= p2);
      }
    }
  });

  it('GET /api/medicines/99999/alternatives returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/medicines/99999/alternatives`);
    assert.equal(res.status, 404);
    const data = await res.json();
    assert.equal(data.success, false);
  });
});
