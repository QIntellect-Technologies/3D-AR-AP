import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Animated, Vibration } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface QualityFeedbackModalProps {
  visible: boolean;
  onRetake: () => void;
  onKeep: () => void;
  reason: 'blurry' | 'underexposed' | 'overexposed' | 'other'; // extend later
  score?: number; // optional debug/info
}

const QualityFeedbackModal: React.FC<QualityFeedbackModalProps> = ({
  visible,
  onRetake,
  onKeep,
  reason,
  score,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;

  React.useEffect(() => {
    if (visible) {
      try {
        Vibration.vibrate(400);
      } catch {
        // Some devices/builds can throw if VIBRATE is missing or blocked.
      }
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, scaleAnim]);

  const getMessage = () => {
    if (reason === 'blurry') {
      return {
        title: 'Photo is Blurry',
        message:
          'The image is not sharp enough for good 3D reconstruction.\nPlease hold steady and retake.',
        icon: 'warning',
        color: '#ef4444',
      };
    }
    return {
      title: 'Quality Issue',
      message: 'Something went wrong with this photo.',
      icon: 'error',
      color: '#f59e0b',
    };
  };

  const { title, message, icon, color } = getMessage();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onKeep} // Android back button → keep
    >
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.modalContent, { transform: [{ scale: scaleAnim }] }]}>
          <MaterialIcons name={icon} size={64} color={color} style={styles.icon} />

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {score !== undefined && (
            <Text style={styles.score}>Sharpness score: {Math.round(score)}</Text>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.button, styles.keepButton]} onPress={onKeep}>
              <Text style={styles.keepText}>Keep Anyway</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, styles.retakeButton]} onPress={onRetake}>
              <Text style={styles.retakeText}>Retake Photo</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '90%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  icon: { marginBottom: 16 },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  score: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  keepButton: {
    backgroundColor: '#334155',
  },
  retakeButton: {
    backgroundColor: '#ef4444',
  },
  keepText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  retakeText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default QualityFeedbackModal;
