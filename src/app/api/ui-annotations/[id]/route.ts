import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hasProjectAccess } from '@/lib/project-access';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const annotation = await prisma.uiAnnotation.findUnique({
    where: { id },
    include: { project: true },
  });
  if (!annotation) return NextResponse.json({ error: 'Annotation not found' }, { status: 404 });
  const { project } = annotation;
  if (project.visibility === 'PASSWORD' && project.password && !hasProjectAccess(req, project.id, project.password)) {
    return NextResponse.json({ error: 'Project password required' }, { status: 401 });
  }
  await prisma.uiAnnotation.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
