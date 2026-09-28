import { PrismaClient } from '@prisma/client';
import fs from 'fs';

let dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
if (fs.existsSync('/data') && (!process.env.DATABASE_URL || process.env.DATABASE_URL === 'file:./dev.db')) {
  dbUrl = 'file:/data/dev.db';
}

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});
