import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { uploadDocument, getResidentDocuments, verifyDocument, rejectDocument } from '@/services/documentService';
import { getPrivateFilePath } from '@/lib/storage';
import { ResidentDocument } from '@/models/ResidentDocument';
import fs from 'fs';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const url = new URL(req.url);
    const residentId = url.searchParams.get('residentId') || auth.user.residentId;
    if (!residentId) {
      return NextResponse.json({ error: 'residentId is required' }, { status: 400 });
    }

    if (auth.user.role === 'resident' && auth.user.residentId !== residentId) {
      return NextResponse.json({ error: 'Access denied: can only view own documents' }, { status: 403 });
    }

    const docs = await getResidentDocuments(residentId);
    return NextResponse.json({ success: true, documents: docs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const residentId = (formData.get('residentId') as string) || auth.user.residentId;
    const category = formData.get('category') as any;
    const documentName = (formData.get('documentName') as string) || file?.name || 'Document';
    const documentNumber = (formData.get('documentNumber') as string) || '';

    if (!file || !residentId || !category) {
      return NextResponse.json({ error: 'File, residentId, and category are required' }, { status: 400 });
    }

    if (auth.user.role === 'resident' && auth.user.residentId !== residentId) {
      return NextResponse.json({ error: 'Access denied: cannot upload for another resident' }, { status: 403 });
    }

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const doc = await uploadDocument({
      residentId,
      category,
      documentName,
      originalFileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      fileSize: file.size,
      fileBuffer: buffer,
      documentNumber,
      isUploadedByAdmin: auth.user.role === 'admin',
      uploadedByAdminName: auth.user.name || 'Admin',
    });

    return NextResponse.json({ success: true, document: doc }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

