import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import fs from 'fs';
import { getVersionUploadDirectory } from '@/lib/storage-paths';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const version = await prisma.version.findUnique({
      where: { id },
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const version = await prisma.version.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    // Prevent deleting the current (active) version
    if (version.project.currentVersionId === version.id) {
      return NextResponse.json(
        { error: 'Cannot delete the current active version. Rollback first.' },
        { status: 400 }
      );
    }

    // Delete upload directory for this version
    const versionDir = getVersionUploadDirectory(version.project.id, version.number);
    if (fs.existsSync(versionDir)) {
      fs.rmSync(versionDir, { recursive: true, force: true });
    }

    // Delete version record
    await prisma.version.delete({ where: { id: version.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/versions/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete version' },
      { status: 500 }
    );
  }
}
