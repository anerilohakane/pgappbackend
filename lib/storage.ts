import fs from 'fs';
import path from 'path';

// In serverless environments like Vercel, use /tmp or gracefully handle read-only filesystems
const STORAGE_ROOT = process.env.VERCEL
  ? path.join('/tmp', 'uploads')
  : path.resolve(process.cwd(), process.env.STORAGE_DIR || './uploads');

function ensureDir(dirPath: string) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (err: any) {
    console.warn('[Storage] Could not create storage directory:', dirPath, err.message);
  }
}

export async function savePrivateFile(
  subfolder: 'documents' | 'receipts' | 'payments' | 'properties' | 'complaints',
  filename: string,
  buffer: Buffer
): Promise<{ relativePath: string; fullPath: string }> {
  const safeFilename = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const relativePath = path.join(subfolder, safeFilename).replace(/\\/g, '/');
  const targetDir = path.join(STORAGE_ROOT, subfolder);
  ensureDir(targetDir);
  const fullPath = path.join(STORAGE_ROOT, relativePath);
  
  try {
    await fs.promises.writeFile(fullPath, buffer);
  } catch (err: any) {
    console.warn('[Storage] writeFile failed (read-only environment):', err.message);
  }
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


