import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  // Auth
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;

  // App
  Home: undefined;
  Capture: undefined;
  Processing: { jobId: string; projectId: string }; // make projectId required if you use it
  Viewer: { glbUrl: string }; // keep naming consistent with ProcessingScreen
  AR: { glbUrl: string; scale?: number };
  Projects: undefined;
  GLBUpload: undefined;
  ProjectDetail: { projectId: string };
};

export type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
export type CaptureScreenProps = NativeStackScreenProps<RootStackParamList, 'Capture'>;
export type ProcessingScreenProps = NativeStackScreenProps<RootStackParamList, 'Processing'>;
export type ViewerScreenProps = NativeStackScreenProps<RootStackParamList, 'Viewer'>;
export type ARScreenProps = NativeStackScreenProps<RootStackParamList, 'AR'>;
