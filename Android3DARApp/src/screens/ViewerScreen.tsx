import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Button } from 'react-native';
import type { ViewerScreenProps } from '../types/navigation';

export default function ViewerScreen({ route, navigation }: ViewerScreenProps) {
  const { glbUrl } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>3D Model Viewer</Text>
        <Text style={styles.url}>Model: {glbUrl}</Text>

        {/* Placeholder – later: <Canvas> + <useGLTF> + OrbitControls */}
        <View style={styles.previewPlaceholder}>
          <Text style={styles.placeholderText}>
            3D View Placeholder{'\n'}(React Three Fiber + GLB coming soon)
          </Text>
        </View>

        <Button
          title="View in AR →"
          onPress={() => navigation.navigate('AR', { glbUrl })}
          color="#ec4899"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  content: { flex: 1, padding: 24, alignItems: 'center' },
  title: { fontSize: 28, color: 'white', fontWeight: '600', marginVertical: 24 },
  url: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  previewPlaceholder: {
    flex: 1,
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
  },
  placeholderText: { color: '#94a3b8', textAlign: 'center', fontSize: 16 },
});
