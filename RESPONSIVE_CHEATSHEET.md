# Responsive Design Cheat Sheet

Quick reference for implementing responsive design in your Graymanager app.

## Quick Start

```jsx
import { useResponsive } from '@hooks/useResponsive';

function MyComponent() {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  return (
    <div className="px-4 sm:px-6 md:px-8">
      <h1 className="text-2xl sm:text-3xl md:text-4xl">
        Title
      </h1>
    </div>
  );
}
```

## Tailwind Breakpoint Reference

```
xs: 0px (phones)
sm: 640px (large phones & tablets)
md: 768px (tablets)
lg: 1024px (tablet landscape & desktops)
xl: 1280px (desktops)
2xl: 1536px (large desktops)
```

## Most Used Patterns

### Container Padding
```jsx
<div className="px-4 sm:px-6 md:px-8 lg:px-10">
  Content
</div>
```

### Section Padding
```jsx
<section className="py-16 sm:py-20 md:py-24">
  Content
</section>
```

### Responsive Heading
```jsx
<h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl">
  Heading
</h1>
```

### Two Column Layout
```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
  <div>Column 1</div>
  <div>Column 2</div>
</div>
```

### Three Column Layout
```jsx
<div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
  <div>Col 1</div>
  <div>Col 2</div>
  <div>Col 3</div>
</div>
```

### Responsive Spacing
```jsx
<div className="gap-4 sm:gap-6 md:gap-8">
  {/* gap scales: 16px → 24px → 32px */}
</div>
```

## Font Sizes

Responsive text sizing (mobile-first):

```jsx
// Small text
<p className="text-xs sm:text-sm md:text-base">Small</p>

// Body text
<p className="text-sm sm:text-base md:text-lg">Body</p>

// Headings
<h3 className="text-lg sm:text-xl md:text-2xl">Heading 3</h3>
<h2 className="text-xl sm:text-2xl md:text-3xl">Heading 2</h2>
<h1 className="text-2xl sm:text-3xl md:text-5xl">Heading 1</h1>
```

## Spacing Presets (Ready to Use)

```jsx
import { RESPONSIVE_SPACING } from '@utils/responsiveHelpers';

// Use directly
<div className={RESPONSIVE_SPACING.container}>
  {/* px-4 sm:px-6 md:px-8 lg:px-10 */}
</div>

<section className={RESPONSIVE_SPACING.section}>
  {/* py-16 sm:py-20 md:py-24 */}
</section>

<h1 className={RESPONSIVE_SPACING.heading}>Title</h1>
{/* text-2xl sm:text-3xl md:text-4xl lg:text-5xl */}
```

## Icon Sizing

```jsx
import { useResponsive } from '@hooks/useResponsive';

function MyIcon() {
  const { isMobile } = useResponsive();
  
  return <Icon size={isMobile ? 20 : 24} />;
}
```

## Grid Presets

```jsx
import { getResponsiveGrid } from '@utils/responsiveHelpers';

{/* Standard: 1 col mobile → 2 sm → 3 md → 4 lg */}
<div className={getResponsiveGrid.standard}>

{/* Two column: 1 col mobile → 2 sm+ */}
<div className={getResponsiveGrid.twoCol}>

{/* Three column: 1 col mobile/sm → 2 md → 3 lg */}
<div className={getResponsiveGrid.threeCol}>

{/* Asymmetric: 1 col mobile → 2 md+ */}
<div className={getResponsiveGrid.asymmetric}>
```

## Hiding Elements Responsively

```jsx
{/* Hidden on mobile, show on md+ */}
<div className="hidden md:block">Desktop only</div>

{/* Show on mobile, hidden on md+ */}
<div className="md:hidden">Mobile only</div>

{/* Show on sm, hidden elsewhere */}
<div className="hidden sm:block md:hidden">Small devices only</div>
```

## Responsive Images

```jsx
{/* Always responsive */}
<img src="image.png" className="w-full h-auto" alt="Responsive" />

{/* With max-width */}
<img src="image.png" className="w-full h-auto max-w-2xl mx-auto" alt="Responsive" />

{/* With aspect ratio */}
<div className="aspect-video w-full">
  <img src="image.png" className="w-full h-full object-cover" alt="Responsive" />
</div>
```

## Responsive Buttons

```jsx
{/* Button that shrinks on mobile */}
<button className="px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base">
  Click me
</button>

{/* Button with responsive width */}
<button className="w-full sm:w-auto px-4 sm:px-6">
  Full width on mobile
</button>
```

## Responsive Forms

```jsx
{/* Single column on mobile, 2 on md+ */}
<form className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
  <div>
    <label className="block text-sm sm:text-base font-medium mb-1 sm:mb-2">
      Field 1
    </label>
    <input className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base" />
  </div>
  <div>
    <label className="block text-sm sm:text-base font-medium mb-1 sm:mb-2">
      Field 2
    </label>
    <input className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base" />
  </div>
</form>
```

## Conditional Rendering Based on Screen Size

```jsx
import { useResponsive } from '@hooks/useResponsive';

function MyComponent() {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  if (isMobile) {
    return <MobileComponent />;
  }

  if (isTablet) {
    return <TabletComponent />;
  }

  return <DesktopComponent />;
}
```

## Testing URLs

Test your pages at different sizes:

- **Mobile**: http://localhost:5173/page (use DevTools, toggle device toolbar)
- **iPhone**: 375px width
- **iPad**: 768px width, portrait / 1024px, landscape
- **Desktop**: 1280px+ width

## Tips & Tricks

1. **Mobile First**: Always write mobile styles first, then add `sm:`, `md:`, etc.
   ```jsx
   // ✅ RIGHT: starts small, scales up
   <h1 className="text-2xl md:text-4xl">
   
   // ❌ WRONG: starts large, shrinks down
   <h1 className="text-4xl md:text-2xl">
   ```

2. **Be Consistent**: Use same spacing pattern across all pages
   ```jsx
   // Good - reusable
   className={RESPONSIVE_SPACING.container}
   
   // Avoid - each time different
   className="px-4 sm:px-6"
   ```

3. **Test Orientation**: Check portrait AND landscape on tablets
   ```jsx
   const { isPortrait, isLandscape } = useResponsive();
   ```

4. **Touch Targets**: Make buttons 44px+ on mobile for easy tapping
   ```jsx
   <button className="px-4 py-3"> {/* 48px height on small text */}
   ```

5. **Avoid Horizontal Scroll**: Always use 100% width on mobile
   ```jsx
   <div className="w-full max-w-5xl mx-auto">
   ```

## References

- Custom hooks: `src/hooks/useResponsive.js`
- Helper utilities: `src/utils/responsiveHelpers.js`
- Tailwind config: `tailwind.config.js`
- Template page: `src/components/layouts/ResponsivePageTemplate.jsx`
- Full guide: `RESPONSIVE_DESIGN_GUIDE.md`
