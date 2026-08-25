import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { hasProjectAccessCookie, projectAccessCookieName } from '@/lib/project-access';
import PasswordPreviewGate from './password-preview-gate';

export default async function PublicPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const { slug } = await params;
  const { v } = await searchParams;
  const project = await prisma.project.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, visibility: true, password: true, expireAt: true },
  });

  if (!project) notFound();
  if (project.expireAt && project.expireAt <= new Date()) {
    return <PasswordPreviewGate projectSlug={project.slug} projectName={project.name} version={v} expired />;
  }
  if (project.visibility === 'PASSWORD' && project.password) {
    const cookieStore = await cookies();
    const accessCookie = cookieStore.get(projectAccessCookieName(project.id))?.value;
    if (!hasProjectAccessCookie(accessCookie, project.id, project.password)) {
      return <PasswordPreviewGate projectSlug={project.slug} projectName={project.name} version={v} />;
    }
  }
  redirect(`/api/proxy/${project.slug}${v ? `?v=${encodeURIComponent(v)}` : ''}`);
}
