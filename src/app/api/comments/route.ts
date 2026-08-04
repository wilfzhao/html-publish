import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const projectId = new URL(req.url).searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

  const comments = await prisma.comment.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
    include: { creator: { select: { name: true } } },
  });

  return NextResponse.json(
    comments.map((c: any) => ({
      id: c.id,
      content: c.content,
      authorName: c.creator?.name || c.authorName || 'Anonymous',
      createdAt: c.createdAt,
    }))
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { projectId, content, authorName, position } = body;

  if (!projectId || !content) {
    return NextResponse.json({ error: 'projectId and content required' }, { status: 400 });
  }

  const comment = await prisma.comment.create({
    data: {
      projectId,
      content,
      authorName: authorName || 'Anonymous',
      x: position?.x || null,
      y: position?.y || null,
    },
    include: { creator: { select: { name: true } } },
  });

  return NextResponse.json({
    id: comment.id,
    content: comment.content,
    authorName: comment.creator?.name || comment.authorName || 'Anonymous',
    createdAt: comment.createdAt,
  }, { status: 201 });
}
