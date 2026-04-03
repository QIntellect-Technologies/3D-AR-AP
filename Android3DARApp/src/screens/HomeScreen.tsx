// import React from 'react';
// import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
// import type { HomeScreenProps } from '../types/navigation';
// import MaterialIcons from '@react-native-vector-icons/material-icons';

// export default function HomeScreen({ navigation }: HomeScreenProps) {
//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.content}>
//         <View style={styles.header}>
//           <Text style={styles.appName}>3D Capture AR</Text>
//           {/* <Text style={styles.phase}>Phase 1 • MVP</Text> */}
//         </View>

//         <View style={styles.card}>
//           <Text style={styles.cardTitle}>Create New Model</Text>
//           <Text style={styles.cardSubtitle}>
//             Capture 20–60 photos of any object and generate a 3D model in minutes.
//           </Text>

//           <TouchableOpacity
//             style={styles.primaryButton}
//             onPress={() => navigation.navigate('Capture')}
//           >
//             <MaterialIcons name="add-a-photo" size={24} color="#ffffff" style={styles.buttonIcon} />
//             <Text style={styles.primaryButtonText}>Start Capture</Text>
//           </TouchableOpacity>
//         </View>

//         <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Projects')}>
//           <Text style={styles.secondaryButtonText}>Continue Previous Job</Text>
//         </TouchableOpacity>

