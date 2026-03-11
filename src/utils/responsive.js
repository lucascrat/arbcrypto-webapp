import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Guideline sizes are based on standard ~5" screen mobile device
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

/**
 * Scale relative to screen width
 */
export const scale = (size) => (SCREEN_WIDTH / guidelineBaseWidth) * size;

/**
 * Scale relative to screen height
 */
export const verticalScale = (size) => (SCREEN_HEIGHT / guidelineBaseHeight) * size;

/**
 * Scaling for padding, margin, etc. where you want to maintain proportions
 */
export const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

/**
 * Scaling for font sizes with consideration for screen width and pixel density
 */
export const moderateVerticalScale = (size, factor = 0.5) => size + (verticalScale(size) - size) * factor;

/**
 * Global responsive font sizing
 */
export const RFValue = (fontSize, standardScreenHeight = 812) => {
    const heightPercent = (fontSize * SCREEN_HEIGHT) / standardScreenHeight;
    return Math.round(heightPercent);
};

export const screenWidth = SCREEN_WIDTH;
export const screenHeight = SCREEN_HEIGHT;
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isTablet = SCREEN_WIDTH > 600;

export default {
    scale,
    verticalScale,
    moderateScale,
    moderateVerticalScale,
    RFValue,
    screenWidth,
    screenHeight,
    isIOS,
    isAndroid,
    isTablet,
};
