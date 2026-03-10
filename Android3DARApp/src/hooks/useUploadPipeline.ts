// import { useCallback, useState } from 'react';
// import { Alert } from 'react-native';
// import RNFS from 'react-native-fs';
// import ReactNativeBlobUtil from 'react-native-blob-util';
// import { cleanupPhotos } from '../utils/fileUtils';
// import { api } from '../utils/api';

// type UploadState = {
//   isUploading: boolean;
//   uploadProgress: number; // 0..1
//   currentFileIndex: number; // 1-based
//   currentFileProgress: number; // 0..1
//   totalPhotos: number;
// };

// type UploadResult = {
//   projectId: string;
//   jobId?: string;
// };

// const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
// const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// const MAX_RETRIES = 3;
// const BASE_RETRY_DELAY_MS = 2000;

// function askSkipOrCancel(photoNumber: number, message: string) {
//   return new Promise<'skip' | 'cancel'>((resolve) => {
//     Alert.alert(
//       'Upload Failed',
//       `Photo ${photoNumber} failed after ${MAX_RETRIES} attempts.\n\n${message}\n\nWhat do you want to do?`,
//       [
//         { text: 'Skip this photo', onPress: () => resolve('skip') },
//         { text: 'Cancel all', style: 'destructive', onPress: () => resolve('cancel') },
//       ],
//       { cancelable: false }
//     );
//   });
// }

// export function useUploadPipeline() {
//   const [state, setState] = useState<UploadState>({
//     isUploading: false,
//     uploadProgress: 0,
//     currentFileIndex: 0,
//     currentFileProgress: 0,
//     totalPhotos: 0,
//   });

//   const reset = useCallback(() => {
//     setState({
//       isUploading: false,
//       uploadProgress: 0,
//       currentFileIndex: 0,
//       currentFileProgress: 0,
//       totalPhotos: 0,
//     });
//   }, []);

//   const uploadOneWithRetry = useCallback(
//     async (opts: { filePath: string; signedUrl: string; index0: number; total: number }) => {
//       const { filePath, signedUrl, index0, total } = opts;

//       for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
//         try {
//           setState((s) => ({ ...s, currentFileProgress: 0 }));

//           const res = await ReactNativeBlobUtil.fetch(
//             'PUT',
//             signedUrl,
//             { 'Content-Type': 'image/jpeg' },
//             ReactNativeBlobUtil.wrap(filePath)
//           ).progress({ interval: 250 }, (written: number, t: number) => {
//             const pct = t > 0 ? written / t : 0;
//             const safePct = clamp01(pct);

//             setState((s) => ({
//               ...s,
//               currentFileProgress: safePct,
//               uploadProgress: clamp01((index0 + safePct) / total),
//             }));
//           });

//           const status = res.info().status;
//           if (status !== 200) {
//             const body = await res.text();
//             throw new Error(`HTTP ${status}: ${body}`);
//           }

//           // success
//           setState((s) => ({
//             ...s,
//             currentFileProgress: 1,
//             uploadProgress: clamp01((index0 + 1) / total),
//           }));

//           return true;
//         } catch (e: any) {
//           const msg = e?.message ?? String(e);
//           console.error(`Upload attempt ${attempt} failed for photo ${index0 + 1}:`, msg);

//           if (attempt < MAX_RETRIES) {
//             const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
//             await sleep(delay);
//             continue;
//           }

//           // final failure -> ask user
//           const decision = await askSkipOrCancel(index0 + 1, msg);
//           if (decision === 'cancel') {
//             throw new Error('Upload cancelled by user');
//           }
//           return false; // skip
//         }
//       }

//       return false;
//     },
//     []
//   );

//   const start = useCallback(
//     async (photoPaths: string[]): Promise<UploadResult> => {
//       const total = photoPaths.length;

//       setState({
//         isUploading: true,
//         uploadProgress: 0,
//         currentFileIndex: 0,
//         currentFileProgress: 0,
//         totalPhotos: total,
//       });

//       const BACKEND = process.env.BACKEND_API_URL;
//       if (!BACKEND) {
//         throw new Error('BACKEND_API_URL is missing. Check your .env config.');
//       }

