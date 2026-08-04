import { prisma } from '../src/lib/db';

async function seed() {
  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@company.com' },
    update: {},
    create: {
      email: 'demo@company.com',
      name: 'Demo User',
      department: 'Product',
    },
  });

  // Check if projects already exist
  const existingProjects = await prisma.project.count();
  if (existingProjects > 0) {
    console.log('Projects already exist, skipping seed.');
    return;
  }

  // Create demo projects
  const p1 = await prisma.project.create({
    data: {
      name: 'Checkout Flow v3',
      description: 'New checkout experience with 3-step flow',
      slug: 'checkout-flow-v3',
      visibility: 'PUBLIC',
      ownerId: user.id,
      currentVersionId: '',
      accessCount: 42,
    },
  });

  await prisma.version.create({
    data: {
      projectId: p1.id,
      number: 1,
      note: 'Initial checkout prototype',
      entryFile: 'index.html',
      storagePath: `uploads/${p1.id}/v1`,
      uploadedBy: user.id,
    },
  });

  const p2 = await prisma.project.create({
    data: {
      name: 'Dashboard Redesign',
      description: 'New analytics dashboard with dark mode',
      slug: 'dashboard-redesign',
      visibility: 'INTERNAL',
      ownerId: user.id,
      currentVersionId: '',
      accessCount: 18,
    },
  });

  await prisma.version.create({
    data: {
      projectId: p2.id,
      number: 1,
      note: 'First iteration of dark mode dashboard',
      entryFile: 'index.html',
      storagePath: `uploads/${p2.id}/v1`,
      uploadedBy: user.id,
    },
  });

  const p3 = await prisma.project.create({
    data: {
      name: 'Onboarding Experience',
      description: 'New user onboarding with walkthrough',
      slug: 'onboarding-experience',
      visibility: 'PASSWORD',
      password: 'demo123',
      ownerId: user.id,
      currentVersionId: '',
      accessCount: 7,
    },
  });

  await prisma.version.create({
    data: {
      projectId: p3.id,
      number: 1,
      note: 'First draft of onboarding flow',
      entryFile: 'index.html',
      storagePath: `uploads/${p3.id}/v1`,
      uploadedBy: user.id,
    },
  });

  console.log('Seed completed!');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
