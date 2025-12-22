// Prisma v7 configuration file
// This file contains runtime configuration for Prisma migrations and CLI
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  datasource: {
    url: env('MONGODB_URL'),
  },
});

