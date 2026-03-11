import { scale, moderateScale, RFValue } from '../utils/responsive';

// Theme constants for ArbCrypto App
export const COLORS = {
  // Primary palette - Emerald/Cyan gradient (crypto vibes)
  primary: '#00D9A5',
  primaryDark: '#00B388',
  primaryLight: '#5EFFCE',

  // Secondary - Electric blue
  secondary: '#0EA5E9',
  secondaryDark: '#0284C7',
  secondaryLight: '#38BDF8',

  // Accent - Gold for profits
  accent: '#F59E0B',
  accentLight: '#FBBF24',

  // Status colors
  success: '#10B981',
  successLight: '#34D399',
  danger: '#EF4444',
  dangerLight: '#F87171',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Background gradients
  bgDark: '#0A0E17',
  bgMedium: '#111827',
  bgLight: '#1F2937',
  bgCard: '#1E293B',

  // Text colors
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  textInverse: '#111827',

  // Borders
  border: '#374151',
  borderLight: '#4B5563',

  // Glassmorphism
  glassLight: 'rgba(255, 255, 255, 0.08)',
  glassMedium: 'rgba(255, 255, 255, 0.12)',
  glassDark: 'rgba(0, 0, 0, 0.4)',

  // Gradients (as array for LinearGradient)
  gradientPrimary: ['#00D9A5', '#0EA5E9'],
  gradientSecondary: ['#0EA5E9', '#8B5CF6'],
  gradientProfit: ['#10B981', '#00D9A5'],
  gradientLoss: ['#EF4444', '#F97316'],
  gradientDark: ['#0A0E17', '#1F2937'],
  gradientCard: ['rgba(30, 41, 59, 0.8)', 'rgba(15, 23, 42, 0.9)'],
};

export const SPACING = {
  xs: moderateScale(4),
  sm: moderateScale(8),
  md: moderateScale(16),
  lg: moderateScale(24),
  xl: moderateScale(32),
  xxl: moderateScale(48),
};

export const FONT_SIZES = {
  xs: RFValue(10),
  sm: RFValue(12),
  md: RFValue(14),
  lg: RFValue(16),
  xl: RFValue(20),
  xxl: RFValue(24),
  xxxl: RFValue(32),
  display: RFValue(40), // Reduced from 48 for better fit
};

export const FONT_WEIGHTS = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};

export const BORDER_RADIUS = {
  sm: moderateScale(8),
  md: moderateScale(12),
  lg: moderateScale(16),
  xl: moderateScale(24),
  full: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: '#00D9A5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
};
