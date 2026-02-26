# Testing Your Responsive Design

## Quick Testing Guide

### Browser DevTools Testing (5 minutes)

#### Step 1: Enable Device Toolbar
1. Open your app in Chrome/Firefox
2. Press `F12` to open DevTools
3. Press `Ctrl+Shift+M` (or Cmd+Shift+M on Mac) to enable device toolbar
4. You'll see a device selector in the top-left

#### Step 2: Test Key Screen Sizes
```
375px (iPhone SE)          → Mobile portrait
640px (iPad)               → Tablet/Large phone
768px (iPad)               → Tablet portrait
1024px (iPad Pro)          → Tablet landscape
1280px (Laptop)            → Desktop
1536px (Desktop)           → Large desktop
```

#### Step 3: Check Each Breakpoint
For each size, verify:
- [ ] Text is readable
- [ ] No horizontal scrolling
- [ ] All buttons/links are visible
- [ ] Images scale properly
- [ ] Spacing looks balanced
- [ ] No overlapping elements

### Orientation Testing (3 minutes)

#### Mobile Portrait → Landscape
1. With device toolbar enabled, click the rotation button
2. Check layout responds correctly
3. Verify no content is hidden

#### Tablet Portrait → Landscape
1. Select iPad in device selector
2. Toggle between portrait/landscape
3. Verify grid layouts adjust
4. Check sidebar visibility

### Touch Testing (Mobile VT)

1. Open DevTools (F12)
2. Go to Settings > Experiments (three dots)
3. Enable "Emulate a focused page"
4. Verify touch targets are at least 44px²

## Manual Testing Checklist

### Mobile Testing
```
Size: 375px (iPhone SE)
─────────────────────────□
□ Header hamburger menu visible
□ Navigation menu opens/closes
□ Hero section text readable
□ Buttons are full-width or properly sized
□ Forms stack vertically
□ Tables convert to card view
□ No horizontal scrolling
□ Images scale properly
□ Footer is readable
□ Icons are appropriately sized
```

### Tablet Portrait Testing
```
Size: 768px (iPad)
──────────────────────────────□
□ Hamburger menu OR horizontal nav
□ Two-column layout visible
□ Cards in 2-column grid
□ Proper spacing between elements
□ Forms have proper padding
□ Tables start to show
□ All text is readable
□ Images fit properly
```

### Tablet Landscape Testing
```
Size: 1024px (iPad Landscape)
─────────────────────────────□
□ Three-column layout visible
□ Table view displays properly
□ Sidebar appears if designed
□ Spacing is balanced
□ No wasted whitespace
□ All features accessible
```

### Desktop Testing
```
Size: 1280px+ (Laptop)
─────────────────────────────□
□ Full layout visible
□ Multi-column layouts display
□ Proper max-width constraints
□ All features accessible
□ Professional appearance
□ Content not stretched too wide
□ Sidebar layout (if any)
```

## Browser Compatibility Testing

### Test in Multiple Browsers
```
Chrome/Edge
├─ Latest version
├─ Mobile simulator
└─ Desktop view

Firefox
├─ Latest version
├─ Mobile simulator
└─ Desktop view

Safari
├─ Mac Safari
├─ iPad Safari
└─ iPhone Safari
```

### Known Issues to Watch

1. **Notch Support (iPhone X+)**
   - Check page respects safe area
   - Use `pt-safe-top` for top padding

2. **Safe Area Support**
   - Bottom buttons respect keyboard
   - Test with on-screen keyboard

3. **Orientation Lock**
   - Some devices lock orientation
   - Test rotation behavior

## Real Device Testing

### Testing on iPhone
```
Steps:
1. Connect iPhone to same WiFi
2. Open developer's IP on phone
   (Example: 192.168.1.x:5173)
3. Open in Safari
4. Test all interactions
5. Test in portrait & landscape
6. Test with keyboard open
```

### Testing on iPad
```
Steps:
1. Connect iPad to same WiFi
2. Open developer's IP on iPad
3. Open in Safari
4. Test portrait & landscape
5. Test with split-screen
6. Test with keyboard
```

### Testing on Android
```
Steps:
1. Connect Android to same WiFi
2. Open developer's IP on phone
3. Open in Chrome mobile
4. Test all interactions
5. Test portrait & landscape
6. Test with keyboard
```

## Automated Testing (Unit Tests)

```javascript
// Test the useResponsive hook
import { renderHook } from '@testing-library/react';
import { useResponsive } from '@hooks/useResponsive';

describe('useResponsive', () => {
  test('detects mobile screen size', () => {
    // Mock window.innerWidth
    global.innerWidth = 375;
    global.dispatchEvent(new Event('resize'));
    
    const { result } = renderHook(() => useResponsive());
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isDesktop).toBe(false);
  });

  test('detects desktop screen size', () => {
    global.innerWidth = 1280;
    global.dispatchEvent(new Event('resize'));
    
    const { result } = renderHook(() => useResponsive());
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isDesktop).toBe(true);
  });

  test('updates on resize', () => {
    const { result, rerender } = renderHook(() => useResponsive());
    
    global.innerWidth = 375;
    global.dispatchEvent(new Event('resize'));
    rerender();
    expect(result.current.isMobile).toBe(true);
  });
});
```

