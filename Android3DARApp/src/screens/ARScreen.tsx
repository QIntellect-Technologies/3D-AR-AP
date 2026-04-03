import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import type { ARScreenProps } from '../types/navigation';

/**
 * AR Screen — two approaches:
 *
 * 1. Android Scene Viewer (intent://): opens Google's native AR viewer.
 *    Works on any ARCore-supported device with Google Play Services for AR.
 *
 * 2. WebXR fallback via <model-viewer> in a WebView for inline AR preview.
 */

function buildARHtml(glbUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"/>
  <style>
    * { margin:0; padding:0; }
    body { background:#000; overflow:hidden; }
    model-viewer {
      width: 100vw;
      height: 100vh;
      --poster-color: #020617;
    }
    #arStatus {
      position:fixed; top:60px; left:50%; transform:translateX(-50%);
      background:rgba(15,23,42,0.85); color:#e2e8f0; padding:8px 20px;
      border-radius:20px; font-family:system-ui; font-size:14px;
      z-index:10; pointer-events:none;
    }
  </style>
</head>
<body>
  <div id="arStatus">Tap the AR button to place in your space</div>

  <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js"></script>

  <model-viewer
    src="${glbUrl}"
    ar
    ar-modes="scene-viewer webxr quick-look"
    ar-scale="auto"
    camera-controls
    touch-action="pan-y"
    auto-rotate
    shadow-intensity="1"
    shadow-softness="0.5"
    exposure="1.1"
    environment-image="neutral"
    style="width:100vw;height:100vh;background:#020617;"
    loading="eager"
  >
    <button slot="ar-button" style="
      position:absolute; bottom:24px; left:50%; transform:translateX(-50%);
      background:#7c3aed; color:#fff; border:none; padding:14px 32px;
      border-radius:28px; font-size:16px; font-weight:700;
      cursor:pointer; box-shadow:0 4px 20px rgba(124,58,237,0.4);
    ">
      Place in Your Space
    </button>
  </model-viewer>

  <script type="module">
    const mv = document.querySelector('model-viewer');
    const status = document.getElementById('arStatus');

    mv.addEventListener('load', () => {
      status.textContent = 'Model loaded. Tap AR button below.';
      window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'MODEL_LOADED' }));
    });

    mv.addEventListener('ar-status', (e) => {
      const s = e.detail.status;
      if (s === 'session-started') {
        status.textContent = 'AR active — move phone to detect surface';
      } else if (s === 'object-placed') {
        status.textContent = 'Model placed! Pinch to resize, drag to move.';
      } else if (s === 'failed') {
        status.textContent = 'AR not supported on this device';
        window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'AR_FAILED' }));
      }
    });

    mv.addEventListener('error', (e) => {
      status.textContent = 'Error loading model';
      window.ReactNativeWebView?.postMessage(JSON.stringify({
        type: 'MODEL_ERROR', error: e.detail?.message || 'Unknown error'
      }));
    });
  </script>
</body>
</html>`;
}

export default function ARScreen({ route, navigation }: ARScreenProps) {
  const { glbUrl } = route.params;

  const openSceneViewer = useCallback(() => {
    // Android Scene Viewer — native AR experience
    const sceneViewerUrl =
      `intent://arvr.google.com/scene-viewer/1.0?` +
      `file=${encodeURIComponent(glbUrl)}` +
      `&mode=ar_preferred` +
      `&title=3D%20Model` +
      `#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;end;`;

    Linking.openURL(sceneViewerUrl).catch(() => {
      Alert.alert(
        'AR Not Available',
        'Google AR Services are not installed. Using WebXR fallback instead.'
      );
    });
  }, [glbUrl]);

  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'AR_FAILED') {
        Alert.alert(
          'AR Not Supported',
          'Your device does not support AR. You can still view the 3D model.'
        );
      }
    } catch {}
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <WebView
        source={{ html: buildARHtml(glbUrl) }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        mixedContentMode="always"
        onMessage={handleMessage}
        mediaPlaybackRequiresUserAction={false}
      />

      {/* Top bar */}
      <SafeAreaView style={styles.topBar} edges={['top']}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>AR View</Text>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      {/* Bottom controls */}
      <SafeAreaView style={styles.bottomBar} edges={['bottom']}>
        {Platform.OS === 'android' && (
          <TouchableOpacity style={styles.sceneViewerButton} onPress={openSceneViewer}>
            <MaterialIcons name="view-in-ar" size={28} color="#fff" />
            <Text style={styles.buttonLabel}>Open Native AR</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.downloadButton}
          onPress={() => Linking.openURL(glbUrl).catch(() => {})}
        >
          <MaterialIcons name="file-download" size={24} color="#fff" />
          <Text style={styles.buttonLabel}>Export GLB</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backButton: { padding: 8 },
  title: {
    flex: 1,
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  sceneViewerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    gap: 8,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    gap: 8,
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
