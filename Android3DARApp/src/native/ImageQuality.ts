import { NativeModules } from 'react-native';

type ExposureStatus = 'underexposed' | 'normal' | 'overexposed';

type ImageQualityNativeModule = {
  detectBlur?: (imagePath: string) => Promise<number>;
  getBlurVariance?: (imagePath: string) => Promise<number>;
  checkExposure?: (imagePath: string) => Promise<ExposureStatus>;
  getExposureStatus?: (imagePath: string) => Promise<ExposureStatus>;
};

const NativeImageQuality =
  (NativeModules.ImageQuality as ImageQualityNativeModule | undefined) ?? {};

const normalizePath = (path: string) =>
  path.startsWith('file://') ? path.replace('file://', '') : path;

export async function getBlurVariance(imagePath: string): Promise<number> {
  const safePath = normalizePath(imagePath);

  if (typeof NativeImageQuality.getBlurVariance === 'function') {
    return NativeImageQuality.getBlurVariance(safePath);
  }

  if (typeof NativeImageQuality.detectBlur === 'function') {
    return NativeImageQuality.detectBlur(safePath);
  }

  throw new Error('ImageQuality native module is not linked');
}

export async function getExposureStatus(imagePath: string): Promise<ExposureStatus> {
  const safePath = normalizePath(imagePath);

  if (typeof NativeImageQuality.getExposureStatus === 'function') {
    return NativeImageQuality.getExposureStatus(safePath);
  }

  if (typeof NativeImageQuality.checkExposure === 'function') {
    return NativeImageQuality.checkExposure(safePath);
  }

  throw new Error('ImageQuality native module is not linked');
}

export const ImageQuality = {
  getBlurVariance,
  getExposureStatus,
};

export default ImageQuality;
