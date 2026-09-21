export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'blocked';

export interface PermissionResult {
  state: PermissionState;
  canAskAgain: boolean;
}

export interface PermissionOnboardingState {
  completed: boolean;
  completedAt?: string;
}
