import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Guideline sizes based on standard ~5" mobile device
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

export const scale = (size) => (SCREEN_WIDTH / guidelineBaseWidth) * size;
export const verticalScale = (size) => (SCREEN_HEIGHT / guidelineBaseHeight) * size;
export const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;
export const moderateVerticalScale = (size, factor = 0.5) => size + (verticalScale(size) - size) * factor;

export const RFValue = (fontSize, standardScreenHeight = 812) => {
    if (Platform.OS === 'web') {
        // Web: clamp font between min and max px
        const base = (fontSize / standardScreenHeight) * 100;
        return Math.min(Math.max(fontSize * 0.85, 10), fontSize * 1.2);
    }
    const heightPercent = (fontSize * SCREEN_HEIGHT) / standardScreenHeight;
    return Math.round(heightPercent);
};

// Breakpoints
export const BREAKPOINTS = {
    mobile: 480,
    tablet: 768,
    desktop: 1024,
    wide: 1280,
};

export const isWeb = Platform.OS === 'web';
export const isMobile = SCREEN_WIDTH < BREAKPOINTS.mobile;
export const isTablet = SCREEN_WIDTH >= BREAKPOINTS.tablet && SCREEN_WIDTH < BREAKPOINTS.desktop;
export const isDesktop = SCREEN_WIDTH >= BREAKPOINTS.desktop;
export const isWide = SCREEN_WIDTH >= BREAKPOINTS.wide;

// Max content width for web layouts
export const WEB_MAX_WIDTH = 1100;
export const WEB_FORM_MAX_WIDTH = 480;
export const WEB_CARD_MAX_WIDTH = 800;

// Number of columns based on screen width
export const getColumns = (mobile = 1, tablet = 2, desktop = 3) => {
    if (SCREEN_WIDTH >= BREAKPOINTS.desktop) return desktop;
    if (SCREEN_WIDTH >= BREAKPOINTS.tablet) return tablet;
    return mobile;
};

// Responsive padding/margin based on screen size
export const getSpacing = (mobile, tablet, desktop) => {
    if (SCREEN_WIDTH >= BREAKPOINTS.desktop) return desktop;
    if (SCREEN_WIDTH >= BREAKPOINTS.tablet) return tablet;
    return mobile;
};

export const screenWidth = SCREEN_WIDTH;
export const screenHeight = SCREEN_HEIGHT;
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

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
    isDesktop,
    isWeb,
    WEB_MAX_WIDTH,
    WEB_FORM_MAX_WIDTH,
    getColumns,
    getSpacing,
};
