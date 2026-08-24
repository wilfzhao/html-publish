import { prisma } from '@/lib/db';

const DEFAULT_USER_EMAIL = process.env.DEFAULT_USER_EMAIL || 'html-publish@company.local';
const DEFAULT_USER_NAME = process.env.DEFAULT_USER_NAME || 'HTML Publish User';

export async function getOrCreateDefaultUser() {
  const existingUser = await prisma.user.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (existingUser) return existingUser;

  return prisma.user.upsert({
    where: { email: DEFAULT_USER_EMAIL },
    update: {},
    create: {
      email: DEFAULT_USER_EMAIL,
      name: DEFAULT_USER_NAME,
      department: 'Product',
    },
  });
}
