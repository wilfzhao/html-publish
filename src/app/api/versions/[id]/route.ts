import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const version = await prisma.version.findUnique({
      where: { id: params.id },
    });

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    // Update project current version
    await prisma.project.update({
      where: { id: version.projectId },
      data: { currentVersionId: version.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/versions/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to activate version' },
      { status: 500 }
    );
  }
}
