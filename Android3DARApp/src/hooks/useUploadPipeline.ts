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
      console.log(
        `[Upload] Starting upload for photo ${index0 + 1}/${total} with signedUrl: ${signedUrl}`
      );
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          setState((s) => ({ ...s, currentFileProgress: 0 }));
          console.log(`[Upload] Attempt ${attempt} for photo ${index0 + 1}`);
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
          console.log(`[Upload] Response status for photo ${index0 + 1}: ${status}`);
          if (status !== 200) {
            const body = await res.text();
            console.error(`[Upload] Upload failed with body: ${body}`);
            throw new Error(`HTTP ${status}: ${body}`);
          }

          setState((s) => ({
            ...s,
            currentFileProgress: 1,
            uploadProgress: clamp01((index0 + 1) / total),
          }));
          console.log(`[Upload] Successfully uploaded photo ${index0 + 1}`);
          return true;
        } catch (e: any) {
          const msg = e?.message ?? String(e);
          console.error(`Upload attempt ${attempt} failed for photo ${index0 + 1}:`, msg);

          if (attempt < MAX_RETRIES) {
            const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
            console.log(`[Upload] Retrying in ${delay}ms...`);
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
      console.log(`[Pipeline] Starting upload pipeline for ${total} photos`);

      setState({
        isUploading: true,
        uploadProgress: 0,
        currentFileIndex: 0,
        currentFileProgress: 0,
        totalPhotos: total,
      });

      // Refresh token once before protected backend calls
      console.log('[Pipeline] Refreshing session...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      console.log('refreshSession error =', refreshError?.message);
      console.log('refreshSession token exists =', !!refreshData.session?.access_token);
      console.log('New token after refresh:', refreshData.session?.access_token);

      // 1) Create project
      console.log('[Pipeline] Creating project...');
      let projectJson: { projectId: string };
      try {
        projectJson = await api<{ projectId: string }>('/projects', {
          method: 'POST',
          body: {
            title: `Scan ${new Date().toLocaleString()}`,
            description: 'Auto-created from mobile app',
          },
        });
        console.log('[Pipeline] Project created:', projectJson);
      } catch (err: any) {
        console.error('[Pipeline] Failed to create project:', err.message);
        throw err;
      }
      console.log('[Pipeline] Project created:', projectJson);
      const projectId = projectJson.projectId;
      if (!projectId) {
        console.error('[Pipeline] No projectId in response');
        throw new Error('Backend did not return projectId');
      }
      console.log(`[Pipeline] Project ID: ${projectId}`);

      // 2) Get signed URLs
      console.log('[Pipeline] Requesting signed URLs...');
      let urlsJson: { signedUrls: { signedUrl: string }[] };
      try {
        urlsJson = await api<{ signedUrls: { signedUrl: string }[] }>(
          '/uploads/signed-upload-urls',
          {
            method: 'POST',
            body: { projectId, photoCount: total },
          }
        );
        console.log(`[Pipeline] Received ${urlsJson.signedUrls.length} signed URLs`);
      } catch (err: any) {
        console.error('[Pipeline] Failed to get signed URLs:', err.message);
        throw err;
      }

      if (!urlsJson.signedUrls) {
        console.error('[Pipeline] No signedUrls in response');
        throw new Error('Failed to get signed URLs');
      }

      const signedUrls = urlsJson.signedUrls;

      if (!Array.isArray(signedUrls) || signedUrls.length !== total) {
        console.error(
          `[Pipeline] Signed URLs length mismatch: expected ${total}, got ${signedUrls?.length ?? 'none'}`
        );
        throw new Error(
          `Invalid signedUrls array (expected ${total}, got ${signedUrls?.length ?? 'none'})`
        );
      }

      // 3) Upload sequentially
      console.log('[Pipeline] Starting sequential uploads...');
      for (let i = 0; i < total; i++) {
        setState((s) => ({ ...s, currentFileIndex: i + 1 }));

        const filePath = photoPaths[i];
        const signedUrl = signedUrls[i]?.signedUrl;

        if (!signedUrl) {
          console.error(`[Pipeline] Missing signedUrl for photo ${i + 1}`);
          continue;
        }

        const exists = await RNFS.exists(filePath);
        if (!exists) {
          console.error(`[Pipeline] File missing for photo ${i + 1}: ${filePath}`);
          continue;
        }

        await uploadOneWithRetry({ filePath, signedUrl, index0: i, total });
      }

      console.log('[Pipeline] All uploads completed');

      // 4) Cleanup local files
      console.log('[Pipeline] Cleaning up local files...');
      await cleanupPhotos(photoPaths);
      console.log('[Pipeline] Cleanup done');

      // 5) Trigger reconstruction
      console.log(`[Pipeline] Triggering reconstruction for project ${projectId}...`);
      let jobId: string | undefined;
      try {
        const triggerJson = await api<{ jobId?: string }>(`/projects/${projectId}/trigger`, {
          method: 'POST',
        });
        jobId = triggerJson?.jobId;
        console.log('Job enqueued with ID:', jobId);
      } catch (e: any) {
        console.warn('[Pipeline] Trigger failed:', e.message);
      }

      setState((s) => ({ ...s, uploadProgress: 1 }));

      return { projectId, jobId };
    },
    [uploadOneWithRetry]
  );

  return { ...state, start, reset };
}
