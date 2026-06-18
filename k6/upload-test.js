import http from 'k6/http';
import { check, sleep } from 'k6';
import { FormData } from 'https://jslib.k6.io/formdata/0.0.2/index.js';

/**
 * k6 Performance Test — DataShare Upload Endpoint
 *
 * Usage:
 *   k6 run k6/upload-test.js
 *
 * Prerequisites:
 *   - Docker Compose stack running (make up)
 *   - At least one registered user
 */

const BASE_URL = __ENV.BASE_URL || 'https://localhost';
const EMAIL = __ENV.TEST_EMAIL || 'perf@test.com';
const PASSWORD = __ENV.TEST_PASSWORD || 'perftest123';

export const options = {
  stages: [
    { duration: '5s', target: 10 },   // ramp up to 10 VUs
    { duration: '20s', target: 10 },  // steady state
    { duration: '5s', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% under 2s
    http_req_failed: ['rate<0.05'],    // < 5% errors
  },
  insecureSkipTLSVerify: true,
};

// Setup: register + login to get JWT
export function setup() {
  // Try register (may fail if user exists — that's OK)
  http.post(`${BASE_URL}/api/auth/register`, JSON.stringify({
    email: EMAIL,
    password: PASSWORD,
  }), { headers: { 'Content-Type': 'application/json' } });

  // Login
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: EMAIL,
    password: PASSWORD,
  }), { headers: { 'Content-Type': 'application/json' } });

  const body = JSON.parse(loginRes.body);
  return { token: body.accessToken };
}

// Generate a random 100KB buffer as test file content
function generateFileContent() {
  const size = 100 * 1024; // 100KB
  let content = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < size; i++) {
    content += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return content;
}

export default function (data) {
  const headers = { Authorization: `Bearer ${data.token}` };

  // === Test 1: Upload file ===
  const fd = new FormData();
  fd.append('file', http.file(generateFileContent(), `test-${__VU}-${__ITER}.txt`, 'text/plain'));

  const uploadRes = http.post(`${BASE_URL}/api/files/upload`, fd.body(), {
    headers: Object.assign({}, headers, { 'Content-Type': `multipart/form-data; boundary=${fd.boundary}` }),
    tags: { name: 'upload' },
  });

  check(uploadRes, {
    'upload status 201': (r) => r.status === 201,
    'upload has file id': (r) => JSON.parse(r.body).id !== undefined,
  });

  sleep(0.5);

  // === Test 2: List files ===
  const listRes = http.get(`${BASE_URL}/api/files?page=1&limit=10`, {
    headers,
    tags: { name: 'list' },
  });

  check(listRes, {
    'list status 200': (r) => r.status === 200,
  });

  sleep(0.3);
}
