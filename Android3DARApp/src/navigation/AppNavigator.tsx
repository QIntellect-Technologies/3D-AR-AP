import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from '../config/supabase';
import { RootStackParamList } from '../types/navigation';

// Screens
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import HomeScreen from '../screens/HomeScreen';
import ProjectListScreen from '../screens/ProjectListScreen';
import GLBUploadScreen from '../screens/GLBUploadScreen';
import CaptureScreen from '../screens/CaptureScreen';
import ProcessingScreen from '../screens/ProcessingScreen';
import ViewerScreen from '../screens/ViewerScreen';
import ARScreen from '../screens/ARScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Check auth session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Handle splash screen timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen navigation={{ replace: (): void => {} }} />;
  }

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
          // Auth Screens
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Signup" component={SignupScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
              options={{ title: 'Forgot Password' }}
            />
            <Stack.Screen
              name="ResetPassword"
              component={ResetPasswordScreen}
              options={{ title: 'Reset Password' }}
            />
          </>
        ) : (
          // Main App Screens
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="Projects"
              component={ProjectListScreen}
              options={{ title: 'Your Projects' }}
            />
            <Stack.Screen
              name="GLBUpload"
              component={GLBUploadScreen}
              options={{ title: 'Upload GLB Model' }}
            />
            <Stack.Screen
              name="Capture"
              component={CaptureScreen}
              options={{ title: 'Capture Model', headerShown: false }}
            />
            <Stack.Screen
              name="Processing"
              component={ProcessingScreen}
              options={{
                title: 'Processing...',
                headerLeft: () => null,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="Viewer"
              component={ViewerScreen}
              options={{ title: '3D Viewer', headerShown: false }}
            />
            <Stack.Screen
              name="AR"
              component={ARScreen}
              options={{ title: 'AR Placement', headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
