# Visual Responsive Design Reference

## Device Size Progression

```
┌──────────────────────────────────────────────────────────────┐
│ MOBILE (xs/sm)      TABLET (md)      DESKTOP (lg/xl)         │
│ 320-640px          640-1024px        1024px+                  │
└──────────────────────────────────────────────────────────────┘

iPhone SE        iPad Mini         MacBook Pro
├─ 375px         ├─ 768px          ├─ 1440px
├─ Portrait      ├─ Portrait       ├─ Full HD
├─ Touch         ├─ Landscape      ├─ Mouse/Trackpad
└─ Limited space └─ Mixed          └─ Lots of space

┌─ Font: 16px     ┌─ Font: 18px     ┌─ Font: 20px+
├─ Padding: 16px  ├─ Padding: 24px  ├─ Padding: 32px
├─ 1-2 col        ├─ 2-3 col        └─ 3-4 col
└─ Full width     └─ Constrained
```

## Responsive Spacing Pattern

```
Mobile (xs)          Tablet (sm)         Large (md+)
────────────────────────────────────────────────────

p-4              p-4                p-8
(16px)           (16px)             (32px)
                 sm:p-6             sm:p-8
                 (24px)             (32px)

  ┌──────────┐    ┌──────────────┐   ┌─────────────────┐
  │ Content  │    │  Content     │   │    Content      │
  └──────────┘    └──────────────┘   └─────────────────┘

Gap: 16px        Gap: 24px          Gap: 32px
gap-4            sm:gap-6           md:gap-8
```

## Typography Scaling

```
Heading 1
┌────────────────────────────────────────────────┐
│  Mobile: 24px (text-2xl)                       │
│  Tablet: 32px (text-3xl)                       │
│  Desktop: 48px (text-5xl)                      │
└────────────────────────────────────────────────┘
className="text-2xl sm:text-3xl md:text-5xl"

Body Text
┌────────────────────────────────────────────────┐
│  Mobile: 14px (text-sm)                        │
│  Tablet: 16px (text-base)                      │
│  Desktop: 18px (text-lg)                       │
└────────────────────────────────────────────────┘
className="text-sm sm:text-base md:text-lg"
```

## Grid Layout Evolution

```
MOBILE (1 column)
┌──────────────┐
│   Item 1     │
├──────────────┤
│   Item 2     │
├──────────────┤
│   Item 3     │
└──────────────┘

TABLET (2 columns)
┌──────────────┬──────────────┐
│   Item 1     │   Item 2     │
├──────────────┼──────────────┤
│   Item 3     │   Item 4     │
└──────────────┴──────────────┘

DESKTOP (3+ columns)
┌──────────┬──────────┬──────────┬──────────┐
│ Item 1   │ Item 2   │ Item 3   │ Item 4   │
├──────────┼──────────┼──────────┼──────────┤
│ Item 5   │ Item 6   │ Item 7   │ Item 8   │
└──────────┴──────────┴──────────┴──────────┘

className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
```

## Navigation Patterns

```
MOBILE - Hamburger Menu                DESKTOP - Horizontal Nav
┌─ Logo    [☰]                         ┌─ Logo   Home  About  Service  Contact  [Login]
├─ Home                                └─────────────────────────────────────────────
├─ About
├─ Service
├─ Contact
└─ Login
```

## Card Stacking Pattern

```
MOBILE (Vertical Stack)      TABLET (2-up)              DESKTOP (3-up)
┌──────────────────┐        ┌──────────┬──────────┐    ┌──────┬──────┬──────┐
│                  │        │          │          │    │      │      │      │
│     Card 1       │        │  Card 1  │  Card 2  │    │ Card │ Card │ Card │
│                  │        │          │          │    │  1   │  2   │  3   │
├──────────────────┤        ├──────────┼──────────┤    ├──────┼──────┼──────┤
│                  │        │          │          │    │      │      │      │
│     Card 2       │        │  Card 3  │  Card 4  │    │ Card │ Card │ Card │
│                  │        │          │          │    │  4   │  5   │  6   │
├──────────────────┤        └──────────┴──────────┘    └──────┴──────┴──────┘
│                  │
│     Card 3       │        Gap: 24px                   Gap: 32px
│                  │        className=                  className=
└──────────────────┘        "grid grid-cols-2           "grid grid-cols-3
                             gap-6 md:gap-8"            gap-6 md:gap-8"
Gap: 16px
className=
"grid grid-cols-1
 gap-4 sm:gap-6"
```

## Button Sizing

