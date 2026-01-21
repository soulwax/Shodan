# Prisma v7 Config File Fix

## Issue
When running `prisma migrate deploy`, you encountered:
```
Error: The datasource.url property is required in your Prisma config file when using prisma migrate deploy.
```

## Solution Applied

### 1. Config File Location
- **Before**: `prisma/config.ts` (incorrect location)
- **After**: `prisma.config.ts` at project root (correct location)

Prisma v7 expects the config file at the project root, not inside the `prisma/` directory.

### 2. Config File Format
Updated to use the correct Prisma v7 format:

```typescript
import path from 'node:path'
import { defineConfig, env } from 'prisma/config'
import 'dotenv/config' // Required: Prisma v7 doesn't auto-load .env

export default defineConfig({
  engine: 'classic',
  schema: path.join(process.cwd(), 'prisma', 'schema.prisma'),
  migrations: {
    path: path.join(process.cwd(), 'prisma', 'migrations'),
  },
  datasource: {
    url: env('DATABASE_URL') || env('POSTGRES_PRISMA_URL'),
  },
})
```

### Key Changes:
1. ✅ Moved file to project root: `prisma.config.ts`
2. ✅ Used `env()` helper from `prisma/config` instead of `process.env`
3. ✅ Added `import 'dotenv/config'` (Prisma v7 requirement)
4. ✅ Added `engine: 'classic'` specification
5. ✅ Configured schema and migrations paths

## Verification

The config is now working correctly:
```bash
$ npx prisma validate
Loaded Prisma config from prisma.config.ts.
Prisma schema loaded from prisma/schema.prisma.
The schema at prisma/schema.prisma is valid 🚀
```

## Next Steps

1. Ensure your `.env` file has the database URL:
   ```env
   DATABASE_URL=postgresql://...
   # or
   POSTGRES_PRISMA_URL=postgresql://...
   ```

2. Run migrations:
   ```bash
   npm run prisma:migrate:deploy
   ```

The error should now be resolved! ✅
