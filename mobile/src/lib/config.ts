import Constants from 'expo-constants';

function trimBase(url: string | undefined): string | undefined {
  return url?.replace(/\/$/, '') || undefined;
}

/**
 * NestJS API (same as web `NEXT_PUBLIC_API_URL`).
 * - Physical device: set `EXPO_PUBLIC_API_URL` in `mobile/.env` to your Mac's LAN IP, e.g. `http://192.168.1.5:3001`.
 * - iOS simulator on Mac: `http://localhost:3001` works if env is unset.
 * - Android emulator: `http://10.0.2.2:3001`.
 *
 * `EXPO_PUBLIC_*` overrides `app.json` extra so `.env` can override a default `localhost` bundle.
 */
export const API_BASE =
  trimBase(process.env.EXPO_PUBLIC_API_URL) ||
  trimBase(Constants.expoConfig?.extra?.apiUrl as string | undefined) ||
  'http://localhost:3001';
