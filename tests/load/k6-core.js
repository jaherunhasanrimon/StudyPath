import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * k6 Load Test — Dishari Core Student Flow (architecture.md §12 & phases.md §1 Phase 6)
 * Simulates 100 concurrent users accessing Home, Legal, and Plan Preview.
 *
 * Execution:
 *   k6 run tests/load/k6-core.js
 */

export const options = {
  stages: [
    { duration: '20s', target: 20 },  // Ramp-up to 20 users
    { duration: '30s', target: 100 }, // Ramp-up to 100 concurrent users
    { duration: '1m', target: 100 },  // Sustained peak load
    { duration: '20s', target: 0 },   // Ramp-down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<400'], // 95% of requests under 400ms
    http_req_failed: ['rate<0.01'],    // Under 1% failures
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function loadTest() {
  // 1. Home page check
  const homeRes = http.get(`${BASE_URL}/`);
  check(homeRes, {
    'home status is 200': (r) => r.status === 200,
    'home renders within 300ms': (r) => r.timings.duration < 300,
  });

  sleep(1);

  // 2. Privacy Policy check (PDPA 2026 disclosure)
  const privacyRes = http.get(`${BASE_URL}/privacy`);
  check(privacyRes, {
    'privacy status is 200': (r) => r.status === 200,
  });

  sleep(1);

  // 3. Terms of Service check
  const termsRes = http.get(`${BASE_URL}/terms`);
  check(termsRes, {
    'terms status is 200': (r) => r.status === 200,
  });

  sleep(1);

  // 4. Pure schedule preview POST
  const previewPayload = JSON.stringify({
    playlistId: 'mock-pl-hsc-math',
    startDate: '2026-11-21',
    dailyMinutes: 60,
    studyDays: ['Saturday', 'Sunday', 'Tuesday', 'Wednesday'],
    cadence: { quizEveryNClasses: 3, assignmentEveryNClasses: 6 },
    items: [
      { id: 'v1', durationSeconds: 1800, title: 'Class 01 Matrix' },
      { id: 'v2', durationSeconds: 2100, title: 'Class 02 Determinants' },
      { id: 'v3', durationSeconds: 1900, title: 'Class 03 Inverse Matrix' },
    ],
  });

  const previewRes = http.post(`${BASE_URL}/api/plans/preview`, previewPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(previewRes, {
    'preview status is 200 or handled': (r) => r.status === 200 || r.status === 400 || r.status === 401,
  });

  sleep(2);
}
