// import React, { useState, useRef, useCallback, useEffect } from 'react';
// import { View, StyleSheet, Alert, Text, TouchableOpacity, NativeModules } from 'react-native';
// import { Camera, useCameraDevice } from 'react-native-vision-camera';
// import { usePermissions } from '../hooks/usePermissions';
// import MaterialIcons from '@react-native-vector-icons/material-icons';
// import { persistPhoto, cleanupPhotos } from '../utils/fileUtils';
// import * as Progress from 'react-native-progress';
// import Animated, {
//   useSharedValue,
//   useAnimatedStyle,
//   withRepeat,
//   withTiming,
//   Easing,
// } from 'react-native-reanimated';
// import { useNavigation } from '@react-navigation/native';

// interface CameraComponentProps {
//   onPhotosCaptured: (paths: string[]) => void;
//   captureCount: number;
// }

// const BLUR_THRESHOLD = 80;
// const AUTO_CAPTURE_DELAY_MS = 800;
// const MAX_CONSECUTIVE_REJECTS = 5;

// const CameraComponent: React.FC<CameraComponentProps> = ({ onPhotosCaptured, captureCount }) => {
//   const device = useCameraDevice('back');
//   const navigation = useNavigation<any>();

//   const [persistedPaths, setPersistedPaths] = useState<string[]>([]);
//   const [autoCapturing, setAutoCapturing] = useState(false);
//   const [statusText, setStatusText] = useState('');

//   const cameraRef = useRef<Camera>(null);
//   const reachedFinalCountRef = useRef(false);
//   const autoCapturingRef = useRef(false);
//   const persistedPathsRef = useRef<string[]>([]);
//   const mountedRef = useRef(true);

//   // Stop everything on unmount
//   useEffect(() => {
//     return () => {
//       mountedRef.current = false;
//       autoCapturingRef.current = false;
//     };
//   }, []);

//   // Keep refs in sync with state
//   useEffect(() => {
//     autoCapturingRef.current = autoCapturing;
//   }, [autoCapturing]);

//   // Pulse animation
//   const scale = useSharedValue(1);
//   useEffect(() => {
//     scale.value = withRepeat(
//       withTiming(1.1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
//       -1,
//       true
//     );
//   }, [scale]);

//   const animatedButtonStyle = useAnimatedStyle(() => ({
//     transform: [{ scale: scale.value }],
//   }));

//   const progress = captureCount === 0 ? 0 : persistedPaths.length / captureCount;

//   const { status, requestPermission } = usePermissions();

//   const captureOnePhoto = useCallback(async (): Promise<'accepted' | 'rejected' | 'error'> => {
//     if (!cameraRef.current || !mountedRef.current) return 'error';

//     try {
//       const photo = await cameraRef.current.takePhoto({ flash: 'auto' });
//       if (!mountedRef.current) return 'error';
//       const stablePath = await persistPhoto(photo);

//       const { ImageQuality } = NativeModules as {
//         ImageQuality: {
//           checkBlur: (path: string) => Promise<number>;
//           checkExposure: (path: string) => Promise<'underexposed' | 'overexposed' | 'ok'>;
//         };
//       };

//       // Check blur
//       const blurVariance = await ImageQuality.checkBlur(stablePath);
//       if (blurVariance < BLUR_THRESHOLD) {
//         setStatusText(`Skipped: blurry (score: ${Math.round(blurVariance)})`);
//         await cleanupPhotos([stablePath]);
//         return 'rejected';
//       }

//       // Check exposure
//       const exposureStatus = await ImageQuality.checkExposure(stablePath);
//       if (exposureStatus === 'underexposed') {
//         setStatusText('Skipped: too dark');
//         await cleanupPhotos([stablePath]);
//         return 'rejected';
//       }
//       if (exposureStatus === 'overexposed') {
//         setStatusText('Skipped: too bright');
//         await cleanupPhotos([stablePath]);
//         return 'rejected';
//       }

//       // Accepted — update ref immediately so the loop sees it
//       setStatusText('Photo accepted');
//       persistedPathsRef.current = [...persistedPathsRef.current, stablePath];
//       setPersistedPaths(persistedPathsRef.current);
//       return 'accepted';
//     } catch (error: any) {
//       // "Camera is closed" means component is unmounting — stop silently
//       if (String(error).includes('Camera is closed')) {
//         return 'error';
//       }
//       console.error('Capture error:', error);
//       setStatusText('Capture failed, retrying...');
//       return 'error';
//     }
//   }, []);

//   const runAutoCapture = useCallback(async () => {
//     let consecutiveRejects = 0;