## Visual Regression Testing

### Screenshot Testing
1. Take screenshots at each breakpoint
2. Compare before/after changes
3. Watch for layout shifts
4. Verify consistency

### Tools to Use
- Playwright (can automate screenshots)
- Percy (visual regression)
- Chromatic (Storybook component testing)

## Performance Testing

### Mobile Performance
```
1. Open DevTools
2. Go to Performance tab
3. Record page load
4. Check:
   □ First Contentful Paint (FCP)
   □ Largest Contentful Paint (LCP)
   □ Cumulative Layout Shift (CLS)
   □ Total Blocking Time (TBT)
```

### Lighthouse Testing
```
1. Open DevTools
2. Go to Lighthouse tab
3. Run mobile audit
4. Check:
   □ Performance score > 80
   □ Accessibility score > 90
   □ Best Practices score > 90
```

## Accessibility Testing

### WCAG 2.1 Compliance
- [ ] Text contrast ≥ 4.5:1 for normal text
- [ ] Touch targets ≥ 44px × 44px
- [ ] Font size ≥ 16px for body text
- [ ] Color not only differentiator
- [ ] Focus indicators visible

### Screen Reader Testing
1. Install NVDA or JAWS
2. Navigate page with keyboard only
3. Verify:
   - [ ] All interactive elements reachable
   - [ ] Form labels properly associated
   - [ ] Images have alt text
   - [ ] Links make sense out of context

## Stress Testing

### Test with Lots of Content
- Add 100+ items to grid
- Verify scrolling performance
- Check memory usage
- Monitor CPU usage

### Test with Slow Network
1. DevTools → Network tab
2. Select "Slow 3G"
3. Verify page usable
4. Check load time

### Test with Low Power
1. Enable low power mode on device
2. Check animations are smooth
3. Verify no excessive repaints
4. Check battery drain

## Sign-off Checklist

Before marking page as responsive-ready:

### Visual
- [ ] Looks good at 375px
- [ ] Looks good at 640px
- [ ] Looks good at 768px
- [ ] Looks good at 1024px
- [ ] Looks good at 1280px
- [ ] Looks good at 1536px
- [ ] Consistent spacing throughout
- [ ] Icons appropriately sized
- [ ] Text always readable

### Functional
- [ ] All buttons work
- [ ] All links work
- [ ] Forms submit
- [ ] Navigation functional
- [ ] Menus open/close
- [ ] Modal/dialogs work
- [ ] Images load properly
- [ ] Videos play (if any)

### Performance
- [ ] Page loads fast
- [ ] No layout shifts
- [ ] Smooth scrolling
- [ ] Animations smooth
- [ ] No console errors
- [ ] No memory leaks

### Accessibility
- [ ] Tab navigation works
- [ ] Focus visible
- [ ] Form labels clear
- [ ] Color contrast OK
- [ ] Text readable
- [ ] Touch targets adequate

### Cross-browser
- [ ] Chrome ✓
- [ ] Firefox ✓
- [ ] Safari ✓
- [ ] Edge ✓

### Real Devices
- [ ] iPhone ✓
- [ ] Android ✓
- [ ] iPad ✓

## Common Problems & Solutions

### Problem: Text Too Large on Tablet
**Solution**: Use responsive font sizes
```jsx
// Before
<h1 className="text-4xl">

// After
<h1 className="text-2xl sm:text-3xl md:text-4xl">
```

### Problem: Elements Overflow on Mobile
**Solution**: Use full width with max-width
```jsx
// Before
<div className="w-96">

// After
<div className="w-full max-w-96">
```

### Problem: Weird Spacing on Mobile
**Solution**: Scale padding responsively
```jsx
// Before
<div className="p-8">

// After
<div className="p-4 sm:p-6 md:p-8">
```

### Problem: Buttons Hard to Click on Mobile
**Solution**: Ensure 44px minimum height
```jsx
// Before
<button className="py-2">

// After
<button className="py-3">  {/* 12px + 3 padding = 48px height */}
```

### Problem: Form Fields Stack Weirdly
**Solution**: Use responsive grid
```jsx
// Before
<div className="grid md:grid-cols-2">

// After
<div className="grid grid-cols-1 md:grid-cols-2">
```

## Testing Report Template

```markdown
# Responsive Design Testing Report

## Page: [Page Name]
## Date: [Date]
## Tester: [Name]

### Device Testing
- [ ] Mobile (375px) - Status: ___
- [ ] Small Tablet (640px) - Status: ___
- [ ] Tablet (768px) - Status: ___
- [ ] Tablet Landscape (1024px) - Status: ___
- [ ] Desktop (1280px) - Status: ___

### Issues Found
| Issue | Severity | Status |
|-------|----------|--------|
| | | |

### Comments
[Your notes here]

### Sign-off
- Developer: _____ Date: _____
- Reviewer: _____ Date: _____
```

## Quick Test URLs

Use these URLs to quickly test your app:

```
Local Development:
http://localhost:5173/

On Different Devices:
http://[YOUR_IP]:5173/

To find your IP:
Windows: ipconfig
Mac/Linux: ifconfig
```

---

**Remember:** Test early, test often, test on real devices! 📱
Your users deserve a responsive experience.
