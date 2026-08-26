import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import PasswordPreviewGate from './password-preview-gate';
import AnnotationViewer from './annotation-viewer';

export default async function PublicPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ v?: string; ui?: string }>;
}) {
  const { slug } = await params;
  const { v, ui } = await searchParams;
  const project = await prisma.project.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      expireAt: true,
      versions: { orderBy: { number: 'desc' }, select: { id: true, number: true, label: true } },
    },
  });

  if (!project) notFound();
  if (project.expireAt && project.expireAt <= new Date()) {
    return <PasswordPreviewGate projectSlug={project.slug} projectName={project.name} version={v} expired />;
  }
  const numericVersion = v ? Number.parseInt(v, 10) : null;
  const version = v
    ? project.versions.find((item) => item.number === numericVersion) || project.versions.find((item) => item.label === v)
    : project.versions[0];
  if (!version) notFound();
  const versionKey = version.label || String(version.number);
  return (
    <AnnotationViewer
      projectId={project.id}
      versionId={version.id}
      iframeSrc={`/api/proxy/${project.slug}?v=${encodeURIComponent(versionKey)}`}
      initialPanelOpen={ui === '1'}
    />
  );
}
