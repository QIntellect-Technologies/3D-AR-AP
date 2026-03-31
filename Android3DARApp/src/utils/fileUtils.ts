// src/utils/fileUtils.ts
type VisionCameraPhoto = { path: string };
import RNFS from 'react-native-fs';
export const APP_PHOTO_DIR = `${RNFS.CachesDirectoryPath}/3d-capture-photos`;

// Ensure directory exists (idempotent)
export const ensurePhotoDirectory = async (): Promise<void> => {
  const exists = await RNFS.exists(APP_PHOTO_DIR);
  if (!exists) {
    await RNFS.mkdir(APP_PHOTO_DIR);
  }
};

// Copy Vision Camera temp photo → our stable cache dir
export async function persistPhoto(photo: VisionCameraPhoto): Promise<string> {
  // Use internal files dir (stable, not cleared like cache)
  const dir = `${RNFS.DocumentDirectoryPath}/3d-capture-photos`;

  await RNFS.mkdir(dir);

  const filename = `capture_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const destPath = `${dir}/${filename}`;

  // VisionCamera gives absolute path already on Android
  const srcPath = photo.path;

  // Copy then remove src to be safe
  await RNFS.copyFile(srcPath, destPath);

  // Optional: try to delete original temp file
  try {
    const exists = await RNFS.exists(srcPath);
    if (exists) await RNFS.unlink(srcPath);
  } catch {}

  // Sanity check
  const ok = await RNFS.exists(destPath);
  if (!ok) throw new Error(`persistPhoto failed, file missing at ${destPath}`);

  return destPath;
}

// Clean up ALL captured photos in our directory
export const cleanupAllPhotos = async (): Promise<void> => {
  try {
    const exists = await RNFS.exists(APP_PHOTO_DIR);
    if (exists) {
      await RNFS.unlink(APP_PHOTO_DIR);
      console.log('Cleaned up photo directory');
    }
  } catch (e) {
    console.warn('Cleanup failed:', e);
  }
};

// Clean up specific files (e.g. after upload success)
export async function cleanupPhotos(paths: string[]) {
  await Promise.all(
    paths.map(async (p) => {
      try {
        const exists = await RNFS.exists(p);
        if (exists) await RNFS.unlink(p);
      } catch {}
    })
  );
}
