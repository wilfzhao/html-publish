import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrCreateDefaultUser } from '@/lib/default-user';
import { hashProjectPassword, hasProjectAccess } from '@/lib/project-access';
import { createUniqueProjectSlug, isValidProjectSlug, normalizeProjectSlug } from '@/lib/project-slug';
import { getPublicBaseUrl } from '@/lib/public-url';

export async function GET(req: NextRequest) {
  try {
    const publicBaseUrl = getPublicBaseUrl(req);
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const projectId = searchParams.get('id');

    const where: any = {};
    if (projectId) {
      where.id = projectId;
    } else if (slug) {
      where.slug = slug;
    }

    const projects = await prisma.project.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
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
    const isDetailRequest = Boolean(projectId || slug);

    const result = projects.map((p: any) => {
      const locked = isDetailRequest && p.visibility === 'PASSWORD' && !!p.password && !hasProjectAccess(req, p.id, p.password);
      // 找到当前活跃版本
      const currentVersion = p.versions.find((v: any) => v.id === p.currentVersionId);
      const currentVersionNumber = currentVersion ? currentVersion.number : p._count?.versions || 0;

      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        visibility: p.visibility === 'INTERNAL' ? 'PUBLIC' : p.visibility,
        hasPassword: Boolean(p.password),
        locked,
        icon: p.icon,
        currentVersionId: p.currentVersionId,
        currentVersionNumber,
        previewPath: `/p/${p.slug}`,
        previewUrl: `${publicBaseUrl}/p/${encodeURIComponent(p.slug)}`,
        coverUrl: p.currentVersionId
          ? `/api/covers/${encodeURIComponent(p.slug)}?v=${currentVersionNumber}`
          : null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        accessCount: p._count?.accessLogs || 0,
        versions: locked ? [] : p.versions.map((v: any) => ({
          id: v.id,
          number: v.number,
          label: v.label,
          note: v.note,
          entryFile: v.entryFile,
          coverUrl: `/api/covers/${encodeURIComponent(p.slug)}?v=${v.number}`,
          createdAt: v.createdAt,
          creator: v.uploader,
        })),
        _count: p._count,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/projects error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, visibility, password, icon, slug: slugInput, ownerId: ownerIdInput } = body;
    let ownerId = ownerIdInput;

    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    const projectVisibility = visibility || 'PUBLIC';
    if (projectVisibility !== 'PUBLIC' && projectVisibility !== 'PASSWORD') {
      return NextResponse.json({ error: 'Visibility must be Public or Password' }, { status: 400 });
    }
    if (!ownerId) ownerId = (await getOrCreateDefaultUser()).id;

    let slug: string;
    if (typeof slugInput === 'string' && slugInput.trim()) {
      slug = normalizeProjectSlug(slugInput);
      if (!isValidProjectSlug(slug)) {
        return NextResponse.json({ error: 'URL slug must contain only lowercase letters, numbers, and hyphens' }, { status: 400 });
      }
      if (await prisma.project.findUnique({ where: { slug } })) {
        return NextResponse.json({ error: 'This URL slug is already in use' }, { status: 409 });
      }
    } else {
      slug = await createUniqueProjectSlug(
        name,
        async (candidate) => Boolean(await prisma.project.findUnique({ where: { slug: candidate }, select: { id: true } })),
      );
    }

    const passwordHash = projectVisibility === 'PASSWORD' && password
      ? await hashProjectPassword(password)
      : null;
    if (projectVisibility === 'PASSWORD' && !passwordHash) {
      return NextResponse.json({ error: 'Password is required for a password-protected project' }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: description || '',
        slug,
        visibility: projectVisibility,
        password: passwordHash,
        icon: icon || null,
        ownerId,
        currentVersionId: null,
      },
    });

    return NextResponse.json({
      ...project,
      previewPath: `/p/${project.slug}`,
      previewUrl: `${getPublicBaseUrl(req)}/p/${encodeURIComponent(project.slug)}`,
    });
  } catch (error) {
    console.error('POST /api/projects error:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
