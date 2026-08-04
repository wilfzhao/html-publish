import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    const where: any = {};
    if (slug) {
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

    const result = projects.map((p: any) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      visibility: p.visibility,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      accessCount: p._count?.accessLogs || 0,
      versions: p.versions.map((v: any) => ({
        id: v.id,
        number: v.number,
        note: v.note,
        entryFile: v.entryFile,
        createdAt: v.createdAt,
        creator: v.uploader,
      })),
      _count: p._count,
    }));

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
    const { name, description, visibility, password } = body;

    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    let slug = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);

    // Ensure uniqueness
    const existing = await prisma.project.findUnique({ where: { slug } });
    if (existing) {
      slug = slug + '-' + Math.random().toString(36).slice(2, 6);
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: description || '',
        slug,
        visibility: visibility || 'INTERNAL',
        password: password || null,
        ownerId: 'user_demo',
        currentVersionId: '',
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('POST /api/projects error:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
