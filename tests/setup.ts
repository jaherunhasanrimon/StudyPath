import '@testing-library/jest-dom/vitest';

// Enable React 19 act environment for testing-library
// @ts-expect-error React 19 act flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
