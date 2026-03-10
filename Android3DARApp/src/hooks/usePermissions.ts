import { useCallback, useEffect, useState } from 'react';
import { Camera } from 'react-native-vision-camera';

type PermissionState = 'granted' | 'not-determined' | 'denied' | 'restricted';

export function usePermissions() {
  const [status, setStatus] = useState<PermissionState>('not-determined');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const current = await Camera.getCameraPermissionStatus();
      setStatus(current as PermissionState);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const requestPermission = useCallback(async () => {
    setLoading(true);
    try {
      const result = await Camera.requestCameraPermission();
      setStatus(result as PermissionState);
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    status,
    loading,
    requestPermission,
    refresh,
    hasPermission: status === 'granted',
  };
}
