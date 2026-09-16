import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react';
import { getCameraStreamUrl } from '../api/cameraStream';

type CameraStreamImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> & {
  deviceId: string | number;
  reloadKey?: number;
  onStreamError?: () => void;
};

export default function CameraStreamImage({
  deviceId,
  reloadKey = 0,
  onStreamError,
  ...imageProps
}: CameraStreamImageProps) {
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const onStreamErrorRef = useRef(onStreamError);

  useEffect(() => {
    onStreamErrorRef.current = onStreamError;
  }, [onStreamError]);

  useEffect(() => {
    let cancelled = false;
    setStreamUrl(null);

    getCameraStreamUrl(deviceId)
      .then((url) => {
        if (!cancelled) setStreamUrl(url);
      })
      .catch((error) => {
        console.error(`Could not prepare camera ${deviceId} stream:`, error);
        if (!cancelled) onStreamErrorRef.current?.();
      });

    return () => {
      cancelled = true;
    };
  }, [deviceId, reloadKey]);

  if (!streamUrl) return null;

  return (
    <img
      {...imageProps}
      src={streamUrl}
      onError={() => onStreamErrorRef.current?.()}
    />
  );
}
