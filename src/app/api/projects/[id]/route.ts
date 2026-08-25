import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import fs from 'fs';
import { getProjectUploadDirectory } from '@/lib/storage-paths';
import { hashProjectPassword, hasProjectAccess } from '@/lib/project-access';
import { isValidProjectSlug, normalizeProjectSlug } from '@/lib/project-slug';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
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
    if (project.visibility === 'PASSWORD' && project.password && !hasProjectAccess(req, project.id, project.password)) {
      return NextResponse.json({ error: 'Project password required' }, { status: 401 });
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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (existing.visibility === 'PASSWORD' && existing.password && !hasProjectAccess(req, existing.id, existing.password)) {
      return NextResponse.json({ error: 'Project password required' }, { status: 401 });
    }

    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : existing.name;
    const description = typeof body.description === 'string' ? body.description.trim() : existing.description;
    const visibility = body.visibility ?? existing.visibility;
    const icon = body.icon === null || typeof body.icon === 'string' ? body.icon : existing.icon;

    if (!name || name.length > 200) {
      return NextResponse.json({ error: 'Project name must be between 1 and 200 characters' }, { status: 400 });
    }
    if ((description?.length ?? 0) > 1000) {
      return NextResponse.json({ error: 'Description must be 1000 characters or fewer' }, { status: 400 });
    }
    if (visibility !== 'PUBLIC' && visibility !== 'PASSWORD') {
      return NextResponse.json({ error: 'Visibility must be Public or Password' }, { status: 400 });
    }

    let slug = existing.slug;
    if (typeof body.slug === 'string' && body.slug.trim()) {
      slug = normalizeProjectSlug(body.slug);
      if (!isValidProjectSlug(slug)) {
        return NextResponse.json({ error: 'URL slug must contain only lowercase letters, numbers, and hyphens' }, { status: 400 });
      }
      const conflict = await prisma.project.findUnique({ where: { slug }, select: { id: true } });
      if (conflict && conflict.id !== id) {
        return NextResponse.json({ error: 'This URL slug is already in use' }, { status: 409 });
      }
    }

    let password = visibility === 'PUBLIC' ? null : existing.password;
    if (visibility === 'PASSWORD' && typeof body.password === 'string' && body.password) {
      if (body.password.length < 4) {
        return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
      }
      password = await hashProjectPassword(body.password);
    }
    if (visibility === 'PASSWORD' && !password) {
      return NextResponse.json({ error: 'Password is required for a password-protected project' }, { status: 400 });
    }

    const project = await prisma.project.update({
      where: { id },
      data: { name, slug, description, visibility, password, icon },
    });
    return NextResponse.json({ ...project, password: undefined, hasPassword: Boolean(project.password) });
  } catch (error) {
    console.error('PUT /api/projects/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: { versions: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (project.visibility === 'PASSWORD' && project.password && !hasProjectAccess(req, project.id, project.password)) {
      return NextResponse.json({ error: 'Project password required' }, { status: 401 });
    }

    // Delete upload directory
    const uploadDir = getProjectUploadDirectory(project.id);
    if (fs.existsSync(uploadDir)) {
      fs.rmSync(uploadDir, { recursive: true, force: true });
    }

    // Delete project (will cascade to versions, comments, accessLogs via Prisma relations)
    await prisma.project.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/projects/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
