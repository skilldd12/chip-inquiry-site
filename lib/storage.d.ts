export const UPLOAD_ROOT: string;
export function uploadPath(storedName: string): string;
export function ensureUploadRoot(): Promise<void>;
export function saveUpload(file: File | Blob & { name?: string }): Promise<{
  storedName: string;
  originalName: string;
  mime: string;
  size: number;
  sha256: string;
}>;
export function removeUpload(storedName: string): Promise<void>;
export function statUpload(storedName: string): Promise<{ full: string; size: number; mtime: Date }>;
