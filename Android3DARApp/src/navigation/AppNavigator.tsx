import React, { useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import ResetPasswordScreen from '@/screens/auth/ResetPasswordScreen';
import ForgotPasswordScreen from '@/screens/auth/ForgotPasswordScreen';
import SignupScreen from '@/screens/auth/SignupScreen';
import HomeScreen from '../screens/HomeScreen';
import CaptureScreen from '../screens/CaptureScreen';
import ProcessingScreen from '../screens/ProcessingScreen';
import ViewerScreen from '../screens/ViewerScreen';
import ARScreen from '../screens/ARScreen';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '@/screens/auth/LoginScreen';
import { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#0f172a' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        {!session ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen
              name="Capture"
              component={CaptureScreen}
              options={{ title: 'Capture Model' }}
            />
            <Stack.Screen
              name="Processing"
              component={ProcessingScreen}
              options={{ title: 'Processing...', headerLeft: () => null }} // no back during processing
            />
            <Stack.Screen name="Viewer" component={ViewerScreen} options={{ title: '3D Viewer' }} />
            <Stack.Screen
              name="AR"
              component={ARScreen}
              options={{ title: 'AR Placement', headerShown: false }} // full screen AR
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