//     while (
//       mountedRef.current &&
//       autoCapturingRef.current &&
//       persistedPathsRef.current.length < captureCount
//     ) {
//       const count = persistedPathsRef.current.length;
//       setStatusText(`Capturing ${count + 1} of ${captureCount}...`);

//       const result = await captureOnePhoto();

//       if (!mountedRef.current || !autoCapturingRef.current) break;

//       if (result === 'accepted') {
//         consecutiveRejects = 0;
//       } else if (result === 'rejected') {
//         consecutiveRejects++;
//         if (consecutiveRejects >= MAX_CONSECUTIVE_REJECTS) {
//           setStatusText('Too many bad photos. Hold the phone steadier.');
//           // Pause briefly before continuing
//           await new Promise((r) => setTimeout(r, 2000));
//           consecutiveRejects = 0;
//         }
//       }

//       // Small delay between captures
//       await new Promise((r) => setTimeout(r, AUTO_CAPTURE_DELAY_MS));
//     }

//     setAutoCapturing(false);
//     if (persistedPathsRef.current.length >= captureCount) {
//       setStatusText('All photos captured!');
//     }
//   }, [captureCount, captureOnePhoto]);

//   const toggleAutoCapture = useCallback(() => {
//     if (autoCapturing) {
//       // Stop
//       setAutoCapturing(false);
//       setStatusText('Paused');
//     } else {
//       // Start
//       setAutoCapturing(true);
//       setStatusText('Starting auto-capture...');
//     }
//   }, [autoCapturing]);

//   // Start the loop when autoCapturing becomes true
//   useEffect(() => {
//     if (autoCapturing && persistedPaths.length < captureCount) {
//       runAutoCapture();
//     }
//   }, [autoCapturing, captureCount, runAutoCapture, persistedPaths.length]); // intentionally minimal deps - runAutoCapture uses refs

//   // Call parent when all photos are captured — stop capture first
//   useEffect(() => {
//     if (persistedPaths.length !== captureCount) return;
//     if (reachedFinalCountRef.current) return;

//     reachedFinalCountRef.current = true;
//     autoCapturingRef.current = false;
//     setAutoCapturing(false);

//     const snapshot = [...persistedPaths];
//     onPhotosCaptured(snapshot);
//   }, [persistedPaths.length, captureCount, onPhotosCaptured, persistedPaths]);

//   if (status !== 'granted') {
//     return (
//       <View style={styles.permissionContainer}>
//         <Text style={styles.permissionText}>Camera permission required</Text>
//         <TouchableOpacity
//           style={styles.grantButton}
//           onPress={async () => {
//             const granted = await requestPermission();
//             if (!granted) {
//               Alert.alert('Permission Denied', 'Camera access is required.');
//             }
//           }}
//         >
//           <Text style={styles.grantButtonText}>Grant Permission</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   if (device == null) {
//     return (
//       <View style={styles.fallbackContainer}>
//         <Text style={styles.fallbackText}>No camera available</Text>
//       </View>
//     );
//   }

//   const done = persistedPaths.length >= captureCount;

//   return (
//     <View style={styles.container}>
//       <Camera
//         ref={cameraRef}
//         style={StyleSheet.absoluteFill}
//         device={device}
//         isActive={true}
//         photo={true}
//       />

//       <View style={styles.overlay}>
//         {/* Live status feedback */}
//         {statusText ? (
//           <View style={styles.statusBadge}>
//             <Text style={styles.statusText}>{statusText}</Text>
//           </View>
//         ) : null}

//         <View style={styles.progressContainer}>
//           <Progress.Circle
//             size={110}
//             progress={progress}
//             color="#34d399"
//             unfilledColor="rgba(51, 65, 85, 0.35)"
//             borderWidth={0}
//             thickness={8}
//             showsText={false}
//             animated={true}
//             style={styles.progressRing}
//           />
//           <View style={styles.countCenter}>
//             <Text style={styles.countNumber}>{persistedPaths.length}</Text>
//             <Text style={styles.countTotal}> / {captureCount}</Text>
//           </View>
//         </View>

//         <Animated.View style={[styles.captureButtonWrapper, animatedButtonStyle]}>
//           <TouchableOpacity
//             style={[styles.captureButton, autoCapturing && styles.captureButtonActive]}
//             onPress={toggleAutoCapture}
//             disabled={done}
//             activeOpacity={0.75}
//           >
//             <MaterialIcons
//               name={autoCapturing ? 'stop' : 'photo-camera'}
//               size={44}
//               color="#ffffff"
//             />
//           </TouchableOpacity>
//         </Animated.View>

//         {autoCapturing && <Text style={styles.autoLabel}>Auto-capturing... Tap to stop</Text>}

