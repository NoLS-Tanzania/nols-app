import { prisma } from '@nolsaf/prisma';
import S3 from '@aws-sdk/client-s3';
// optional deps: sharp + node-fetch
let sharp: any = null;
let fetchFn: any = null;
try { sharp = require('sharp'); } catch (e) {}
try { fetchFn = require('node-fetch'); } catch (e) {}
import { Readable } from 'stream';

// Simple worker: poll for images with status PROCESSING, fetch the URL, generate thumbnail and webp, upload to S3, update DB
(async function main(){
  const s3 = new (S3 as any).S3Client({});
  const bucket = process.env.IMAGES_BUCKET;
  if (!bucket) {
    console.error('IMAGES_BUCKET not configured');
    process.exit(1);
  }
  console.log('image worker starting, will poll every 5s');

  while(true){
    try {
      const imgs = await prisma.propertyImage.findMany({ where: { status: 'PROCESSING' }, take: 5 });
      for(const img of imgs){
        try {
          console.log('processing', img.id, img.url);
          if (!img.url) {
            await prisma.propertyImage.update({ where: { id: img.id }, data: { status: 'REJECTED', moderationNote: 'no-url' } });
            continue;
          }
          if (!fetchFn || !sharp) {
            console.log('sharp or fetch not installed; skipping processing for', img.id);
            await prisma.propertyImage.update({ where: { id: img.id }, data: { status: 'READY' } });
            continue;
          }
          const res = await fetchFn(img.url);
          if (!res.ok) throw new Error('fetch fail');
          const buf = Buffer.from(await res.arrayBuffer());

          const thumb = await sharp(buf).resize(800, 600, { fit: 'inside' }).toBuffer();
          const webp = await sharp(buf).toFormat('webp').toBuffer();
          const avif = await sharp(buf).toFormat('avif').toBuffer();

          const baseKey = (img.storageKey || `prop-${img.propertyId}-${Date.now()}`)
            .replace(/[^a-zA-Z0-9_.-]/g, '_');

          // upload helper
          async function uploadBuffer(buffer: Buffer, key: string, contentType: string){
            const put = await s3.send(new (S3 as any).PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType }));
            return `s3://${bucket}/${key}`;
          }

          const thumbKey = `thumbs/${baseKey}.jpg`;
          const webpKey = `converted/${baseKey}.webp`;
          const avifKey = `converted/${baseKey}.avif`;

          const thumbUrl = await uploadBuffer(thumb, thumbKey, 'image/jpeg');
          const webpUrl = await uploadBuffer(webp, webpKey, 'image/webp');
          const avifUrl = await uploadBuffer(avif, avifKey, 'image/avif');

          // update record
          await prisma.propertyImage.update({ where: { id: img.id }, data: { thumbnailKey: thumbKey, thumbnailUrl: thumbUrl, url: img.url, storageKey: img.storageKey, status: 'READY', width: img.width ?? null, height: img.height ?? null } });
        } catch (e) {
          console.error('processing failed for', img.id, e);
          await prisma.propertyImage.update({ where: { id: img.id }, data: { status: 'REJECTED', moderationNote: String((e as any).message || 'processing_error') } });
        }
      }
    } catch (e) {
      console.error('worker loop error', e);
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
})();
