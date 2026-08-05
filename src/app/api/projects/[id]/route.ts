import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import fs from 'fs';
import path from 'path';

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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: { versions: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Delete upload directory
    const uploadDir = path.join(process.cwd(), 'uploads', project.id);
    if (fs.existsSync(uploadDir)) {
      fs.rmSync(uploadDir, { recursive: true, force: true });
    }

    // Delete project (will cascade to versions, comments, accessLogs via Prisma relations)
    await prisma.project.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/projects/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
