# Responsive Design Implementation Guide

## Overview
This guide documents the responsive design patterns implemented across your application to ensure optimal display on all screen sizes: mobile phones, tablets in portrait/landscape, and desktop screens.

## Screen Size Breakpoints

Tailwind CSS breakpoints used throughout the application:

| Breakpoint | Size | Device Type |
|-----------|------|------------|
| xs | 0px | Extra small phones |
| sm | 640px | Small phones & large tablets |
| md | 768px | Tablets in portrait |
| lg | 1024px | Tablets in landscape & small desktops |
| xl | 1280px | Desktops |
| 2xl | 1536px | Large desktops |

## Custom Responsive Hooks

### useResponsive()
Detects current screen size and provides responsive utilities.

```javascript
import { useResponsive } from '@hooks/useResponsive';

function MyComponent() {
  const { 
    isMobile,        // true if width < 640px
    isTablet,        // true if 640px <= width < 1024px
    isSmallDesktop,  // true if 1024px <= width < 1280px
    isDesktop,       // true if width >= 1024px
    isLargeDesktop,  // true if width >= 1280px
    width,           // current window width
    height,          // current window height
    isPortrait,      // true if height > width
    isLandscape      // true if width > height
  } = useResponsive();

  return (
    <div>
      {isMobile && <p>Showing mobile view</p>}
      {isTablet && <p>Showing tablet view</p>}
    </div>
  );
}
```

### useTouchscreen()
Detects if device is touch-capable (mobile/tablet).

```javascript
const isTouchscreen = useTouchscreen();
```

### useOrientation()
Detects device orientation (portrait/landscape).

```javascript
const orientation = useOrientation(); // 'portrait' or 'landscape'
```

## Responsive Design Patterns

### 1. Padding & Margins
Use scale appropriately for different screen sizes:

```jsx
// Mobile first approach
<div className="px-4 sm:px-6 md:px-8 lg:px-10">
  {/* 16px on mobile, 24px on sm, 32px on md, 40px on lg */}
</div>
```

### 2. Font Sizes
Scale typography for readability:

```jsx
<h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl">
  Responsive Heading
</h1>

<p className="text-base sm:text-lg md:text-xl">
  Responsive paragraph
</p>
```

### 3. Grid Layouts
Use responsive grid columns:

```jsx
{/* Single column on mobile, 2 on tablets, 3 on desktop */}
<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
  {items.map(item => <Item key={item.id} />)}
</div>
```

### 4. Icon Sizes
Scale icons based on screen size:

```jsx
<Icon size={isMobile ? 16 : 20} className="text-gray-600" />
{/* or use Tailwind */}
<Icon size={20} className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
```

### 5. Container Widths
Control max widths for readability:

```jsx
<div className="max-w-xs sm:max-w-sm md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto">
  {content}
</div>
```

### 6. Spacing (Gap)
Responsive gap in flex/grid:

```jsx
<div className="flex flex-col gap-2 sm:gap-3 md:gap-4">
  {items}
</div>
```

## Common Responsive Patterns

### Mobile-first Approach
Always start with mobile styles, then add breakpoints:

```jsx
{/* Wrong - Don't do this */}
<div className="text-6xl md:text-3xl">
  {/* Large on mobile, small on desktop */}
</div>

{/* Correct */}
<div className="text-3xl md:text-6xl">
  {/* Small on mobile, large on desktop */}
</div>
```

### Conditional Rendering
Use responsive hooks for conditional rendering:

```jsx
function MyComponent() {
  const { isMobile, isTablet } = useResponsive();

  if (isMobile) {
    return <MobileLayout />;
  }

  if (isTablet) {
    return <TabletLayout />;
  }

  return <DesktopLayout />;
}
```

### Safe Area Insets
For devices with notches (iPhone X, etc):

```jsx
<div className="pt-safe-top pb-safe-bottom pl-safe-left pr-safe-right">
  {/* Content respects device notches */}
</div>
```

## Implementation Guidelines

### For New Pages
1. Start with mobile layout (320px width)
2. Use `sm:`, `md:`, `lg:` prefixes to scale up
3. Test at: 375px (mobile), 640px (tablet), 768px (tablet landscape), 1024px (desktop), 1280px (large desktop)
4. Always use responsive spacing: `px-4 sm:px-6 md:px-8`

### For Existing Components
1. Add responsive classes to existing elements
2. Check icon sizes match screen context
3. Ensure text remains readable at all sizes
4. Add responsive gap/padding to containers

### Testing Checklist
- [ ] Mobile portrait (375px)
- [ ] Mobile landscape (667px)
- [ ] Tablet portrait (768px)
- [ ] Tablet landscape (1024px)
- [ ] Desktop (1280px+)
- [ ] Touch interactions work on mobile
- [ ] No horizontal scrolling on mobile
- [ ] Text is readable at all sizes
- [ ] Images scale proportionally
- [ ] Forms are usable on small screens

## Common Issues & Solutions

### Text Too Large on Tablet
**Problem**: Desktop font sizes look huge on tablets
**Solution**: Use responsive font sizes between breakpoints
```jsx
<h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl">
  Title
</h1>
```

### Elements Overflow on Mobile
**Problem**: Fixed widths cause overflow
**Solution**: Use `w-full` and responsive `max-w-`
```jsx
<div className="w-full max-w-xs sm:max-w-sm md:max-w-md">
  {content}
</div>
```

### Spacing Too Large on Mobile
**Problem**: `p-8` padding is too wide on small screens
**Solution**: Scale padding responsively
```jsx
<div className="p-4 sm:p-6 md:p-8">
  {content}
</div>
```

### Images Not Responsive
**Problem**: Images maintain fixed size
**Solution**: Always use responsive image tags
```jsx
<img src="image.png" className="w-full h-auto" alt="Responsive" />
```

## Resources

- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [useResponsive Hook](./src/hooks/useResponsive.js)
- [Tailwind Config](./tailwind.config.js)

## Updated Files

The following pages have been updated with full responsive design:
- LandingPage.jsx - All sections fully responsive
- More pages to be updated following these patterns

---

**Last Updated**: February 26, 2026
**Version**: 1.0
