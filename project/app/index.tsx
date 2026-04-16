import { Redirect } from 'expo-router';

/**
 * Root "/" must map to a real screen. Without this file, the stack can try to
 * render an undefined route component (React error: Element type is invalid … got undefined).
 */
export default function RootIndex() {
  return <Redirect href="/auth/login" />;
}
