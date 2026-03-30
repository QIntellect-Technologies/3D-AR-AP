import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { supabase } from '../../config/supabase';

export default function ResetPasswordScreen({ navigation }: any) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onUpdate = async () => {
    if (password.length < 8) return Alert.alert('Weak password', 'Use at least 8 characters');
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      Alert.alert('Success', 'Password updated. Please login again.');
      await supabase.auth.signOut();
      navigation.navigate('Login');
    } catch (e: any) {
      Alert.alert('Update failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set New Password</Text>

      <TextInput
        style={styles.input}
        placeholder="New password (min 8 chars)"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.btn} onPress={onUpdate} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'Updating...' : 'Update password'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 18 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 12, marginBottom: 12 },
  btn: {
    backgroundColor: '#111',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: { color: '#fff', fontWeight: '700' },
});
