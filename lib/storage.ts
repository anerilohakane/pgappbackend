import fs from 'fs';
import path from 'path';

const STORAGE_ROOT = path.resolve(process.cwd(), process.env.STORAGE_DIR || './uploads');

// Ensure storage subfolders exist
['documents', 'receipts', 'payments', 'properties', 'complaints'].forEach((dir) => {
  const fullPath = path.join(STORAGE_ROOT, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

export async function savePrivateFile(
  subfolder: 'documents' | 'receipts' | 'payments' | 'properties' | 'complaints',
  filename: string,
  buffer: Buffer
): Promise<{ relativePath: string; fullPath: string }> {
  const safeFilename = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const relativePath = path.join(subfolder, safeFilename).replace(/\\/g, '/');
  const fullPath = path.join(STORAGE_ROOT, relativePath);
  
  await fs.promises.writeFile(fullPath, buffer);
  return { relativePath, fullPath };
}

export function getPrivateFilePath(relativePath: string): string {
  // Prevent directory traversal attacks
  const safePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
  return path.join(STORAGE_ROOT, safePath);
}

export function maskAadhaar(aadhaar: string): string {
  if (!aadhaar) return '';
  const clean = aadhaar.replace(/\s+/g, '');
  if (clean.length < 12) return aadhaar;
  return `XXXX-XXXX-${clean.slice(-4)}`;
}

