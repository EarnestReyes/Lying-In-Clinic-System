import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export interface AdminMenuItem {
  label: string;
  path: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  section: string;
}

/** Shared menu model. Add a route here to expose it on every staff page. */
export class AdminNavigation {
  constructor(public readonly items: readonly AdminMenuItem[]) {}

  get sections(): string[] {
    return [...new Set(this.items.map(item => item.section))];
  }

  itemsIn(section: string): readonly AdminMenuItem[] {
    return this.items.filter(item => item.section === section);
  }

  isActive(item: AdminMenuItem, pathname: string): boolean {
    const path = pathname.replace('/(admin)', '').replace(/\/$/, '');
    return path === item.path || path.startsWith(`${item.path}/`);
  }
}

export const adminNavigation = new AdminNavigation([
  { label: 'Dashboard', path: '/dashboard', icon: 'grid-outline', section: 'Main Menu' },
  { label: 'Patients', path: '/patients', icon: 'people-outline', section: 'Main Menu' },
  { label: 'Patient Care', path: '/care', icon: 'heart-outline', section: 'Main Menu' },
  { label: 'Activity Library', path: '/activity-library', icon: 'body-outline', section: 'Main Menu' },
  { label: 'Appointments', path: '/appointments', icon: 'calendar-outline', section: 'Main Menu' },
  { label: 'Live Queue / Clinic QR', path: '/queue', icon: 'list-outline', section: 'Main Menu' },
  { label: 'Inventory', path: '/inventory', icon: 'medkit-outline', section: 'Other Menu' },
  { label: 'Financial Tracking', path: '/payments', icon: 'wallet-outline', section: 'Other Menu' },
]);
