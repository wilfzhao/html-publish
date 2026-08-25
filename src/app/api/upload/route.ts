import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { getVersionUploadDirectory } from '@/lib/storage-paths';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;
    const note = formData.get('note') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Next version number
    const lastVersion = await prisma.version.findFirst({
      where: { projectId },
      orderBy: { number: 'desc' },
    });
    const nextNumber = (lastVersion?.number || 0) + 1;

    // Determine uploader: prefer the first existing user (matches project creation logic)
    const uploader = await prisma.user.findFirst();
    if (!uploader) {
      return NextResponse.json({ error: 'No users available' }, { status: 500 });
    }

    // Save file
    const versionDir = getVersionUploadDirectory(projectId, nextNumber);
    if (!existsSync(versionDir)) {
      await mkdir(versionDir, { recursive: true });
    }

    const fileName = path.basename(file.name);
    if (!fileName || fileName === '.' || fileName === '..') {
      return NextResponse.json({ error: 'Invalid file name' }, { status: 400 });
    }
    const filePath = path.join(versionDir, fileName);
    const arrayBuffer = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(arrayBuffer));

    // Create version record
    const version = await prisma.version.create({
      data: {
        projectId,
        number: nextNumber,
        note: note || `Version ${nextNumber}`,
        entryFile: fileName,
        storagePath: filePath,
        uploadedBy: uploader.id,
      },
    });

    // Update project
    await prisma.project.update({
      where: { id: projectId },
      data: { currentVersionId: version.id, updatedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      version: {
        id: version.id,
        number: version.number,
        note: version.note,
        entryFile: version.entryFile,
        createdAt: version.createdAt,
      },
      project: {
        id: project.id,
        slug: project.slug,
      },
      previewUrl: `/p/${project.slug}`,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
