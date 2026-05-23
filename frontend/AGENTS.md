<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:test-rules -->
# Test rules

Before making any code changes, run the existing tests for the area being changed. After making changes, update or add tests to cover the new/modified behavior, then run all tests again to confirm nothing is broken.

- **Backend tests**: `cd backend && npm test`
- **Frontend tests**: `cd frontend && npx jest --no-cache`
- Write unit tests for every new function, method, or component
- Place tests alongside the source file they test with `.test.ts` or `.test.tsx` extension
- Follow the existing mocking patterns (jest.mock for Prisma, bcrypt, jwt, fetch, next/navigation, etc.)
- Test both success and error paths
- Test edge cases (empty data, null values, boundary conditions)
<!-- END:test-rules -->