```
MOBILE                         DESKTOP
┌────────────────┐            ┌──────────┬──────────┐
│   Full Width   │            │  Button  │  Button  │
│      56px      │            │   48px   │   48px   │
│    px-4 py-3   │            │ px-6 py-3│ px-6 py-3│
└────────────────┘            └──────────┴──────────┘

className="w-full sm:w-auto
           px-4 sm:px-6
           py-3 sm:py-3.5
           text-sm sm:text-base"
```

## Form Layout

```
MOBILE (Stack)                DESKTOP (2-column)
┌──────────────────┐         ┌──────────┬──────────┐
│  First Name      │         │ First    │ Last     │
│  [____________]  │         │ [_____]  │ [_____]  │
└────────────────  ┘         ├──────────┼──────────┤
┌──────────────────┐         │          |          │
│  Last Name       │         │ Email    │ Phone    │
│  [____________]  │         │ [_____]  │ [_____]  │
└────────────────  ┘         └──────────┴──────────┘

className=                   className=
"grid grid-cols-1            "grid grid-cols-1
 gap-4 sm:gap-6"             md:grid-cols-2
                              gap-4 md:gap-6"
```

## Image Responsiveness

```
MOBILE              TABLET              DESKTOP
┌────────┐         ┌──────────────┐    ┌──────────────────┐
│        │         │              │    │                  │
│ Image  │         │    Image     │    │      Image       │
│        │         │              │    │                  │
│  100%  │         │     100%     │    │     max-w-4xl    │
│  auto  │         │     auto     │    │   mx-auto 100%   │
│        │         │              │    │                  │
└────────┘         └──────────────┘    └──────────────────┘

className="w-full h-auto
           max-w-2xl sm:max-w-4xl
           mx-auto"
```

## Responsive Font Sizing

```
              xs          sm          md          lg          xl
Heading 1   24px        28px        32px        40px        48px
            text-2xl    text-3xl    text-4xl    text-5xl    text-6xl

Heading 2   20px        24px        28px        32px        36px
            text-xl     text-2xl    text-3xl    text-4xl    text-4xl

Heading 3   18px        20px        24px        28px        32px
            text-lg     text-xl     text-2xl    text-3xl    text-4xl

Body Text   14px        16px        16px        18px        18px
            text-sm     text-base   text-base   text-lg     text-lg

Small Text  12px        14px        14px        16px        16px
            text-xs     text-sm     text-sm     text-base   text-base
```

## Icon Sizing

```
MOBILE (size={16})     TABLET (size={20})      DESKTOP (size={24})
   │  │                    ├──┤                     ├────┤
   │  │                    │  │                     │    │
   │  │                    │  │                     │    │
   │  │                    │  │                     │    │
   │  │                    │  │                     │    │
   │  │                    │  │                     │    │
   │  │                    ├──┤                     ├────┤

className="w-4 h-4              className="w-5 h-5              className="w-6 h-6
            sm:w-5 sm:h-5                sm:w-6 sm:h-6"          md:w-7 md:h-7"
            md:w-6 md:h-6"
```

## Breakpoint Decision Tree

```
                        What's the width?
                               │
                ┌──────────────┼──────────────┐
                │              │              │
            < 640px       640-1024px    > 1024px
            (Mobile)      (Tablet)      (Desktop)
                │              │              │
        • Stack                │      • Multi-column
        • Full width    • 2-column  • Sidebar layout
        • Large text    • Scaled    • Detailed view
        • Touch targets • Medium    • Lots of text
                           text
```

## Performance Considerations

```
Responsive Design is performant because:

✅ Single HTML/CSS (no separate mobile site)
✅ CSS Media Queries (no JavaScript overhead)
✅ Reusable components (less duplication)
✅ Progressive enhancement (works without JS)
✅ Mobile-first CSS (loads smaller first)

Avoid:
❌ Multiple JavaScript frameworks for responsive
❌ Separate CSS files per device
❌ Heavy image files without optimization
```

## Common Breakpoint Patterns

```
SIMPLE (2 breakpoints)
├─ Mobile: < 768px
└─ Desktop: >= 768px

STANDARD (3 breakpoints)
├─ Mobile: < 640px
├─ Tablet: 640px - 1024px
└─ Desktop: >= 1024px

ADVANCED (4+ breakpoints)
├─ Mobile: xs (0px)
├─ Tablet: sm (640px) & md (768px)
├─ Desktop: lg (1024px)
└─ Large: xl (1280px) & 2xl (1536px)

Your app uses ADVANCED pattern
for maximum flexibility
```

---

**Remember:** Mobile First, Always Scale Up! 📱 ➡️ 💻
