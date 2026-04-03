import React, { useRef, useState } from 'react';

import { View, Text, StyleSheet, TouchableOpacity, Share, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import type { ViewerScreenProps } from '../types/navigation';

function buildViewerHtml(glbUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#020617; overflow:hidden; touch-action:none; }
    canvas { display:block; width:100vw; height:100vh; }
    #loading {
      position:fixed; inset:0; display:flex; flex-direction:column;
      align-items:center; justify-content:center; background:#020617;
      color:#94a3b8; font-family:system-ui; z-index:10;
    }
    #loading.hidden { display:none; }
    .spinner {
      width:48px; height:48px; border:4px solid #1e293b;
      border-top-color:#10b981; border-radius:50%;
      animation: spin 0.8s linear infinite; margin-bottom:16px;
    }
    @keyframes spin { to { transform:rotate(360deg); } }
    #error { color:#ef4444; text-align:center; padding:24px; }
  </style>
</head>
<body>
  <div id="loading">
    <div class="spinner"></div>
    <div>Loading 3D Model...</div>
  </div>
  <div id="error" style="display:none"></div>

  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
    }
  }
  </script>

  <script type="module">
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);

    // Grid helper
    const grid = new THREE.GridHelper(10, 20, 0x1e293b, 0x0f172a);
    scene.add(grid);

    // Camera
    const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.01, 1000);
    camera.position.set(1, 1.5, 3);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.6;
    document.body.appendChild(renderer.domElement);

    // Controls - orbit around model
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0.5, 0);
    controls.minDistance = 0.5;
    controls.maxDistance = 20;

    // ===== IMPROVED LIGHTING FOR BETTER VISIBILITY =====
    // Ambient light for base illumination (increased intensity)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    // Hemisphere light for natural sky/ground illumination
    const hemiLight = new THREE.HemisphereLight(0x88aaff, 0xaa8866, 0.8);
    scene.add(hemiLight);

    // Main directional light (key light) - brighter
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    scene.add(mainLight);

    // Fill light from left side (warmer)
    const leftFill = new THREE.DirectionalLight(0xffccaa, 0.6);
    leftFill.position.set(-4, 3, 2);
    scene.add(leftFill);

    // Rim light from behind to highlight edges (cooler)
    const rimLight = new THREE.DirectionalLight(0xaaccff, 0.5);
    rimLight.position.set(0, 2, -4);
    scene.add(rimLight);

    // Warm fill from below to light underside
    const bottomFill = new THREE.PointLight(0xccaa88, 0.3);
    bottomFill.position.set(0, -2, 0);
    scene.add(bottomFill);

    // Front fill light
    const frontFill = new THREE.DirectionalLight(0xffeedd, 0.4);
    frontFill.position.set(0, 1, 3);
    scene.add(frontFill);
    // ===== END OF LIGHTING =====

    // Draco decoder for compressed GLB
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/');

    // Load GLB
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      '${glbUrl}',
      (gltf) => {
        const model = gltf.scene;

        // Auto-center and scale the model
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        model.scale.setScalar(scale);

        // Center horizontally, sit on ground
        model.position.x = -center.x * scale;
        model.position.y = -box.min.y * scale;
        model.position.z = -center.z * scale;

        scene.add(model);

        // Adjust camera to fit
        controls.target.set(0, (size.y * scale) / 2, 0);
        camera.position.set(0, size.y * scale * 0.8, maxDim * scale * 2);
        controls.update();

        loadingEl.classList.add('hidden');

        // Tell RN the model loaded
        window.ReactNativeWebView?.postMessage(JSON.stringify({
          type: 'MODEL_LOADED',
          vertices: countVertices(model),
          dimensions: { x: size.x.toFixed(2), y: size.y.toFixed(2), z: size.z.toFixed(2) }
        }));
      },
      (progress) => {
        if (progress.total > 0) {
          const pct = Math.round((progress.loaded / progress.total) * 100);
          loadingEl.querySelector('div:last-child').textContent = 'Loading: ' + pct + '%';
        }
      },
      (err) => {
        loadingEl.classList.add('hidden');
        errorEl.style.display = 'block';
        errorEl.textContent = 'Failed to load model: ' + (err.message || err);
        window.ReactNativeWebView?.postMessage(JSON.stringify({
          type: 'MODEL_ERROR', error: err.message || String(err)
        }));
      }
    );

    function countVertices(obj) {
      let count = 0;
      obj.traverse((child) => {
        if (child.isMesh && child.geometry) {
          count += child.geometry.attributes.position?.count || 0;
        }
      });
      return count;
    }

    // Handle resize
    addEventListener('resize', () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });

    // Handle messages from RN
    addEventListener('message', (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'RESET_VIEW') {
          controls.reset();
        }
      } catch {}
    });

    // Render loop
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();
  </script>
</body>
</html>`;
}

export default function ViewerScreen({ route, navigation }: ViewerScreenProps) {
  const { glbUrl } = route.params;
  const webviewRef = useRef<WebView>(null);
  const [modelInfo, setModelInfo] = useState<string | null>(null);

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'MODEL_LOADED') {
        setModelInfo(`${msg.vertices.toLocaleString()} vertices`);
      } else if (msg.type === 'MODEL_ERROR') {
        setModelInfo(`Error: ${msg.error}`);
      }
    } catch {}
  };

  const resetView = () => {
    webviewRef.current?.postMessage(JSON.stringify({ type: 'RESET_VIEW' }));
  };

  const shareModel = async () => {
    try {
      await Share.share({ message: `Check out this 3D model: ${glbUrl}`, url: glbUrl });
    } catch {}
  };

  const openInAR = () => {
    navigation.navigate('AR', { glbUrl });
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        source={{ html: buildViewerHtml(glbUrl) }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        mixedContentMode="always"
        onMessage={handleMessage}
        onError={() => setModelInfo('Failed to load viewer')}
      />

      {/* Top bar */}
      <SafeAreaView style={styles.topBar} edges={['top']}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          3D Model Viewer
        </Text>
        <TouchableOpacity style={styles.iconButton} onPress={shareModel}>
          <MaterialIcons name="share" size={22} color="#fff" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Model info badge */}
      {modelInfo && (
        <View style={styles.infoBadge}>
          <Text style={styles.infoText}>{modelInfo}</Text>
        </View>
      )}

      {/* Bottom controls */}
      <SafeAreaView style={styles.bottomBar} edges={['bottom']}>
        <TouchableOpacity style={styles.controlButton} onPress={resetView}>
          <MaterialIcons name="center-focus-strong" size={28} color="#fff" />
          <Text style={styles.controlLabel}>Reset</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.controlButton, styles.arButton]} onPress={openInAR}>
          <MaterialIcons name="view-in-ar" size={32} color="#fff" />
          <Text style={styles.controlLabel}>View in AR</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => Linking.openURL(glbUrl).catch(() => {})}
        >
          <MaterialIcons name="file-download" size={28} color="#fff" />
          <Text style={styles.controlLabel}>Download</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
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
    backgroundColor: 'rgba(2, 6, 23, 0.7)',
  },
  backButton: { padding: 8 },
  title: {
    flex: 1,
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  iconButton: { padding: 8 },
  infoBadge: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  infoText: { color: '#94a3b8', fontSize: 13 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  arButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  controlLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});