//         <TouchableOpacity
//           style={styles.cancelFab}
//           onPress={async () => {
//             setAutoCapturing(false);
//             await cleanupPhotos(persistedPaths);
//             setPersistedPaths([]);
//             reachedFinalCountRef.current = false;
//             navigation.goBack();
//           }}
//         >
//           <Text style={styles.cancelFabText}>Cancel</Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#000' },
//   permissionContainer: {
//     flex: 1,
//     backgroundColor: '#0f172a',
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 40,
//   },
//   permissionText: { color: '#e2e8f0', fontSize: 20, textAlign: 'center', marginBottom: 24 },
//   grantButton: {
//     backgroundColor: '#3b82f6',
//     paddingVertical: 16,
//     paddingHorizontal: 40,
//     borderRadius: 20,
//   },
//   grantButtonText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
//   fallbackContainer: {
//     flex: 1,
//     backgroundColor: '#0f172a',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   fallbackText: { color: '#94a3b8', fontSize: 20 },
//   overlay: {
//     ...StyleSheet.absoluteFillObject,
//     justifyContent: 'flex-end',
//     alignItems: 'center',
//     paddingBottom: 80,
//   },
//   statusBadge: {
//     position: 'absolute',
//     top: 100,
//     backgroundColor: 'rgba(15, 23, 42, 0.8)',
//     paddingVertical: 8,
//     paddingHorizontal: 20,
//     borderRadius: 20,
//   },
//   statusText: {
//     color: '#e2e8f0',
//     fontSize: 15,
//     fontWeight: '600',
//     textAlign: 'center',
//   },
//   progressContainer: { position: 'absolute', bottom: 180, alignItems: 'center' },
//   progressRing: { shadowOpacity: 0.6, shadowRadius: 16 },
//   countCenter: { position: 'absolute', alignItems: 'center' },
//   countNumber: { color: '#ffffff', fontSize: 48, fontWeight: '800' },
//   countTotal: { color: '#cbd5e1', fontSize: 20, fontWeight: '600', marginTop: 4 },
//   captureButtonWrapper: { elevation: 12 },
//   captureButton: {
//     width: 88,
//     height: 88,
//     borderRadius: 50,
//     backgroundColor: '#ef4444',
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 5,
//     borderColor: 'rgba(255,255,255,0.3)',
//   },
//   captureButtonActive: {
//     backgroundColor: '#dc2626',
//     borderColor: 'rgba(239,68,68,0.5)',
//   },
//   autoLabel: {
//     color: '#fbbf24',
//     fontSize: 14,
//     fontWeight: '600',
//     marginTop: 12,
//   },
//   cancelFab: {
//     position: 'absolute',
//     top: 48,
//     right: 24,
//     backgroundColor: 'rgba(30,41,59,0.75)',
//     paddingVertical: 12,
//     paddingHorizontal: 28,
//     borderRadius: 30,
//   },
//   cancelFabText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
// });

// export default CameraComponent;
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  AppState,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { persistPhoto } from '../utils/fileUtils';

interface CameraComponentProps {
  onPhotosCaptured: (paths: string[]) => void;
  onProgress: (current: number, total: number) => void;
  captureCount: number;
  grid?: boolean;
  flash?: 'off' | 'on';
}

