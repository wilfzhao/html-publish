import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
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
    select: { slug: true, name: true, visibility: true, expireAt: true },
  });

  if (!project) notFound();
  if (project.expireAt && project.expireAt <= new Date()) {
    return <PasswordPreviewGate projectSlug={project.slug} projectName={project.name} version={v} expired />;
  }
  redirect(`/api/proxy/${project.slug}${v ? `?v=${encodeURIComponent(v)}` : ''}`);
}
