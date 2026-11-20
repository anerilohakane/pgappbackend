import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
  secure: true,
});

export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string = 'pg_app/resident_proofs',
  filename?: string
): Promise<{ secure_url: string; public_id: string; format: string; bytes: number } | null> {
  const isCloudinaryConfigured =
    Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
    Boolean(process.env.CLOUDINARY_API_KEY) &&
    Boolean(process.env.CLOUDINARY_API_SECRET);

  if (!isCloudinaryConfigured) {
    console.log('[Cloudinary] Missing Cloudinary env keys. Proceeding with secure local private file storage fallback.');
    return null;
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: filename ? `${Date.now()}_${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}` : undefined,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) {
          console.error('[Cloudinary] Upload failed:', error.message);
          return resolve(null); // Fallback to local
        }
        if (result) {
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
            format: result.format,
            bytes: result.bytes,
          });
        } else {
          resolve(null);
        }
      }
    );
    uploadStream.end(buffer);
  });
}

export default cloudinary;

