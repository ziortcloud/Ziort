// POST /api/v1/storage/upload
// Accepts multipart/form-data with: file, folder, entityId
// Returns: { key, publicUrl }
import { requireSession, requireEntityAccess } from '@/ziorbitcore/auth/session'
import { uploadFromFormData, type StorageFolder } from '@/ziorbitcore/services/storage'
import { ok, badRequest, forbidden, serverError, withErrorHandler } from '@/ziorbitcore/api/response'

const ALLOWED_FOLDERS: StorageFolder[] = [
  'zpn-items', 'zpls-patients', 'zi-kyc', 'zi-avatars', 'zi-entity', 'znd-attachments', 'receipts',
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/heic',
  'application/pdf',
  'image/gif',
])

export const POST = withErrorHandler(async (req: Request) => {
  const session = await requireSession()

  const form = await req.formData()
  const file     = form.get('file')     as File   | null
  const folder   = form.get('folder')   as string | null
  const entityId = form.get('entityId') as string | null

  if (!file || !folder || !entityId) {
    return badRequest('file, folder, and entityId are required')
  }

  if (!ALLOWED_FOLDERS.includes(folder as StorageFolder)) {
    return badRequest(`Invalid folder. Allowed: ${ALLOWED_FOLDERS.join(', ')}`)
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return badRequest(`File type not allowed: ${file.type}`)
  }

  if (file.size > MAX_FILE_SIZE) {
    return badRequest('File size must be under 10 MB')
  }

  // Verify caller has access to this entity
  try {
    await requireEntityAccess(session, entityId)
  } catch {
    return forbidden('You do not have access to this entity')
  }

  const result = await uploadFromFormData(file, folder as StorageFolder, entityId)
  return ok(result)
})
