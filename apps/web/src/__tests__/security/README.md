# Security Tests

This directory contains security verification tests for external component isolation.

## Test Coverage

- **external-api-validation.test.ts**: Tests for input sanitization and validation
- **rate-limit.test.ts**: Tests for rate limiting functionality
- **security-headers.test.ts**: Tests for security headers configuration

## Running Tests

These tests require Vitest to be configured. To set up and run:

1. Install Vitest:
```bash
pnpm add -D vitest @vitest/ui
```

2. Create `vitest.config.ts` in the web app root:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

3. Add test script to package.json:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

4. Run tests:
```bash
pnpm test
```

## Manual Verification

Until Vitest is configured, you can manually verify:

1. **API Keys**: Check that no `NEXT_PUBLIC_` prefixed API keys exist for sensitive services
2. **Security Headers**: Inspect network responses for proper security headers
3. **Rate Limiting**: Attempt multiple rapid requests to rate-limited endpoints
4. **Input Validation**: Send malicious payloads to webhook endpoints

## Continuous Integration

Add these tests to your CI/CD pipeline to ensure security measures remain in place.
