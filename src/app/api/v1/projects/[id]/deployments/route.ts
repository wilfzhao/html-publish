import { createHash, randomUUID } from 'crypto';
import { rm } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateProjectToken } from '@/lib/api-auth';
import { ArtifactError, promoteArtifact, stageArtifact } from '@/lib/deploy-artifact';
import { prisma } from '@/lib/db';
import { getPublicBaseUrl } from '@/lib/public-url';
import { getVersionUploadDirectory } from '@/lib/storage-paths';
import { isValidVersionLabel, normalizeVersionLabel } from '@/lib/version-label';

export async function POST(req: NextRequest, { params }: RouteContext<'/api/v1/projects/[id]/deployments'>) {
  const { id } = await params;
  const token = await authenticateProjectToken(req, id);
  if (!token) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'A valid project token is required.' } }, { status: 401 });
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Project not found.' } }, { status: 404 });
  const form = await req.formData();
  const artifact = form.get('artifact');
  if (!(artifact instanceof File)) return NextResponse.json({ error: { code: 'INVALID_ARTIFACT', message: 'Artifact file required.' } }, { status: 400 });
  const idempotencyKey = req.headers.get('idempotency-key') || randomUUID();
  const existing = await prisma.deployment.findUnique({ where: { projectId_idempotencyKey: { projectId: id, idempotencyKey } } });
  if (existing) return NextResponse.json({ deployment: existing });
  const last = await prisma.version.findFirst({ where: { projectId: id }, orderBy: { number: 'desc' } });
  const number = (last?.number || 0) + 1;
  const rawLabel = String(form.get('version') || '').trim();
  const label = rawLabel ? normalizeVersionLabel(rawLabel) : null;
  if (label && !isValidVersionLabel(label)) return NextResponse.json({ error: { code: 'INVALID_VERSION', message: 'Invalid version label.' } }, { status: 400 });
  const bytes = Buffer.from(await artifact.arrayBuffer());
  const artifactHash = String(form.get('artifactHash') || createHash('sha256').update(bytes).digest('hex'));
  const staging = `${getVersionUploadDirectory(id, number)}.staging-${randomUUID()}`;
  const deployment = await prisma.deployment.create({ data: { projectId: id, createdBy: token.userId, status: 'PROCESSING', note: String(form.get('note') || `Version ${label || number}`), entryFile: String(form.get('entryFile') || 'index.html'), artifactHash, artifactSize: bytes.length, sourceClient: String(form.get('sourceClient') || ''), sourceVersion: String(form.get('sourceVersion') || ''), gitCommit: String(form.get('gitCommit') || ''), gitBranch: String(form.get('gitBranch') || ''), idempotencyKey } });
  try {
    const staged = await stageArtifact({ buffer: bytes, filename: artifact.name, entryFile: deployment.entryFile, stagingDir: staging });
    const target = getVersionUploadDirectory(id, number);
    await promoteArtifact(staging, target);
    const version = await prisma.$transaction(async (tx) => {
      const created = await tx.version.create({ data: { projectId: id, number, label, note: deployment.note, entryFile: staged.entryFile, storagePath: target, uploadedBy: token.userId, sourceClient: deployment.sourceClient, sourceVersion: deployment.sourceVersion, artifactHash, gitCommit: deployment.gitCommit, gitBranch: deployment.gitBranch } });
      await tx.project.update({ where: { id }, data: { currentVersionId: created.id } });
      await tx.deployment.update({ where: { id: deployment.id }, data: { status: 'SUCCEEDED', versionId: created.id, fileCount: staged.fileCount, completedAt: new Date() } });
      return created;
    });
    const base = getPublicBaseUrl(req);
    return NextResponse.json({ project: { id: project.id, slug: project.slug, name: project.name }, version, deployment: { ...deployment, status: 'SUCCEEDED', versionId: version.id }, previewUrl: `${base}/p/${project.slug}`, versionUrl: `${base}/p/${project.slug}/v/${version.number}` }, { status: 201 });
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    const code = error instanceof ArtifactError ? error.code : 'DEPLOYMENT_FAILED';
    await prisma.deployment.update({ where: { id: deployment.id }, data: { status: 'FAILED', errorCode: code, errorMessage: error instanceof Error ? error.message : String(error), completedAt: new Date() } });
    return NextResponse.json({ error: { code, message: error instanceof Error ? error.message : 'Deployment failed.' } }, { status: 400 });
  }
}
