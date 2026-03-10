import RNFS from 'react-native-fs';

export async function clearCaptureFolder() {
  const dir = `${RNFS.DocumentDirectoryPath}/3d-capture-photos`;

  try {
    const exists = await RNFS.exists(dir);
    if (exists) await RNFS.unlink(dir);
    await RNFS.mkdir(dir);
  } catch (e) {
    console.log('clearCaptureFolder error:', e);
  }

  return dir;
}
