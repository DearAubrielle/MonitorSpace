export const DEFAULT_DEVICE_ICON = '/icons/default.png';

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

export function getDeviceIconUrl(iconUrl?: string | null): string {
  if (!iconUrl) return DEFAULT_DEVICE_ICON;

  try {
    return new URL(iconUrl, SERVER_URL).toString();
  } catch {
    return DEFAULT_DEVICE_ICON;
  }
}

export function handleDeviceIconError(event: React.SyntheticEvent<HTMLImageElement>): void {
  const image = event.currentTarget;
  image.onerror = null;
  image.src = DEFAULT_DEVICE_ICON;
}
