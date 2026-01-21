// Copyright (C) 2025 soulwax@github
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

// File: prisma.config.ts
//
// Prisma v7 configuration file
// In Prisma v7, datasource URLs must be configured here, not in schema.prisma
// Prisma v7 does NOT auto-load .env files when using config files

import path from 'node:path'
import { defineConfig, env } from 'prisma/config'
import 'dotenv/config' // Load .env variables (required for Prisma v7 with config files)

/**
 * Prisma v7 configuration for PostgreSQL
 * 
 * The datasource URL is loaded from environment variables using the env() helper.
 * This config file is required for Prisma v7 when using migrate commands.
 * 
 * Note: This file must be at the project root (same level as package.json).
 */
export default defineConfig({
  engine: 'classic', // Required for classic engine
  schema: path.join(process.cwd(), 'prisma', 'schema.prisma'),
  migrations: {
    path: path.join(process.cwd(), 'prisma', 'migrations'),
  },
  datasource: {
    url: env('DATABASE_URL') || env('POSTGRES_PRISMA_URL'),
    // Optional: direct connection URL (bypasses connection pooling)
    // directUrl: env('DATABASE_URL_UNPOOLED'),
    // Optional: shadow database for safe schema drift detection
    // shadowDatabaseUrl: env('DATABASE_URL_UNPOOLED'),
  },
})