//       // 1) Create project
//       const projectJson = await api<{ projectId: string }>('/projects', {
//         method: 'POST',
//         body: {
//           title: `Scan ${new Date().toLocaleString()}`,
//           description: 'Auto-created from mobile app',
//         },
//       });

//       const projectId = projectJson.projectId;
//       if (!projectId) throw new Error('Backend did not return projectId');

//       // 2) Get signed URLs
//       const urlsJson = await api<{ signedUrls: { signedUrl: string }[] }>(
//         '/uploads/signed-upload-urls',
//         {
//           method: 'POST',
//           body: { projectId, photoCount: total },
//         }
//       );

//       if (!urlsJson.signedUrls) {
//         throw new Error('Failed to get signed URLs');
//       }

//       const signedUrls = urlsJson.signedUrls;

//       if (!Array.isArray(signedUrls) || signedUrls.length !== total) {
//         throw new Error(
//           `Invalid signedUrls array (expected ${total}, got ${signedUrls?.length ?? 'none'})`
//         );
//       }

//       // 3) Upload sequentially
//       for (let i = 0; i < total; i++) {
//         setState((s) => ({ ...s, currentFileIndex: i + 1 }));

//         const filePath = photoPaths[i];
//         const signedUrl = signedUrls[i]?.signedUrl;

//         if (!signedUrl) {
//           console.error(`Missing signedUrl for photo ${i + 1}`);
//           continue;
//         }

//         const exists = await RNFS.exists(filePath);
//         if (!exists) {
//           console.error(`File missing for photo ${i + 1}: ${filePath}`);
//           continue;
//         }

//         await uploadOneWithRetry({ filePath, signedUrl, index0: i, total });
//       }

//       // 4) Cleanup local files
//       await cleanupPhotos(photoPaths);

//       // 5) Trigger reconstruction (non-fatal)
//       let jobId: string | undefined;
//       try {
//         const triggerJson = await api<{ jobId?: string }>(`/projects/${projectId}/trigger`, {
//           method: 'POST',
//         });
//         jobId = triggerJson?.jobId;
//         console.log('Job enqueued with ID:', jobId);
//       } catch (e: any) {
//         console.warn('Trigger failed:', e.message);
//       }

//       // Mark complete
//       setState((s) => ({ ...s, uploadProgress: 1 }));

//       return { projectId, jobId };
//     },
//     [uploadOneWithRetry]
//   );

//   return { ...state, start, reset };
// }
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import RNFS from 'react-native-fs';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { cleanupPhotos } from '../utils/fileUtils';
import { api } from '../utils/api';
import { supabase } from '../config/supabase';

type UploadState = {
  isUploading: boolean;
  uploadProgress: number;
  currentFileIndex: number;
  currentFileProgress: number;
  totalPhotos: number;
};

