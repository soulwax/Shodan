# Prisma v7 Migration - MongoDB to PostgreSQL

## ✅ Migration Complete

The codebase has been successfully migrated from MongoDB to PostgreSQL with full Prisma v7 support.

## Changes Made

### 1. Database Provider Migration
- ✅ Changed from `mongodb` to `postgresql` in `prisma/schema.prisma`
- ✅ Updated all models to use PostgreSQL-compatible types
- ✅ Replaced MongoDB ObjectId with UUID primary keys
- ✅ Added proper indexes and foreign key constraints
- ✅ Added cascade delete for relations

### 2. Schema Updates (`prisma/schema.prisma`)

**Key Changes:**
- Provider: `mongodb` → `postgresql`
- ID fields: `@default(auto()) @map("_id") @db.ObjectId` → `@default(uuid())`
- Foreign keys: Removed `@db.ObjectId` type annotations
- Added `onDelete: Cascade` for proper relation cleanup
- Added indexes for better query performance
- Changed `interpretation` to `@db.Text` for longer content

### 3. Configuration File (`prisma.config.ts`)
- ✅ Created Prisma v7 configuration file at project root
- ✅ Configured PostgreSQL connection URL using `env()` helper
- ✅ Added `dotenv/config` import (Prisma v7 doesn't auto-load .env with config files)
- ✅ Configured schema and migrations paths
- ✅ Ready for shadow database configuration if needed

### 4. Service Updates (`src/services/prisma.ts`)
- ✅ Updated comments to reflect PostgreSQL usage
- ✅ Maintained Prisma v7 event logging patterns
- ✅ Updated connection success message

### 5. Environment Variables (`.env-template`)
- ✅ Added `DATABASE_URL` for pooled connections
- ✅ Added `DATABASE_URL_UNPOOLED` for direct connections
- ✅ Added `POSTGRES_PRISMA_URL` with connection timeout

## Setup Instructions

### 1. Update Environment Variables

Add the following to your `.env` file:

```env
# PostgreSQL Database (Prisma v7)
DATABASE_URL=postgresql://neondb_owner:npg_SHkVdqlG0E4e@ep-old-bar-aggbxy8q-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://neondb_owner:npg_SHkVdqlG0E4e@ep-old-bar-aggbxy8q.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require
POSTGRES_PRISMA_URL=postgresql://neondb_owner:npg_SHkVdqlG0E4e@ep-old-bar-aggbxy8q-pooler.c-2.eu-central-1.aws.neon.tech/neondb?connect_timeout=15&sslmode=require
```

### 2. Generate Prisma Client

```bash
npm run prisma:generate
```

### 3. Push Schema to Database

For development (creates tables):
```bash
npm run prisma:push
```

For production (creates migration):
```bash
npm run prisma:migrate
```

### 4. Verify Connection

Start the bot and check logs for:
```
Successfully connected to PostgreSQL database with Prisma v7
```

## Prisma v7 Features Now Available

With PostgreSQL, you now have access to:

- ✅ **Full Prisma v7 Support**: All v7 features and improvements
- ✅ **Prisma Migrate**: Proper migration system (not available with MongoDB)
- ✅ **Better Type Safety**: Enhanced TypeScript support
- ✅ **Performance**: Optimized query engine
- ✅ **Relations**: Full relational database features
- ✅ **Transactions**: ACID transactions support
- ✅ **Indexes**: Proper indexing for performance

## Data Migration

⚠️ **Important**: If you have existing MongoDB data, you'll need to:

1. Export data from MongoDB
2. Transform data format (ObjectId → UUID, etc.)
3. Import into PostgreSQL

The schema structure is compatible, but IDs will need to be regenerated as UUIDs.

## Model Changes Summary

### User Model
- `id`: MongoDB ObjectId → UUID
- All other fields remain the same

### Command Model
- `id`: MongoDB ObjectId → UUID
- `userId`: ObjectId → UUID (String)
- Added cascade delete

### TarotReading Model
- `id`: MongoDB ObjectId → UUID
- `userId`: ObjectId → UUID (String)
- `interpretation`: String → Text (for longer content)
- Added indexes on `userId` and `createdAt`
- Added cascade delete

### Guild Model
- `id`: MongoDB ObjectId → UUID
- `welcomeMessage`: String → Text
- All other fields remain the same

## Prisma v7 Key Improvements

1. **Auto-Connect**: Client auto-connects on first query
2. **Better Types**: More strictly typed event handlers
3. **Config File**: Centralized configuration in `prisma/config.ts`
4. **Performance**: Optimized for PostgreSQL
5. **Migrations**: Full migration support with `prisma migrate`

## Troubleshooting

### Connection Issues
- Verify `DATABASE_URL` is set correctly
- Check SSL mode requirements
- Ensure database is accessible

### Migration Issues
- Run `npm run prisma:generate` first
- Check that schema is valid: `npx prisma validate`
- Use `prisma db push` for development, `prisma migrate` for production

### Type Errors
- Regenerate Prisma client: `npm run prisma:generate`
- Restart TypeScript server in your IDE
- Clear `node_modules/.prisma` if issues persist

## Next Steps

1. ✅ Update `.env` with PostgreSQL connection strings
2. ✅ Run `npm run prisma:generate`
3. ✅ Run `npm run prisma:push` or `npm run prisma:migrate`
4. ✅ Test the bot and verify database operations
5. ✅ Monitor logs for any connection or query issues

## Resources

- [Prisma v7 Documentation](https://www.prisma.io/docs)
- [PostgreSQL with Prisma](https://www.prisma.io/docs/orm/overview/databases/postgresql)
- [Prisma Migrate Guide](https://www.prisma.io/docs/orm/prisma-migrate)

---

**Migration Date**: 2025
**Prisma Version**: 7.3.0
**Database**: PostgreSQL (Neon)
**Status**: ✅ Complete
