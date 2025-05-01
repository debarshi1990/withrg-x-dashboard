import { useEffect } from 'react';
import { useRouter, useRootNavigationState } from 'expo-router';

export default function HomePage() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (!rootNavigationState?.key) return; // Navigation not ready yet

    router.replace('/login');
  }, [rootNavigationState?.key]);

  return null;
}
