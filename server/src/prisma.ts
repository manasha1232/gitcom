import { PrismaClient } from '@prisma/client';
import fs from 'fs';

if (!process.env.DATABASE_URL || process.env.DATABASE_URL === 'file:./dev.db') {
  if (fs.existsSync('/data')) {
    process.env.DATABASE_URL = 'file:/data/dev.db';
  } else {
    process.env.DATABASE_URL = 'file:./dev.db';
  }
}

export const prisma = new PrismaClient();
