import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { api } from '../utils/api';
import type { GLBUploadScreenProps } from '../types/navigation';

export default function GLBUploadScreen({ navigation }: GLBUploadScreenProps) {
  const [glbUrl, setGlbUrl] = useState('');
  const [processAR, setProcessAR] = useState(true);
  const [loading, setLoading] = useState(false);

  const uploadModel = async () => {
    if (!glbUrl.trim()) {
      return Alert.alert('Validation', 'Enter a downloadable GLB URL');
    }

    setLoading(true);

    try {
      const projectResp = await api<{ projectId: string }>('/projects', {
        method: 'POST',
        body: { title: 'GLB upload', description: 'GLB-only upload workflow' },
      });

      const projectId = projectResp.projectId;
      if (!projectId) throw new Error('Failed to create project');

      await api(`/projects/${projectId}/glb_url`, {
        method: 'PATCH',
        body: { glbUrl: glbUrl.trim() },
      });

      if (processAR) {
        await api(`/projects/${projectId}/trigger`, { method: 'POST' });
      }

      navigation.replace('Viewer', { glbUrl: glbUrl.trim() });
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Import Existing GLB</Text>
      <Text style={styles.subtitle}>Paste a GLB file URL (S3, Supabase, or public URL)</Text>

      <TextInput
        style={styles.input}
        placeholder="https://.../model.glb"
        value={glbUrl}
        onChangeText={setGlbUrl}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Enable AR spec processing</Text>
        <Switch value={processAR} onValueChange={setProcessAR} />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.disabledBtn]}
        onPress={uploadModel}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Import and View</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('Projects')}>
        <Text style={styles.linkText}>View Previous Projects</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 12 },
  subtitle: { color: '#94a3b8', marginBottom: 20 },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    color: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 26,
  },
  toggleLabel: { color: '#f8fafc', fontSize: 16, width: '80%' },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledBtn: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  linkBtn: { alignItems: 'center', marginTop: 16 },
  linkText: { color: '#8b5cf6', fontWeight: '600' },
});
