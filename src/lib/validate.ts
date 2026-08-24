import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  visibility: z.enum(['PUBLIC', 'PASSWORD']).default('PUBLIC'),
  password: z.string().min(4).optional().or(z.literal('')),
  expireAt: z.string().datetime().optional().or(z.literal('')),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  visibility: z.enum(['PUBLIC', 'PASSWORD']).optional(),
  password: z.string().min(4).optional().or(z.literal('')),
  expireAt: z.string().datetime().optional().or(z.literal('')),
  isFavorite: z.boolean().optional(),
});

export const commentSchema = z.object({
  content: z.string().min(1).max(2000),
  authorName: z.string().max(100).default('Anonymous'),
  x: z.number().optional(),
  y: z.number().optional(),
});

export const MAX_FILE_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE || '52428800', 10);

export const ALLOWED_EXTENSIONS = ['.html'];

export function isAllowedFile(filename: string): boolean {
  const ext = '.' + filename.split('.').pop()?.toLowerCase() || '';
  return ALLOWED_EXTENSIONS.includes(ext);
}

export function isMalicious(content: string): boolean {
  const patterns = [
    /document\.cookie/i,
    /window\.location\s*=|window\.location\.href\s*=/i,
    /top\.location/i,
    /parent\.location/i,
  ];
  return patterns.some((p) => p.test(content));
}