const CameraComponent: React.FC<CameraComponentProps> = ({
  onPhotosCaptured,
  onProgress,
  captureCount,
  grid = false,
  flash = 'off',
}) => {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [photos, setPhotos] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isAppActive, setIsAppActive] = useState(true);
  const cameraRef = useRef<Camera>(null);
  const photosRef = useRef<string[]>([]);
  const capturingRef = useRef(false);
  const [cameraPosition, setCameraPosition] = useState<'back' | 'front'>('back');
  const device = useCameraDevice(cameraPosition);

  // Track app state
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setIsAppActive(nextAppState === 'active');
    });
    return () => subscription.remove();
  }, []);

  // Auto-request permission on mount with delay
  useEffect(() => {
    const requestPermissions = async () => {
      if (!hasPermission) {
        // Small delay to ensure app is fully loaded
        await new Promise((resolve) => setTimeout(resolve, 500));
        await requestPermission();
      }
    };
    requestPermissions();
  }, [hasPermission, requestPermission]);

  // Update parent on progress
  useEffect(() => {
    onProgress(photos.length, captureCount);
  }, [photos.length, captureCount, onProgress]);

  const capturePhoto = useCallback(async () => {
    if (!cameraRef.current || !isCameraReady || !capturingRef.current || !isAppActive) {
      console.log(
        'Cannot capture: camera ready=',
        isCameraReady,
        'capturing=',
        capturingRef.current,
        'app active=',
        isAppActive
      );
      return false;
    }

    try {
      const photo = await cameraRef.current.takePhoto({
        flash: flash === 'on' ? 'on' : 'off',
      });
      const path = await persistPhoto(photo);

      photosRef.current = [...photosRef.current, path];
      setPhotos(photosRef.current);
      console.log(`Captured ${photosRef.current.length}/${captureCount} photos`);
      return true;
    } catch (error) {
      console.error('Capture error:', error);
      return false;
    }
  }, [flash, isCameraReady, isAppActive, captureCount]);

  const startCapturing = useCallback(async () => {
    if (!capturingRef.current || !isAppActive) return;

    console.log('Starting capture sequence...');

    // Wait for camera to be ready
    await new Promise((r) => setTimeout(r, 1000));

    while (photosRef.current.length < captureCount && capturingRef.current && isAppActive) {
      const success = await capturePhoto();
      if (!success) {
        await new Promise((r) => setTimeout(r, 1000));
      }
      if (capturingRef.current && photosRef.current.length < captureCount) {
        await new Promise((r) => setTimeout(r, 800));
      }
    }

    if (photosRef.current.length === captureCount && capturingRef.current) {
      console.log('Capture complete!');
      setIsCapturing(false);
      capturingRef.current = false;
      onPhotosCaptured(photosRef.current);
    }
  }, [captureCount, capturePhoto, onPhotosCaptured, isAppActive]);

  // Watch isCapturing state changes
  useEffect(() => {
    if (isCapturing && isCameraReady && isAppActive && photosRef.current.length < captureCount) {
      capturingRef.current = true;
      startCapturing();
    } else if (!isCapturing) {
      capturingRef.current = false;
    }
  }, [isCapturing, isCameraReady, isAppActive, captureCount, startCapturing]);

  const toggleCapture = () => {
    if (!isCameraReady) {
      console.log('Camera not ready');
      return;
    }

    if (isCapturing) {
      console.log('Stop button pressed');
      setIsCapturing(false);
      capturingRef.current = false;

      if (photosRef.current.length > 0) {
        onPhotosCaptured(photosRef.current);
      }
    } else {
      console.log('Start button pressed');
      setPhotos([]);
      photosRef.current = [];
      setIsCapturing(true);
    }
  };

  // Loading states
  if (!hasPermission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="no-photography" size={64} color="#fff" />
        <Text style={styles.loadingText}>No camera available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isAppActive && hasPermission}
        photo={true}
        onInitialized={() => {
          console.log('Camera initialized');
          setIsCameraReady(true);
        }}
        onError={(error) => {
          console.error('Camera error:', error);
        }}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Grid Overlay */}
        {grid && (
          <View style={styles.gridOverlay}>
            <View style={styles.gridLineVertical} />
            <View style={[styles.gridLineVertical, styles.gridLineVerticalSecond]} />
            <View style={styles.gridLineHorizontal} />
            <View style={[styles.gridLineHorizontal, styles.gridLineHorizontalSecond]} />
          </View>
        )}

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          <TouchableOpacity
            style={[styles.captureButton, isCapturing && styles.captureButtonActive]}
            activeOpacity={0.8}
            onPress={toggleCapture}
          >
            {isCapturing ? (
              <>
                <Icon name="stop" size={32} color="#fff" />
                <Text style={styles.captureButtonLabel}>Stop</Text>
              </>
            ) : (
              <>
                <Icon name="play-arrow" size={32} color="#fff" />
                <Text style={styles.captureButtonLabel}>Start</Text>
              </>
            )}
          </TouchableOpacity>

          {photos.length > 0 && (
            <View style={styles.counterBadge}>
              <Text style={styles.counterText}>
                {photos.length}/{captureCount}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.flipButton}
            onPress={() => setCameraPosition((prev) => (prev === 'back' ? 'front' : 'back'))}
          >
            <Icon name="flip-camera-ios" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {isCapturing && (
          <View style={styles.capturingIndicator}>
            <View style={styles.pulseDot} />
            <Text style={styles.capturingText}>
              Auto-capturing... {photos.length}/{captureCount}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLineVertical: {
    position: 'absolute',
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.4)',
    left: '33.33%',
  },
  gridLineVerticalSecond: {
    left: '66.66%',
  },
  gridLineHorizontal: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.4)',
    top: '33.33%',
  },
  gridLineHorizontalSecond: {
    top: '66.66%',
  },
  container: { flex: 1, backgroundColor: '#000' },
  centerContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  captureButtonActive: {
    backgroundColor: '#f59e0b',
  },
  captureButtonLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  counterBadge: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  counterText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  flipButton: {
    position: 'absolute',
    right: 40,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  capturingIndicator: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  capturingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default CameraComponent;
