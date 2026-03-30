import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, Alert, Text, TouchableOpacity, NativeModules } from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { usePermissions } from '../hooks/usePermissions';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import { persistPhoto, cleanupPhotos } from '../utils/fileUtils';
import * as Progress from 'react-native-progress';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import RNFS from 'react-native-fs';

interface CameraComponentProps {
  onPhotosCaptured: (paths: string[]) => void;
  captureCount: number;
  onQualityIssue?: (msg: string) => void;

  onPhotoRejected?: (
    reason: 'blurry' | 'underexposed' | 'overexposed' | 'other',
    score?: number,
    path?: string
  ) => void;

  onPhotoAccepted?: (path: string) => void;

  forceAcceptPath?: string | null;
  onForceAcceptHandled?: () => void;
}

const CameraComponent: React.FC<CameraComponentProps> = ({
  onPhotosCaptured,
  captureCount,
  onQualityIssue,
  onPhotoRejected,
  onPhotoAccepted,
  forceAcceptPath,
  onForceAcceptHandled,
}) => {
  const device = useCameraDevice('back');
  const navigation = useNavigation<any>();

  const [isCapturing, setIsCapturing] = useState(false);
  const [persistedPaths, setPersistedPaths] = useState<string[]>([]);
  const [checkingQuality, setCheckingQuality] = useState(false);

  const cameraRef = useRef<Camera>(null);
  const reachedFinalCountRef = useRef(false);

  // Pulse animation (hooks MUST stay unconditional)
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [scale]);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const progress = captureCount === 0 ? 0 : persistedPaths.length / captureCount;

  const { status, requestPermission } = usePermissions();

  const capturePhoto = useCallback(async () => {
    if (!cameraRef.current) return;
    if (persistedPaths.length >= captureCount) return;
    if (isCapturing || checkingQuality) return;

    setIsCapturing(true);

    try {
      const photo = await cameraRef.current.takePhoto({ flash: 'auto' });
      const stablePath = await persistPhoto(photo);
      console.log('photo.path =', photo.path);
      console.log('stablePath =', stablePath);
      console.log('exists(stablePath) =', await RNFS.exists(stablePath));
      setCheckingQuality(true);

      try {
        const { ImageQuality } = NativeModules as {
          ImageQuality: {
            checkBlur: (path: string) => Promise<number>;
            checkExposure: (path: string) => Promise<'underexposed' | 'overexposed' | 'ok'>;
          };
        };

        const blurVariance = await ImageQuality.checkBlur(stablePath);
        if (blurVariance < 80) {
          onQualityIssue?.('Blurry');
          onPhotoRejected?.('blurry', blurVariance, stablePath);
          return;
        }

        const exposureStatus = await ImageQuality.checkExposure(stablePath);

        if (exposureStatus === 'underexposed') {
          onQualityIssue?.('Too dark');
          onPhotoRejected?.('underexposed', blurVariance, stablePath);
          return;
        }

        if (exposureStatus === 'overexposed') {
          onQualityIssue?.('Too bright');
          onPhotoRejected?.('overexposed', blurVariance, stablePath);
          return;
        }

        // ✅ Accepted
        onQualityIssue?.('');
        setPersistedPaths((prev) => [...prev, stablePath]);
        onPhotoAccepted?.(stablePath);
      } finally {
        setCheckingQuality(false);
      }
    } catch (error: any) {
      onQualityIssue?.('Some issue');
      onPhotoRejected?.('other');
      Alert.alert('Capture Failed', error?.message || 'An error occurred');
      console.error('Capture error:', error);
    } finally {
      setIsCapturing(false);
    }
  }, [
    captureCount,
    checkingQuality,
    isCapturing,
    onPhotoAccepted,
    onPhotoRejected,
    onQualityIssue,
    persistedPaths.length,
  ]);

  // ✅ Call parent ONLY from an effect (NOT inside setState)
  useEffect(() => {
    if (persistedPaths.length !== captureCount) return;
    if (reachedFinalCountRef.current) return;

    reachedFinalCountRef.current = true;

    // ✅ lock snapshot
    const snapshot = [...persistedPaths];

    console.log('✅ onPhotosCaptured snapshot first =', snapshot[0]);
    console.log('✅ onPhotosCaptured snapshot last  =', snapshot[snapshot.length - 1]);

    onPhotosCaptured(snapshot);
  }, [persistedPaths.length, captureCount, onPhotosCaptured, persistedPaths]);

  // ✅ Handle "Keep anyway" from parent safely
  useEffect(() => {
    if (!forceAcceptPath) return;

    setPersistedPaths((prev) =>
      prev.includes(forceAcceptPath) ? prev : [...prev, forceAcceptPath]
    );

    onQualityIssue?.('');
    onPhotoAccepted?.(forceAcceptPath);
    onForceAcceptHandled?.();
  }, [forceAcceptPath, onForceAcceptHandled, onPhotoAccepted, onQualityIssue]);

  // ✅ EARLY RETURNS ONLY (don’t duplicate conditional rendering)
  if (status !== 'granted') {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Camera permission required</Text>
        <TouchableOpacity
          style={styles.grantButton}
          onPress={async () => {
            const granted = await requestPermission();
            if (!granted) {
              Alert.alert('Permission Denied', 'Camera access is required.');
            }
          }}
        >
          <Text style={styles.grantButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={styles.fallbackContainer}>
        <Text style={styles.fallbackText}>No camera available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
      />

      <View style={styles.overlay}>
        <View style={styles.progressContainer}>
          <Progress.Circle
            size={110}
            progress={progress}
            color="#34d399"
            unfilledColor="rgba(51, 65, 85, 0.35)"
            borderWidth={0}
            thickness={8}
            showsText={false}
            animated={true}
            style={styles.progressRing}
          />
          <View style={styles.countCenter}>
            <Text style={styles.countNumber}>{persistedPaths.length}</Text>
            <Text style={styles.countTotal}> / {captureCount}</Text>
          </View>
        </View>

        <Animated.View style={[styles.captureButtonWrapper, animatedButtonStyle]}>
          <TouchableOpacity
            style={styles.captureButton}
            onPress={capturePhoto}
            disabled={isCapturing || checkingQuality || persistedPaths.length >= captureCount}
            activeOpacity={0.75}
          >
            <MaterialIcons name="photo-camera" size={44} color="#ffffff" />
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={styles.cancelFab}
          onPress={async () => {
            await cleanupPhotos(persistedPaths);
            setPersistedPaths([]);
            reachedFinalCountRef.current = false;
            navigation.goBack();
          }}
        >
          <Text style={styles.cancelFabText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionText: { color: '#e2e8f0', fontSize: 20, textAlign: 'center', marginBottom: 24 },
  grantButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 20,
  },
  grantButtonText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  fallbackContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: { color: '#94a3b8', fontSize: 20 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 80,
  },
  progressContainer: { position: 'absolute', bottom: 180, alignItems: 'center' },
  progressRing: { shadowOpacity: 0.6, shadowRadius: 16 },
  countCenter: { position: 'absolute', alignItems: 'center' },
  countNumber: { color: '#ffffff', fontSize: 48, fontWeight: '800' },
  countTotal: { color: '#cbd5e1', fontSize: 20, fontWeight: '600', marginTop: 4 },
  captureButtonWrapper: { elevation: 12 },
  captureButton: {
    width: 88,
    height: 88,
    borderRadius: 50,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cancelFab: {
    position: 'absolute',
    top: 48,
    right: 24,
    backgroundColor: 'rgba(30,41,59,0.75)',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 30,
  },
  cancelFabText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});

export default CameraComponent;
