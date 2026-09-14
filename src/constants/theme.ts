/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

/**
 * PawTrack brand palette — warm orange for pets, blue for assets/tracked items,
 * tuned separately per theme so dark mode uses lighter/desaturated tones
 * rather than a raw inversion of the light palette.
 */
export const PawTrackColors = {
  light: {
    background: '#FFF7ED',
    surface: '#FFFFFF',
    surfaceMuted: '#FFEDD9',
    border: '#FED7AA',
    textPrimary: '#1F2937',
    textSecondary: '#78716C',
    pet: '#F97316',
    petSoft: '#FFEDD5',
    asset: '#2563EB',
    assetSoft: '#DBEAFE',
    location: '#16A34A',
    danger: '#DC2626',
    dangerSoft: '#FEE2E2',
  },
  dark: {
    background: '#120D08',
    surface: '#1E1712',
    surfaceMuted: '#2A211A',
    border: '#3F2F22',
    textPrimary: '#F5F1EC',
    textSecondary: '#B8AEA2',
    pet: '#FB923C',
    petSoft: '#3A2412',
    asset: '#60A5FA',
    assetSoft: '#122340',
    location: '#4ADE80',
    danger: '#F87171',
    dangerSoft: '#3A1414',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// Widened (non-literal) type so a variable can hold either the light or dark
// PawTrackColors palette interchangeably, e.g. after a `scheme === 'dark' ? ... : ...` pick.
export type PawTrackPalette = Record<keyof typeof PawTrackColors.light, string>;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
