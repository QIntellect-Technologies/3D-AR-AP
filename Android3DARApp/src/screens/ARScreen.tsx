import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, Button } from 'react-native';
import type { ARScreenProps } from '../types/navigation';

export default function ARScreen({ route }: ARScreenProps) {
  const { glbUrl } = route.params;

  return (
    <>
      <StatusBar hidden />
      <SafeAreaView style={styles.container}>
        <View style={styles.arPlaceholder}>
          <Text style={styles.arText}>AR View Placeholder</Text>
          <Text style={styles.modelInfo}>Model: {glbUrl}</Text>
          <Text style={styles.hint}>
            Point camera at floor / table{'\n'}
            Tap to place model (ARCore coming soon)
          </Text>
        </View>

        {/* Bottom controls */}
        <View style={styles.controls}>
          <Button title="Reset" onPress={() => {}} color="#ef4444" />
          <Button title="Take Screenshot" onPress={() => {}} color="#3b82f6" />
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  arPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  arText: { fontSize: 32, color: '#60a5fa', fontWeight: 'bold', marginBottom: 16 },
  modelInfo: { fontSize: 16, color: '#94a3b8', marginBottom: 8 },
  hint: { fontSize: 18, color: 'white', textAlign: 'center', paddingHorizontal: 32 },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 32,
  },
});
