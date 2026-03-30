import { useCallback, useState } from 'react';
import ImageQuality from '../native/ImageQuality';

export type BlurCheckResult = {
  isBlurry: boolean;
  variance: number;
  threshold: number;
};

export type ExposureCheckResult = {
  status: 'underexposed' | 'normal' | 'overexposed';
};

type UseBlurDetectionOptions = {
  blurThreshold?: number;
};

export function useBlurDetection(options: UseBlurDetectionOptions = {}) {
  const { blurThreshold = 100 } = options;

  const [isChecking, setIsChecking] = useState(false);
  const [lastVariance, setLastVariance] = useState<number | null>(null);
  const [lastExposure, setLastExposure] = useState<
    'underexposed' | 'normal' | 'overexposed' | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const checkBlur = useCallback(
    async (imagePath: string): Promise<BlurCheckResult> => {
      setIsChecking(true);
      setError(null);

      try {
        const variance = await ImageQuality.getBlurVariance(imagePath);
        setLastVariance(variance);

        return {
          isBlurry: variance < blurThreshold,
          variance,
          threshold: blurThreshold,
        };
      } catch (e: any) {
        const message = e?.message ?? 'Blur detection failed';
        setError(message);
        throw e;
      } finally {
        setIsChecking(false);
      }
    },
    [blurThreshold]
  );

  const checkExposure = useCallback(async (imagePath: string): Promise<ExposureCheckResult> => {
    setIsChecking(true);
    setError(null);

    try {
      const status = await ImageQuality.getExposureStatus(imagePath);
      setLastExposure(status);
      return { status };
    } catch (e: any) {
      const message = e?.message ?? 'Exposure detection failed';
      setError(message);
      throw e;
    } finally {
      setIsChecking(false);
    }
  }, []);

  return {
    isChecking,
    lastVariance,
    lastExposure,
    error,
    checkBlur,
    checkExposure,
  };
}

export default useBlurDetection;