type UploadResult = {
  projectId: string;
  jobId?: string;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 2000;

function askSkipOrCancel(photoNumber: number, message: string) {
  return new Promise<'skip' | 'cancel'>((resolve) => {
    Alert.alert(
      'Upload Failed',
      `Photo ${photoNumber} failed after ${MAX_RETRIES} attempts.\n\n${message}\n\nWhat do you want to do?`,
      [
        { text: 'Skip this photo', onPress: () => resolve('skip') },
        { text: 'Cancel all', style: 'destructive', onPress: () => resolve('cancel') },
      ],
      { cancelable: false }
    );
  });
}

export function useUploadPipeline() {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    uploadProgress: 0,
    currentFileIndex: 0,
    currentFileProgress: 0,
    totalPhotos: 0,
  });

  const reset = useCallback(() => {
    setState({
      isUploading: false,
      uploadProgress: 0,
      currentFileIndex: 0,
      currentFileProgress: 0,
      totalPhotos: 0,
    });
  }, []);

  const uploadOneWithRetry = useCallback(
    async (opts: { filePath: string; signedUrl: string; index0: number; total: number }) => {
      const { filePath, signedUrl, index0, total } = opts;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          setState((s) => ({ ...s, currentFileProgress: 0 }));

          const res = await ReactNativeBlobUtil.fetch(
            'PUT',
            signedUrl,
            { 'Content-Type': 'image/jpeg' },
            ReactNativeBlobUtil.wrap(filePath)
          ).progress({ interval: 250 }, (written: number, t: number) => {
            const pct = t > 0 ? written / t : 0;
            const safePct = clamp01(pct);

            setState((s) => ({
              ...s,
              currentFileProgress: safePct,
              uploadProgress: clamp01((index0 + safePct) / total),
            }));
          });

          const status = res.info().status;
          if (status !== 200) {
            const body = await res.text();
            throw new Error(`HTTP ${status}: ${body}`);
          }

          setState((s) => ({
            ...s,
            currentFileProgress: 1,
            uploadProgress: clamp01((index0 + 1) / total),
          }));

          return true;
        } catch (e: any) {
          const msg = e?.message ?? String(e);
          console.error(`Upload attempt ${attempt} failed for photo ${index0 + 1}:`, msg);

          if (attempt < MAX_RETRIES) {
            const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
            await sleep(delay);
            continue;
          }

          const decision = await askSkipOrCancel(index0 + 1, msg);
          if (decision === 'cancel') {
            throw new Error('Upload cancelled by user');
          }
          return false;
        }
      }

      return false;
    },
    []
  );

  const start = useCallback(
    async (photoPaths: string[]): Promise<UploadResult> => {
      const total = photoPaths.length;

      setState({
        isUploading: true,
        uploadProgress: 0,
        currentFileIndex: 0,
        currentFileProgress: 0,
        totalPhotos: total,
      });

      // Refresh token once before protected backend calls
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      console.log('refreshSession error =', refreshError?.message);
      console.log('refreshSession token exists =', !!refreshData.session?.access_token);

      // 1) Create project
      const projectJson = await api<{ projectId: string }>('/projects', {
        method: 'POST',
        body: {
          title: `Scan ${new Date().toLocaleString()}`,
          description: 'Auto-created from mobile app',
        },
      });

      const projectId = projectJson.projectId;
      if (!projectId) throw new Error('Backend did not return projectId');

      // 2) Get signed URLs
      const urlsJson = await api<{ signedUrls: { signedUrl: string }[] }>(
        '/uploads/signed-upload-urls',
        {
          method: 'POST',
          body: { projectId, photoCount: total },
        }
      );

      if (!urlsJson.signedUrls) {
        throw new Error('Failed to get signed URLs');
      }

      const signedUrls = urlsJson.signedUrls;

      if (!Array.isArray(signedUrls) || signedUrls.length !== total) {
        throw new Error(
          `Invalid signedUrls array (expected ${total}, got ${signedUrls?.length ?? 'none'})`
        );
      }

      // 3) Upload sequentially
      for (let i = 0; i < total; i++) {
        setState((s) => ({ ...s, currentFileIndex: i + 1 }));

        const filePath = photoPaths[i];
        const signedUrl = signedUrls[i]?.signedUrl;

        if (!signedUrl) {
          console.error(`Missing signedUrl for photo ${i + 1}`);
          continue;
        }

        const exists = await RNFS.exists(filePath);
        if (!exists) {
          console.error(`File missing for photo ${i + 1}: ${filePath}`);
          continue;
        }

        await uploadOneWithRetry({ filePath, signedUrl, index0: i, total });
      }

      // 4) Cleanup local files
      await cleanupPhotos(photoPaths);

      // 5) Trigger reconstruction
      let jobId: string | undefined;
      try {
        const triggerJson = await api<{ jobId?: string }>(`/projects/${projectId}/trigger`, {
          method: 'POST',
        });
        jobId = triggerJson?.jobId;
        console.log('Job enqueued with ID:', jobId);
      } catch (e: any) {
        console.warn('Trigger failed:', e.message);
      }

      setState((s) => ({ ...s, uploadProgress: 1 }));

      return { projectId, jobId };
    },
    [uploadOneWithRetry]
  );

  return { ...state, start, reset };
}
