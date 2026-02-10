import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage"
import { storage } from "./firebase"

/**
 * Upload a file to Firebase Storage.
 * Returns the public download URL.
 */
export async function uploadFile(
  path: string,
  file: File,
): Promise<string> {
  const storageRef = ref(storage, path)
  const snapshot = await uploadBytes(storageRef, file)
  return getDownloadURL(snapshot.ref)
}

/**
 * Upload a profile avatar for a user.
 */
export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg"
  return uploadFile(`avatars/${userId}.${ext}`, file)
}

/**
 * Upload a CSV import file (for audit trail).
 */
export async function uploadCsvImport(
  orgId: string,
  file: File,
): Promise<string> {
  const timestamp = Date.now()
  return uploadFile(`imports/${orgId}/${timestamp}-${file.name}`, file)
}

/**
 * Delete a file from Firebase Storage.
 */
export async function deleteFile(path: string): Promise<void> {
  const storageRef = ref(storage, path)
  await deleteObject(storageRef)
}
