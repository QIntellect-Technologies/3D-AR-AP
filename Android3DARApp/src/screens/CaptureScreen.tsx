// import React, { useState } from 'react';
// import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import type { CaptureScreenProps } from '../types/navigation';

// import CameraComponent from '../components/CameraComponent';
// import { clearCaptureFolder } from '../utils/captureFolder';
// import { useUploadPipeline } from '../hooks/useUploadPipeline';
// import { CaptureStartView } from '../components/CaptureStartView';
// import { UploadProgressView } from '../components/UploadProgressView';

// export default function CaptureScreen({ navigation }: CaptureScreenProps) {
//   const [showCamera, setShowCamera] = useState(false);
//   const [checkingQuality, setCheckingQuality] = useState(false);

//   // camera reset
//   const [sessionId, setSessionId] = useState(0);

//   // upload pipeline hook
//   const {
//     isUploading,
//     uploadProgress,
//     currentFileIndex,
//     totalPhotos,
//     currentFileProgress,
//     start: startUpload,
//     reset: resetUpload,
//   } = useUploadPipeline();

//   const handlePhotosCaptured = async (photoPaths: string[]) => {
//     console.log('🔵 CaptureScreen: handlePhotosCaptured called with', photoPaths.length, 'photos');
//     setCheckingQuality(true);

//     try {
//       console.log('🔵 Calling startUpload...');
//       const { projectId, jobId } = await startUpload(photoPaths);
//       console.log('✅ startUpload succeeded:', { projectId, jobId });

//       console.log('🔵 Navigating to Processing...');

//       navigation.replace('Processing', {
//         jobId,
//         projectId,
//       });
//     } catch (e: any) {
//       console.error('❌ Full upload pipeline error:', e);
//       Alert.alert('Upload Error', e?.message ?? 'Unknown error');
//       resetUpload();
//     } finally {
//       setCheckingQuality(false);
//     }
//   };

//   // 1) Start screen
//   if (!showCamera) {
//     return (
//       <CaptureStartView
//         onStart={async () => {
//           await clearCaptureFolder();
//           setCheckingQuality(false);
//           resetUpload();
//           setSessionId((s) => s + 1);
//           setShowCamera(true);
//         }}
//       />
//     );
//   }

//   // 2) Upload screen
//   if (isUploading) {
//     return (
//       <UploadProgressView
//         uploadProgress={uploadProgress}
//         currentFileIndex={currentFileIndex}
//         totalPhotos={totalPhotos}
//         currentFileProgress={currentFileProgress}
//       />
//     );
//   }

//   // 3) Camera screen
//   return (
//     <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
//       {checkingQuality ? (
//         <View style={styles.overlayLoader}>
//           <ActivityIndicator size="large" color="#10b981" />
//           <Text style={styles.loaderText}>Preparing upload...</Text>
//         </View>
//       ) : (
//         <CameraComponent
//           key={sessionId}
//           onPhotosCaptured={handlePhotosCaptured}
//           captureCount={50}
//         />
//       )}
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#0f172a' },
//   overlayLoader: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: 'rgba(15, 23, 42, 0.85)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   loaderText: { marginTop: 20, fontSize: 18, color: '#e2e8f0', fontWeight: '600' },
// });
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import CameraComponent from '../components/CameraComponent';

export default function CaptureScreen({ navigation }: any) {
  const [capturedCount, setCapturedCount] = useState(0);
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [grid, setGrid] = useState(true);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    return () => {
      StatusBar.setBarStyle('default');
    };
  }, []);

  const handleProgress = (current: number) => {
    setCapturedCount(current);
    // Pulse animation on progress
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.1, useNativeDriver: true, friction: 3 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 3 }),
    ]).start();
  };

  const handleComplete = async (_paths: string[]) => {
    // Navigate to processing or next screen
    navigation.navigate('Processing', {
      jobId: 'temp-job-id',
      projectId: 'temp-project-id',
    });
  };

  const toggleFlash = () => {
    setFlash((prev) => (prev === 'off' ? 'on' : 'off'));
  };

  return (
    <View style={styles.container}>
      <CameraComponent
        onPhotosCaptured={handleComplete}
        onProgress={handleProgress}
        captureCount={60}
        grid={grid}
        flash={flash}
      />

      {/* Modern UI Overlay */}
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        {/* Header */}
        <View style={styles.topBar}>
          {/* Left Button - Back */}
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.headerTitle}>3D Scan</Text>

          {/* Right Buttons */}
          <View style={styles.rightControls}>
            <TouchableOpacity
              style={[styles.iconButton, grid && styles.activeButton]}
              onPress={() => setGrid((g) => !g)}
            >
              <Icon name="grid-on" size={20} color={grid ? '#4f8cff' : '#fff'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconButton, flash === 'on' && styles.activeButton]}
              onPress={toggleFlash}
            >
              <Icon name={flash === 'on' ? 'flash-on' : 'flash-off'} size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Guidance */}
        <View style={styles.guidanceContainer}>
          <LinearGradient
            colors={['rgba(59,130,246,0.2)', 'rgba(139,92,246,0.2)']}
            style={styles.guidanceCard}
          >
            <Icon name="slow-motion-video" size={20} color="#3b82f6" />
            <Text style={styles.guidanceText}>Move slowly around the object</Text>
          </LinearGradient>
        </View>

        {/* Quality Badge */}
        {capturedCount > 0 && (
          <Animated.View style={[styles.qualityBadge, { transform: [{ scale: scaleAnim }] }]}>
            <Icon name="check-circle" size={16} color="#10b981" />
            <Text style={styles.qualityText}>
              {capturedCount >= 50 ? 'Excellent' : capturedCount >= 30 ? 'Good' : 'In Progress'}
            </Text>
          </Animated.View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    paddingTop: 40,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightControls: {
    flexDirection: 'row',
    gap: 10,
  },
  activeButton: {
    backgroundColor: 'rgba(79,140,255,0.3)',
    borderWidth: 1,
    borderColor: '#4f8cff',
  },
  guidanceContainer: {
    alignItems: 'center',
    marginTop: 55,
  },
  guidanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
  },
  guidanceText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  qualityBadge: {
    position: 'absolute',
    bottom: 180,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  qualityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});
