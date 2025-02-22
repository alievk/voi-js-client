import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const REGION = process.env.VUE_APP_AWS_REGION;
const BUCKET_NAME = process.env.VUE_APP_S3_BUCKET;

const s3Client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.VUE_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.VUE_APP_AWS_SECRET_ACCESS_KEY
  }
});

export function decodeBase64Image(imageBase64) {
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  return Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
}

export async function uploadImage(buffer, objectName, linkExpiresIn = 3600) { 
  const putParams = {
    Bucket: BUCKET_NAME,
    Key: objectName,
    Body: buffer,
    ContentType: 'image/png'
  };
  
  try {
    const putCommand = new PutObjectCommand(putParams);
    await s3Client.send(putCommand);
    
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectName
    });
    const url = await getSignedUrl(s3Client, getCommand, { expiresIn: linkExpiresIn });
    console.log('Uploaded image to:', url);
    return url;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
} 