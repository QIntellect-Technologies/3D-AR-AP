import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { api } from '../utils/api';
import type { ProjectListScreenProps } from '../types/navigation';

type Project = {
  id: string;
  title: string;
  description?: string;
  status: string;
  glb_url?: string | null;
};

export default function ProjectListScreen({ navigation }: ProjectListScreenProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchProjects = async () => {
      try {
        const result = await api<{ projects: Project[] }>('/projects');
        if (!active) return;
        setProjects(result.projects || []);
      } catch (err: any) {
        setError(err?.message || 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Scan Projects</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {projects.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No scans yet. Start a capture or upload a GLB model.</Text>
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => {
                if (item.glb_url) {
                  navigation.navigate('Viewer', { glbUrl: item.glb_url });
                } else {
                  navigation.navigate('Processing', { jobId: item.id, projectId: item.id });
                }
              }}
            >
              <Text style={styles.itemTitle}>{item.title || 'Untitled Scan'}</Text>
              <Text style={styles.itemSubtitle}>Status: {item.status}</Text>
              {item.glb_url ? <Text style={styles.itemSubtitle}>GLB ready</Text> : null}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 18 },
  error: { color: '#f87171', marginBottom: 12 },
  list: { paddingBottom: 24 },
  item: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  itemTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  itemSubtitle: { fontSize: 14, color: '#94a3b8', marginTop: 6 },
  empty: { marginTop: 40, alignItems: 'center' },
  emptyText: { color: '#94a3b8', textAlign: 'center' },
});
