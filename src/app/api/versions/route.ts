import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, note, entryFile } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    }

    // Get next version number
    const lastVersion = await prisma.version.findFirst({
      where: { projectId },
      orderBy: { number: 'desc' },
    });
    const nextNumber = (lastVersion?.number || 0) + 1;

    const version = await prisma.version.create({
      data: {
        projectId,
        number: nextNumber,
        note: note || `Version ${nextNumber}`,
        entryFile: entryFile || 'index.html',
        storagePath: `projects/${projectId}/v${nextNumber}`,
        uploadedBy: 'user_demo',
      },
      include: {
        uploader: { select: { id: true, name: true } },
      },
    });

    // Update project current version
    await prisma.project.update({
      where: { id: projectId },
      data: { currentVersionId: version.id },
    });

    return NextResponse.json(version);
  } catch (error) {
    console.error('POST /api/versions error:', error);
    return NextResponse.json(
      { error: 'Failed to create version' },
      { status: 500 }
    );
  }
}
