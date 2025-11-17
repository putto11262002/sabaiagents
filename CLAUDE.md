
Default to using Node.js with TypeScript.

- Use `tsx <file>` for running TypeScript files during development
- Use `npm test` or `vitest` for running tests
- Use `npm install` for installing dependencies
- Use `npm run <script>` for running package.json scripts
- Use `dotenv` package for loading .env files

## APIs

- `express` for HTTP server with routes and middleware
- `better-sqlite3` for SQLite databases
- `node:child_process` for spawning processes
- `node:fs` for file system operations
- Native `WebSocket` or `ws` package for WebSocket support

## Testing

Use `vitest` to run tests.

```ts#index.test.ts
import { test, expect, describe } from "vitest";

describe("example test suite", () => {
  test("hello world", () => {
    expect(1).toBe(1);
  });
});
```

Run tests with:

```sh
npm test
# or
npm run test:run
```

## Server

Use Express for serving HTTP requests.

```ts#index.ts
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

app.get('/api/users/:id', (req, res) => {
  res.json({ id: req.params.id });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
```

## Development

Run the development server with hot reload:

```sh
npm run dev
# Uses tsx watch for automatic reloading
```

## ESM Compatibility

This project uses ESM (ES Modules). Important notes:

- All relative imports must include `.js` extensions (even for `.ts` files)
- Use `import` instead of `require`
- Use `export` instead of `module.exports`
- `__dirname` and `__filename` are not available by default, use `fileURLToPath` and `dirname` from `node:url` and `node:path`
