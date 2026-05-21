import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
dotenv.config();

const adcPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  join(homedir(), '.config', 'gcloud', 'application_default_credentials.json');
const hasGcpCredentials = existsSync(adcPath) || !!process.env.K_SERVICE;

let bucket = null;

if (hasGcpCredentials) {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = adcPath;
  }
  try {
    const { Storage } = await import('@google-cloud/storage');
    const storage = new Storage({
      projectId: process.env.GCP_PROJECT_ID || 'turing-lyceum-496405-e0',
    });
    const bucketName = process.env.GCS_BUCKET || `${process.env.GCP_PROJECT_ID || 'turing-lyceum-496405-e0'}-actionflow-uploads`;
    bucket = storage.bucket(bucketName);
    console.log(`✅ Cloud Storage initialized (bucket: ${bucketName})`);
  } catch (error) {
    console.warn('⚠️ Cloud Storage init failed:', error.message);
  }
} else {
  console.log('ℹ️ Cloud Storage skipped (run: gcloud auth application-default login)');
}

export async function uploadFile(buffer, filename, contentType = 'application/pdf') {
  if (!bucket) {
    console.log(`📁 File stored: local — ${filename}`);
    return { url: null, stored: 'local', filename, size: buffer.length };
  }

  try {
    const blob = bucket.file(`uploads/${Date.now()}-${filename}`);
    const stream = blob.createWriteStream({ resumable: false, contentType });
    return new Promise((resolve, reject) => {
      stream.on('error', reject);
      stream.on('finish', () => {
        resolve({
          url: `https://storage.googleapis.com/${bucket.name}/${blob.name}`,
          stored: 'gcs', filename: blob.name, size: buffer.length,
        });
      });
      stream.end(buffer);
    });
  } catch (error) {
    return { url: null, stored: 'local', filename, size: buffer.length };
  }
}

export async function listUploads(limit = 20) {
  if (!bucket) return [];
  try {
    const [files] = await bucket.getFiles({ prefix: 'uploads/', maxResults: limit });
    return files.map(f => ({ name: f.name, size: f.metadata.size, created: f.metadata.timeCreated }));
  } catch { return []; }
}

export default { uploadFile, listUploads };