//         <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('GLBUpload')}>
//           <Text style={styles.secondaryButtonText}>Import Existing Model</Text>
//         </TouchableOpacity>
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#0f172a',
//   },
//   content: {
//     flex: 1,
//     padding: 32,
//     justifyContent: 'center',
//   },
//   header: {
//     alignItems: 'center',
//     marginBottom: 48,
//   },
//   appName: {
//     fontSize: 42,
//     fontWeight: '800',
//     color: '#ffffff',
//     letterSpacing: -1,
//   },
//   phase: {
//     fontSize: 16,
//     color: '#64748b',
//     marginTop: 8,
//   },
//   card: {
//     backgroundColor: 'rgba(30,41,59,0.6)',
//     borderRadius: 24,
//     padding: 32,
//     marginBottom: 24,
//     borderWidth: 1,
//     borderColor: 'rgba(255,255,255,0.08)',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 10 },
//     shadowOpacity: 0.4,
//     shadowRadius: 20,
//     elevation: 12,
//   },
//   cardTitle: {
//     fontSize: 28,
//     fontWeight: '700',
//     color: '#ffffff',
//     marginBottom: 12,
//   },
//   cardSubtitle: {
//     fontSize: 16,
//     color: '#cbd5e1',
//     lineHeight: 24,
//     marginBottom: 32,
//   },
//   primaryButton: {
//     flexDirection: 'row',
//     backgroundColor: '#3b82f6',
//     paddingVertical: 18,
//     borderRadius: 16,
//     alignItems: 'center',
//     justifyContent: 'center',
//     elevation: 8,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 6 },
//     shadowOpacity: 0.35,
//     shadowRadius: 12,
//   },
//   buttonIcon: {
//     marginRight: 12,
//   },
//   primaryButtonText: {
//     color: '#ffffff',
//     fontSize: 18,
//     fontWeight: '700',
//   },
//   secondaryButton: {
//     backgroundColor: 'rgba(51,65,85,0.4)',
//     paddingVertical: 16,
//     borderRadius: 16,
//     alignItems: 'center',
//     marginBottom: 16,
//     borderWidth: 1,
//     borderColor: 'rgba(255,255,255,0.1)',
//   },
//   secondaryButtonText: {
//     color: '#94a3b8',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   disabled: {
//     opacity: 0.5,
//   },
// });
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import type { HomeScreenProps } from '../types/navigation';

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  return (
    <LinearGradient colors={['#0f172a', '#020617']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
            <View>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.userName}>Yaseen Malik</Text>
            </View>
            <TouchableOpacity style={styles.profileButton}>
              <LinearGradient colors={['#3b82f6', '#8b5cf6']} style={styles.profileGradient}>
                <Text style={styles.profileInitial}>YM</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Stats Cards */}
          <Animated.View style={[styles.statsRow, { opacity: fadeAnim }]}>
            <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.statCard}>
              <MaterialIcons name="3d-rotation" size={24} color="#3b82f6" />
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Projects</Text>
            </LinearGradient>
            <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.statCard}>
              <MaterialIcons name="storage" size={24} color="#10b981" />
              <Text style={styles.statValue}>2.4</Text>
              <Text style={styles.statLabel}>GB Used</Text>
            </LinearGradient>
            <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.statCard}>
              <MaterialIcons name="schedule" size={24} color="#f59e0b" />
              <Text style={styles.statValue}>3</Text>
              <Text style={styles.statLabel}>Processing</Text>
            </LinearGradient>
          </Animated.View>

          {/* Main Action Card */}
          <Animated.View
            style={[styles.mainCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
          >
            <LinearGradient
              colors={['#3b82f6', '#8b5cf6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.mainCardBorder}
            >
              <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.mainCardContent}>
                <View style={styles.iconContainer}>
                  <MaterialIcons name="camera-alt" size={48} color="#fff" />
                </View>
                <Text style={styles.mainCardTitle}>New Capture</Text>
                <Text style={styles.mainCardDesc}>Take 20-60 photos or record video</Text>
                <Text style={styles.mainCardHint}>Professional 3D scanning guide</Text>
                <TouchableOpacity
                  style={styles.startButton}
                  onPress={() => navigation.navigate('Capture')}
                >
                  <Text style={styles.startButtonText}>Start Scanning →</Text>
                </TouchableOpacity>
              </LinearGradient>
            </LinearGradient>
          </Animated.View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('Projects')}
            >
              <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.quickActionContent}>
                <MaterialIcons name="folder" size={28} color="#3b82f6" />
                <Text style={styles.quickActionTitle}>My Projects</Text>
                <Text style={styles.quickActionDesc}>View all your 3D models</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('GLBUpload')}
            >
              <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.quickActionContent}>
                <MaterialIcons name="file-upload" size={28} color="#8b5cf6" />
                <Text style={styles.quickActionTitle}>Import Model</Text>
                <Text style={styles.quickActionDesc}>Upload existing GLB files</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Subscription Banner */}
          <LinearGradient
            colors={['rgba(59,130,246,0.1)', 'rgba(139,92,246,0.1)']}
            style={styles.subscriptionBanner}
          >
            <View style={styles.subscriptionContent}>
              <MaterialIcons name="stars" size={32} color="#f59e0b" />
              <View style={styles.subscriptionText}>
                <Text style={styles.subscriptionTitle}>Go Pro</Text>
                <Text style={styles.subscriptionDesc}>
                  Unlock AR export, advanced specs & faster processing
                </Text>
              </View>
              <TouchableOpacity style={styles.upgradeButton}>
                <Text style={styles.upgradeText}>Upgrade</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Recent Activity */}
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {[1, 2, 3].map((item) => (
              <LinearGradient
                key={item}
                colors={['#1e293b', '#0f172a']}
                style={styles.activityItem}
              >
                <View style={styles.activityIcon}>
                  <MaterialIcons name="check-circle" size={20} color="#10b981" />
                </View>
                <View style={styles.activityDetails}>
                  <Text style={styles.activityTitle}>Product_Scan_{item}</Text>
                  <Text style={styles.activityTime}>2 hours ago</Text>
                </View>
                <Text style={styles.activityStatus}>Completed</Text>
              </LinearGradient>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  greeting: { fontSize: 14, color: '#94a3b8', marginBottom: 4 },
  userName: { fontSize: 24, fontWeight: '700', color: '#fff' },
  profileButton: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden' },
  profileGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  profileInitial: { fontSize: 18, fontWeight: '600', color: '#fff' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.1)',
  },
  statValue: { fontSize: 24, fontWeight: '700', color: '#fff', marginTop: 8, marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#94a3b8' },
  mainCard: { marginHorizontal: 24, marginBottom: 24 },
  mainCardBorder: { borderRadius: 24, padding: 2 },
  mainCardContent: { borderRadius: 22, padding: 32, alignItems: 'center' },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59,130,246,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  mainCardTitle: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 8 },
  mainCardDesc: { fontSize: 16, color: '#94a3b8', textAlign: 'center', marginBottom: 8 },
  mainCardHint: { fontSize: 12, color: '#64748b', marginBottom: 24 },
  startButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
  },
  startButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  quickActions: { flexDirection: 'row', paddingHorizontal: 24, gap: 16, marginBottom: 24 },
  quickAction: { flex: 1 },
  quickActionContent: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.1)',
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 12,
    marginBottom: 4,
  },
  quickActionDesc: { fontSize: 12, color: '#94a3b8', textAlign: 'center' },
  subscriptionBanner: {
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  subscriptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  subscriptionText: { flex: 1 },
  subscriptionTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 4 },
  subscriptionDesc: { fontSize: 12, color: '#94a3b8' },
  upgradeButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  upgradeText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  recentSection: { paddingHorizontal: 24, marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 16 },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.1)',
  },
  activityIcon: { marginRight: 12 },
  activityDetails: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: '500', color: '#fff', marginBottom: 4 },
  activityTime: { fontSize: 12, color: '#64748b' },
  activityStatus: { fontSize: 12, color: '#10b981', fontWeight: '500' },
});
