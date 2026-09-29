import { prisma } from '../prisma';

export async function ensureUserId(rawUserId?: string): Promise<string | null> {
  if (!rawUserId) return null;

  try {
    // 1. Check if User exists by exact id
    const existingById = await prisma.user.findUnique({ where: { id: rawUserId } });
    if (existingById) return existingById.id;

    // 2. Check if User exists by githubUsername
    const existingByUsername = await prisma.user.findFirst({ where: { githubUsername: rawUserId } });
    if (existingByUsername) return existingByUsername.id;

    // 3. Upsert user safely
    const isUuid = rawUserId.includes('-') && rawUserId.length >= 20;

    if (isUuid) {
      const newUser = await prisma.user.create({
        data: {
          id: rawUserId,
          githubUsername: `user_${rawUserId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10)}`,
          name: 'Developer',
        },
      });
      return newUser.id;
    } else {
      const newUser = await prisma.user.upsert({
        where: { githubUsername: rawUserId },
        create: {
          githubUsername: rawUserId,
          name: rawUserId,
          email: rawUserId.toLowerCase() === 'manasha1232'
            ? '209326007+manasha1232@users.noreply.github.com'
            : `${rawUserId}@users.noreply.github.com`,
          githubToken: rawUserId.toLowerCase() === 'manasha1232'
            ? (process.env.MANASHA_GITHUB_TOKEN || '')
            : '',
        },
        update: {},
      });
      return newUser.id;
    }
  } catch (err) {
    console.error('[UserUtils] Error ensuring user ID:', err);
    // Fallback: try to return any existing user or null
    const fallback = await prisma.user.findFirst({
      where: { OR: [{ id: rawUserId }, { githubUsername: rawUserId }] },
    });
    return fallback?.id || null;
  }
}
