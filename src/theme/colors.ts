/**
 * Single source of truth for the application's visual palette.
 *
 * React Native uses StyleSheet objects rather than CSS classes. Import `Colors`
 * into a screen/component and use its semantic names in styles:
 * `backgroundColor: Colors.surface`, `color: Colors.textPrimary`.
 * Updating a value here updates every style that consumes that token.
 */
export const Colors = {
  // Brand
  primary: '#0D9488',
  primaryDark: '#0F766E',
  primaryDeep: '#134E4A',
  primaryLight: '#CCFBF1',
  primaryPale: '#F0FDFA',
  primaryAccent: '#5EEAD4',
  primarySoft: '#99F6E4',
  primaryMint: '#A7F3D0',
  primaryWash: '#CFE8E5',

  // Surfaces and text
  surface: '#FFFFFF',
  pageBackground: '#F8FAFC',
  surfaceMuted: '#F1F5F9',
  surfaceSubtle: '#EEF2F6',
  surfaceWarm: '#F8FFFE',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textFaint: '#94A3B8',
  textDark: '#1E293B',
  textSlate: '#334155',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  overlay: '#000',

  // Informational
  info: '#0284C7',
  infoDark: '#0369A1',
  infoDeep: '#1E3A8A',
  infoStrong: '#2563EB',
  infoBright: '#3B82F6',
  infoPale: '#E0F2FE',
  infoSoft: '#BAE6FD',
  infoWash: '#EFF6FF',
  infoLavender: '#DBEAFE',
  indigo: '#4F46E5',
  indigoPale: '#E0E7FF',

  // Success
  success: '#16A34A',
  successBright: '#22C55E',
  successTeal: '#10B981',
  successPale: '#F0FDF4',
  successSoft: '#DCFCE7',
  successWash: '#ECFDF5',

  // Warning
  warning: '#D97706',
  warningBright: '#F59E0B',
  warningDark: '#92400E',
  warningPale: '#FFFBEB',
  warningSoft: '#FEF3C7',
  warningAccent: '#FDE68A',

  // Danger / priority
  danger: '#DC2626',
  dangerBright: '#EF4444',
  dangerDark: '#991B1B',
  dangerDeep: '#7F1D1D',
  dangerPale: '#FEF2F2',
  dangerSoft: '#FEE2E2',
  dangerBorder: '#FECACA',
  dangerAccent: '#FCA5A5',
  dangerWash: '#FFF7F7',

  // Accent colors retained for existing reporting/status views
  pink: '#DB2777',
  pinkPale: '#FCE7F3',
  legacyBlue: '#2e78b7',
  whiteLowercase: '#fff',
} as const;

export type AppColor = (typeof Colors)[keyof typeof Colors];
