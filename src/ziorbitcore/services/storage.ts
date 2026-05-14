// Cloudflare R2 storage service — server-only
// Bucket: Ziort1
// Endpoint: https://73f201c58abe31064cb5c657ca13c16a.r2.cloudflarestorage.com
// Public dev URL: https://pub-0a228bd538674a3a91801f67916e857a.r2.dev
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function getR2Client() {
  const accountId  = process.env.R2_ACCOUNT_ID!
  const accessKey  = process.env.R2_ACCESS_KEY_ID!
  const secretKey  = process.env.R2_SECRET_ACCESS_KEY!

  if (!accountId || !accessKey || !secretKey) {
    throw new Error('R2 credentials not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in env.')
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  })
}

const BUCKET = process.env.R2_BUCKET_NAME ?? 'Ziort1'
const PUBLIC_URL = process.env.R2_PUBLIC_URL ?? 'https://pub-0a228bd538674a3a91801f67916e857a.r2.dev'

// ─────────────────────────────────────────────
// Key builders — consistent path convention
// ─────────────────────────────────────────────

export type StorageFolder =
  | 'zpn-items'       // ZiPawn pledge item images
  | 'zpls-patients'   // ZiPulse patient docs
  | 'zi-kyc'          // KYC national ID copies
  | 'zi-avatars'      // Individual profile photos
  | 'zi-entity'       // Entity logos / docs
  | 'znd-attachments' // ZiNeed requirement attachments
  | 'receipts'        // Payment receipts

export function buildKey(
  folder: StorageFolder,
  entityId: string,
  filename: string
): string {
  // Pattern: folder/entityId/filename
  // Keeps objects tenant-scoped for access control audit
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `${folder}/${entityId}/${safe}`
}

// ─────────────────────────────────────────────
// Upload — returns the public URL
// ─────────────────────────────────────────────

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | ReadableStream,
  contentType: string,
  metadata?: Record<string, string>
): Promise<string> {
  const client = getR2Client()
  await client.send(
    new PutObjectCommand({
      Bucket:      BUCKET,
      Key:         key,
      Body:        body as Buffer,
      ContentType: contentType,
      Metadata:    metadata,
    })
  )
  return `${PUBLIC_URL}/${key}`
}

// ─────────────────────────────────────────────
// Upload from Next.js File (from FormData)
// ─────────────────────────────────────────────

export async function uploadFromFormData(
  file: File,
  folder: StorageFolder,
  entityId: string
): Promise<{ key: string; publicUrl: string }> {
  const ext = file.name.split('.').pop() ?? 'bin'
  const timestamp = Date.now()
  const key = buildKey(folder, entityId, `${timestamp}.${ext}`)
  const buffer = Buffer.from(await file.arrayBuffer())
  const publicUrl = await uploadFile(key, buffer, file.type, {
    originalName: file.name,
    entityId,
  })
  return { key, publicUrl }
}

// ─────────────────────────────────────────────
// Delete object
// ─────────────────────────────────────────────

export async function deleteFile(key: string): Promise<void> {
  const client = getR2Client()
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

// ─────────────────────────────────────────────
// Presigned URL (for private objects, 1-hour expiry)
// ─────────────────────────────────────────────

export async function getPresignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  const client = getR2Client()
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: expiresInSeconds }
  )
}

// ─────────────────────────────────────────────
// Public URL helper (for already-uploaded keys)
// ─────────────────────────────────────────────

export function publicUrl(key: string): string {
  return `${PUBLIC_URL}/${key}`
}
