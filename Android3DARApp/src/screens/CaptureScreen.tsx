import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CaptureScreenProps } from '../types/navigation';

import CameraComponent from '../components/CameraComponent';
import QualityFeedbackModal from '../components/QualityFeedbackModal';
import { cleanupPhotos } from '../utils/fileUtils';
import { clearCaptureFolder } from '../utils/captureFolder';
import { useUploadPipeline } from '../hooks/useUploadPipeline';
import { CaptureStartView } from '../components/CaptureStartView';
import { UploadProgressView } from '../components/UploadProgressView';

export default function CaptureScreen({ navigation }: CaptureScreenProps) {
  const [showCamera, setShowCamera] = useState(false);

  // quality modal state
  const [checkingQuality, setCheckingQuality] = useState(false);
  const [qualityMessage, setQualityMessage] = useState('');
  const [showQualityFeedback, setShowQualityFeedback] = useState(false);
  const [failedReason, setFailedReason] = useState<
    'blurry' | 'underexposed' | 'overexposed' | 'other'
  >('blurry');
  const [failedScore, setFailedScore] = useState<number | undefined>(undefined);
  const [tempFailedPath, setTempFailedPath] = useState<string | null>(null);
  const [forceAcceptPath, setForceAcceptPath] = useState<string | null>(null);

  // camera reset
  const [sessionId, setSessionId] = useState(0);

  // upload pipeline hook
  const {
    isUploading,
    uploadProgress,
    currentFileIndex,
    totalPhotos,
    currentFileProgress,
    start: startUpload,
    reset: resetUpload,
  } = useUploadPipeline();

  const handlePhotosCaptured = async (photoPaths: string[]) => {
    setCheckingQuality(true);

    try {
      const { projectId, jobId } = await startUpload(photoPaths);

      navigation.navigate('Processing', {
        jobId: jobId || 'fake-job-123',
        projectId,
      });
    } catch (e: any) {
      console.error('Full upload pipeline error:', e);
      Alert.alert('Upload Error', e?.message ?? 'Unknown error');
      resetUpload();
    } finally {
      setCheckingQuality(false);
    }
  };

  // 1) Start screen
  if (!showCamera) {
    return (
      <CaptureStartView
        onStart={async () => {
          await clearCaptureFolder();

          // reset quality states
          setForceAcceptPath(null);
          setTempFailedPath(null);
          setShowQualityFeedback(false);
          setQualityMessage('');
          setCheckingQuality(false);

          // reset upload
          resetUpload();

          // reset camera session
          setSessionId((s) => s + 1);
          setShowCamera(true);
        }}
      />
    );
  }

  // 2) Upload screen
  if (isUploading) {
    return (
      <UploadProgressView
        uploadProgress={uploadProgress}
        currentFileIndex={currentFileIndex}
        totalPhotos={totalPhotos}
        currentFileProgress={currentFileProgress}
      />
    );
  }

  // 3) Camera screen
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {checkingQuality ? (
        <View style={styles.overlayLoader}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loaderText}>Analyzing sharpness...</Text>
        </View>
      ) : (
        <>
          <CameraComponent
            key={sessionId}
            onPhotosCaptured={handlePhotosCaptured}
            captureCount={20}
            onQualityIssue={(msg) => setQualityMessage(msg)}
            onPhotoRejected={(reason, score, path) => {
              setFailedReason(reason);
              setFailedScore(score);
              setTempFailedPath(path ?? null);
              setShowQualityFeedback(true);
            }}
            forceAcceptPath={forceAcceptPath}
            onForceAcceptHandled={() => setForceAcceptPath(null)}
          />

          <Text style={styles.qualityText}>{qualityMessage}</Text>

          <QualityFeedbackModal
            visible={showQualityFeedback}
            reason={failedReason}
            score={failedScore ?? undefined}
            onRetake={() => {
              if (tempFailedPath) cleanupPhotos([tempFailedPath]);
              setShowQualityFeedback(false);
              setTempFailedPath(null);
            }}
            onKeep={() => {
              if (tempFailedPath) setForceAcceptPath(tempFailedPath);
              setShowQualityFeedback(false);
              setTempFailedPath(null);
            }}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  overlayLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: { marginTop: 20, fontSize: 18, color: '#e2e8f0', fontWeight: '600' },
  qualityText: { color: '#ef4444', fontSize: 16, marginTop: 10 },
});
