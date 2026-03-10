import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Progress from 'react-native-progress';

export function UploadProgressView(props: {
  uploadProgress: number;
  currentFileIndex: number;
  totalPhotos: number;
  currentFileProgress: number;
}) {
  const { uploadProgress, currentFileIndex, totalPhotos, currentFileProgress } = props;

  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color="#10b981" />

        <Text style={styles.statusText}>
          Uploading photo {currentFileIndex} of {totalPhotos || 20}
        </Text>

        <View style={styles.progressBarContainer}>
          <Progress.Bar
            progress={clamp01(uploadProgress)}
            width={280}
            height={12}
            color="#10b981"
            unfilledColor="#334155"
            borderWidth={0}
            animated
          />
          <Text style={styles.progressText}>{Math.round(clamp01(uploadProgress) * 100)}%</Text>
        </View>

        {currentFileProgress > 0 && currentFileProgress < 1 && (
          <Text style={styles.subProgress}>
            Current photo: {Math.round(currentFileProgress * 100)}%
          </Text>
        )}

        <Text style={styles.fileLine}>
          File: {currentFileIndex}/{totalPhotos}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusText: { marginTop: 24, fontSize: 18, color: '#cbd5e1' },
  progressBarContainer: { marginTop: 24, alignItems: 'center' },
  progressText: { marginTop: 8, color: '#e2e8f0', fontSize: 18, fontWeight: '600' },
  subProgress: { marginTop: 8, color: '#94a3b8', fontSize: 14 },
  fileLine: { color: '#94a3b8', fontSize: 12, marginTop: 16 },
});
