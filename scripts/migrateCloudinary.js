const fs = require('fs');
const path = require('path');
const mongoose = require('../node_modules/mongoose');
const cloudinary = require('../node_modules/cloudinary').v2;
const dotenv = require('../node_modules/dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  const docs = await mongoose.connection.collection('residentdocuments').find({}).toArray();
  console.log('Found', docs.length, 'documents in DB to sync with Cloudinary');

  for (const doc of docs) {
    if (doc.cloudinaryUrl && doc.cloudinaryUrl.startsWith('http')) {
      console.log('Already has Cloudinary URL:', doc.documentName);
      continue;
    }
    const localFilePath = path.join(__dirname, '../uploads', doc.filePath);
    if (!fs.existsSync(localFilePath)) {
      console.log('File does not exist on disk:', localFilePath);
      continue;
    }

    console.log('Uploading to Cloudinary:', doc.documentName, localFilePath);
    const result = await cloudinary.uploader.upload(localFilePath, {
      folder: 'pg_app/resident_proofs',
      resource_type: 'auto'
    });

    console.log('Uploaded successfully! URL:', result.secure_url);
    const update = {
      $set: {
        cloudinaryUrl: result.secure_url,
        cloudinaryPublicId: result.public_id
      }
    };
    await mongoose.connection.collection('residentdocuments').updateOne(
      { _id: doc._id },
      update
    );
  }

  console.log('All documents successfully migrated to Cloudinary!');
  process.exit(0);
}

migrate().catch(e => {
  console.error('Migration error:', e);
  process.exit(1);
});

