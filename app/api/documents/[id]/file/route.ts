import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { ResidentDocument } from '@/models/ResidentDocument';
import { getPrivateFilePath } from '@/lib/storage';
import fs from 'fs';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const doc = await ResidentDocument.findById(params.id);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (auth.user.role === 'resident' && auth.user.residentId !== doc.residentId.toString()) {
      return NextResponse.json({ error: 'Access denied: cannot view this file' }, { status: 403 });
    }

    // If Cloudinary URL is available, redirect directly to Cloudinary CDN
    if (doc.cloudinaryUrl && doc.cloudinaryUrl.startsWith('http')) {
      return NextResponse.redirect(doc.cloudinaryUrl, 302);
    }

    const filePath = getPrivateFilePath(doc.filePath);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Physical file not found on server' }, { status: 404 });
    }

    const fileBuffer = await fs.promises.readFile(filePath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': doc.mimeType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${doc.originalFileName}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

