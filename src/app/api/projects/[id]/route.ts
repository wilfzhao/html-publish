import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        versions: {
          orderBy: { number: 'desc' },
          include: {
            uploader: { select: { id: true, name: true } },
          },
        },
        _count: { select: { versions: true, accessLogs: true } },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: project.id,
      name: project.name,
      description: project.description,
      slug: project.slug,
      visibility: project.visibility,
      currentVersionId: project.currentVersionId,
      versions: project.versions.map((v: any) => ({
        id: v.id,
        number: v.number,
        note: v.note,
        entryFile: v.entryFile,
        createdAt: v.createdAt,
        creator: v.uploader,
      })),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      _count: project._count,
    });
  } catch (error) {
    console.error('GET /api/projects/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}
