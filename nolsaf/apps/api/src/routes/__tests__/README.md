# Cancellation API Tests

## Overview

This directory contains tests for the cancellation API endpoints and business logic.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Structure

- `cancellation.eligibility.test.ts` - Tests for the cancellation eligibility computation logic (core business rules)
- `customer.cancellations.test.ts` - Tests for input validation and status flow

## Test Coverage

### Eligibility Computation Tests
- ✅ Free cancellation scenarios (100% refund)
- ✅ Partial refund scenarios (50% refund)
- ✅ Non-eligible scenarios (too close to check-in, already canceled, etc.)
- ✅ Edge cases (exact boundaries, after check-in, etc.)

### API Validation Tests
- ✅ Code normalization
- ✅ Input validation
- ✅ Status flow validation

## Adding New Tests

When adding new cancellation features:
1. Add unit tests for business logic first
2. Add integration tests for API endpoints
3. Test edge cases and error scenarios
4. Ensure tests are deterministic (use fixed dates where possible)

