import path from 'path';

function resolveStoragePath(configuredPath: string | undefined, fallback: string) {
  return path.resolve(process.cwd(), configuredPath || fallback);
}

export const uploadsDirectory = resolveStoragePath(process.env.UPLOAD_DIR, 'uploads');
export const coversDirectory = resolveStoragePath(process.env.COVER_DIR, 'public/covers');

export function getProjectUploadDirectory(projectId: string) {
  return path.join(uploadsDirectory, projectId);
}

export function getVersionUploadDirectory(projectId: string, versionNumber: number) {
  return path.join(getProjectUploadDirectory(projectId), `v${versionNumber}`);
}
