import { useEffect, useState } from 'react';
import { hasCompletedPermissionOnboarding, subscribePermissionOnboarding } from '../services/permissionService';

export function usePermissionOnboarding(uid?: string | null, enabled = true) {
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setError('');
    if (!uid || !enabled) {
      setCompleted(null);
      return;
    }
    setCompleted(null);
    const unsubscribe = subscribePermissionOnboarding(uid, value => {
      if (active) setCompleted(value);
    });
    hasCompletedPermissionOnboarding(uid)
      .then(value => {
        if (active) setCompleted(value);
      })
      .catch(reason => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : 'Unable to check onboarding status.');
        setCompleted(false);
      });
    return () => { active = false; unsubscribe(); };
  }, [uid, enabled, retry]);

  return { completed, loading: !!uid && enabled && completed === null, error, retry: () => setRetry(value => value + 1) };
}
