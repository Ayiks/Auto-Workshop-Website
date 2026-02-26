// src/utils/responsiveHelpers.js

/**
 * Generate responsive padding classes
 * @param {Object} sizes - { mobile, sm, md, lg, xl }
 * @example getPadding({ mobile: 4, sm: 6, md: 8 }) => "p-4 sm:p-6 md:p-8"
 */
export const getPadding = (sizes) => {
  const classes = [];
  if (sizes.mobile !== undefined) classes.push(`p-${sizes.mobile}`);
  if (sizes.sm !== undefined) classes.push(`sm:p-${sizes.sm}`);
  if (sizes.md !== undefined) classes.push(`md:p-${sizes.md}`);
  if (sizes.lg !== undefined) classes.push(`lg:p-${sizes.lg}`);
  if (sizes.xl !== undefined) classes.push(`xl:p-${sizes.xl}`);
  return classes.join(' ');
};

/**
 * Generate responsive margin classes
 */
export const getMargin = (sizes) => {
  const classes = [];
  if (sizes.mobile !== undefined) classes.push(`m-${sizes.mobile}`);
  if (sizes.sm !== undefined) classes.push(`sm:m-${sizes.sm}`);
  if (sizes.md !== undefined) classes.push(`md:m-${sizes.md}`);
  if (sizes.lg !== undefined) classes.push(`lg:m-${sizes.lg}`);
  if (sizes.xl !== undefined) classes.push(`xl:m-${sizes.xl}`);
  return classes.join(' ');
};

/**
 * Generate responsive font size classes
 */
export const getFontSize = (sizes) => {
  const classes = [];
  if (sizes.mobile !== undefined) classes.push(`text-${sizes.mobile}`);
  if (sizes.sm !== undefined) classes.push(`sm:text-${sizes.sm}`);
  if (sizes.md !== undefined) classes.push(`md:text-${sizes.md}`);
  if (sizes.lg !== undefined) classes.push(`lg:text-${sizes.lg}`);
  if (sizes.xl !== undefined) classes.push(`xl:text-${sizes.xl}`);
  return classes.join(' ');
};

/**
 * Generate responsive grid columns
 */
export const getGridCols = (cols) => {
  const classes = [];
  if (cols.mobile !== undefined) classes.push(`grid-cols-${cols.mobile}`);
  if (cols.sm !== undefined) classes.push(`sm:grid-cols-${cols.sm}`);
  if (cols.md !== undefined) classes.push(`md:grid-cols-${cols.md}`);
  if (cols.lg !== undefined) classes.push(`lg:grid-cols-${cols.lg}`);
  if (cols.xl !== undefined) classes.push(`xl:grid-cols-${cols.xl}`);
  return classes.join(' ');
};

/**
 * Generate responsive gap classes
 */
export const getGap = (sizes) => {
  const classes = [];
  if (sizes.mobile !== undefined) classes.push(`gap-${sizes.mobile}`);
  if (sizes.sm !== undefined) classes.push(`sm:gap-${sizes.sm}`);
  if (sizes.md !== undefined) classes.push(`md:gap-${sizes.md}`);
  if (sizes.lg !== undefined) classes.push(`lg:gap-${sizes.lg}`);
  if (sizes.xl !== undefined) classes.push(`xl:gap-${sizes.xl}`);
  return classes.join(' ');
};

/**
 * Responsive breakpoint checker
 * @param {number} width - Current window width
 * @param {string} breakpoint - Breakpoint to check
 */
export const isBreakpoint = (width, breakpoint) => {
  const breakpoints = {
    xs: 0,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  };
  return width >= breakpoints[breakpoint];
};

/**
 * Get current breakpoint name
 */
export const getCurrentBreakpoint = (width) => {
  if (width >= 1536) return '2xl';
  if (width >= 1280) return 'xl';
  if (width >= 1024) return 'lg';
  if (width >= 768) return 'md';
  if (width >= 640) return 'sm';
  return 'xs';
};

/**
 * Common responsive spacing presets
 */
export const RESPONSIVE_SPACING = {
  container: 'px-4 sm:px-6 md:px-8 lg:px-10',
  section: 'py-16 sm:py-20 md:py-24',
  heading: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold',
  subheading: 'text-lg sm:text-xl md:text-2xl',
  body: 'text-base sm:text-lg md:text-base',
  gap: 'gap-4 sm:gap-6 md:gap-8',
  gapSmall: 'gap-2 sm:gap-3 md:gap-4',
  gapLarge: 'gap-6 sm:gap-8 md:gap-10',
};

/**
 * Responsive card padding preset
 */
export const getCardPadding = () => RESPONSIVE_SPACING.container;

/**
 * Create responsive flex direction
 */
export const getFlexDirection = (mobile = 'col', sm = 'row') => {
  return `flex-${mobile} ${sm === 'row' ? 'sm:flex-row' : ''}`;
};

/**
 * Create responsive grid template (most common pattern)
 */
export const getResponsiveGrid = { 
  // Single column on mobile, 2 on sm, 3 on md, 4 on lg
  standard: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8',
  
  // Single on mobile, 2 on sm and up
  twoCol: 'grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8',
  
  // Single on mobile/sm, 2 on md, 3 on lg
  threeCol: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8',
  
  // Single on mobile, 2 on md and up
  asymmetric: 'grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8',
};

export default {
  getPadding,
  getMargin,
  getFontSize,
  getGridCols,
  getGap,
  isBreakpoint,
  getCurrentBreakpoint,
  RESPONSIVE_SPACING,
  getCardPadding,
  getFlexDirection,
  getResponsiveGrid,
};
