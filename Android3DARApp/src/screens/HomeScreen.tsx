import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import type { HomeScreenProps, RootStackParamList } from '../types/navigation';
import MaterialIcons from '@react-native-vector-icons/material-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: HomeScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.appName}>3D Capture AR</Text>
          {/* <Text style={styles.phase}>Phase 1 • MVP</Text> */}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create New Model</Text>
          <Text style={styles.cardSubtitle}>
            Capture 20–60 photos of any object and generate a 3D model in minutes.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Capture')}
          >
            <MaterialIcons name="add-a-photo" size={24} color="#ffffff" style={styles.buttonIcon} />
            <Text style={styles.primaryButtonText}>Start Capture</Text>
          </TouchableOpacity>
        </View>

        {/* Future buttons – disabled for now */}
        <TouchableOpacity style={[styles.secondaryButton, styles.disabled]} disabled>
          <Text style={styles.secondaryButtonText}>Continue Previous Job</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.secondaryButton, styles.disabled]} disabled>
          <Text style={styles.secondaryButtonText}>Import Existing Model</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    flex: 1,
    padding: 32,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1,
  },
  phase: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 8,
  },
  card: {
    backgroundColor: 'rgba(30,41,59,0.6)',
    borderRadius: 24,
    padding: 32,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  cardSubtitle: {
    fontSize: 16,
    color: '#cbd5e1',
    lineHeight: 24,
    marginBottom: 32,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  buttonIcon: {
    marginRight: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: 'rgba(51,65,85,0.4)',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  secondaryButtonText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
