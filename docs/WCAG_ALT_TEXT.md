# WCAG 1.1.1 Alt Text Guidelines

This document provides guidelines for ensuring all images comply with WCAG 2.1 Level AA standards (1.1.1 Non-text Content).

## Quick Reference

### Content Images (Convey Meaning)
**Always include descriptive alt text**

```tsx
// ✅ CORRECT - Descriptive alt text
<img src="/user-avatar.jpg" alt="Sarah Johnson's profile picture" />
<ImageWithAlt src="/logo.png" alt="Company logo" />
<AvatarImage src="/user.jpg" alt="User profile image" />

// ❌ WRONG - No alt text or generic text
<img src="/user-avatar.jpg" alt="image" />
<img src="/user-avatar.jpg" /> {/* Missing alt */}
<img src="/user-avatar.jpg" alt="pic" />
```

### Decorative Images (No Semantic Meaning)
**Use empty alt text and aria-hidden**

```tsx
// ✅ CORRECT - Decorative with empty alt
<img src="/divider.svg" alt="" aria-hidden="true" />
<ImageWithAlt src="/decoration.png" alt="" decorative />

// ❌ WRONG - Missing aria-hidden
<img src="/divider.svg" alt="" />

// ❌ WRONG - Descriptive alt on decorative image
<img src="/divider.svg" alt="decorative divider" />
```

## When to Use Alt Text

### Content Images - Provide Alt Text
Images that convey important information:
- **User avatars/profiles**: `alt="[User name]'s profile picture"`
- **Product images**: `alt="[Product name] - [Key features]"`
- **Screenshots/diagrams**: `alt="[Description of what it shows]"`
- **Charts/graphs**: `alt="[Chart type]: [Key data points]"`
- **Icons representing actions**: `alt="[Action description]"` or use ARIA
- **Logos with text**: `alt="[Brand name]"`

### Decorative Images - Use Empty Alt
Images that are purely visual/decorative:
- Dividers, borders, decorative patterns
- Repeated textures
- Illustrations without semantic meaning
- Visual separators
- Spacing/layout elements

### Icons in UI
**Decorative icons** (use `aria-hidden="true"`):
```tsx
// Icons in buttons where text is already visible
<button>
  <Trash className="w-4 h-4" aria-hidden="true" />
  Delete
</button>

// Icons in badge/status indicators with text
<Badge>
  <CheckCircle className="w-3 h-3" aria-hidden="true" />
  Approved
</Badge>

// Empty state icons
<EmptyState
  icon={<Clock className="w-10 h-10" aria-hidden="true" />}
  title="No transactions yet"
/>
```

**Content icons** (use aria-label):
```tsx
// Icon-only buttons (no visible text)
<button aria-label="Menu">
  <Menu className="w-5 h-5" />
</button>

// Icon-only actions
<button aria-label="Delete item">
  <Trash className="w-4 h-4" />
</button>
```

## Component Usage Guide

### Using ImageWithAlt Component

**For content images:**
```tsx
import { ImageWithAlt } from '@/components/ui/image-with-alt'

export function ProductCard({ product }) {
  return (
    <ImageWithAlt
      src={product.image}
      alt={`${product.name} product image`}
      width={200}
      height={200}
    />
  )
}
```

**For decorative images:**
```tsx
import { ImageWithAlt } from '@/components/ui/image-with-alt'

export function PageHeader() {
  return (
    <ImageWithAlt
      src="/header-decoration.svg"
      alt=""
      decorative
      width="100%"
    />
  )
}
```

### Using AvatarImage Component

**For user avatars with meaning:**
```tsx
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

export function UserProfile({ user }) {
  return (
    <Avatar>
      <AvatarImage
        src={user.avatar}
        alt={`${user.name}'s profile picture`}
      />
      <AvatarFallback>{user.initials}</AvatarFallback>
    </Avatar>
  )
}
```

**For decorative avatars:**
```tsx
// When just showing initials, alt can be empty
<Avatar>
  <AvatarImage src="" alt="" />
  <AvatarFallback>{user.initials}</AvatarFallback>
</Avatar>
```

### Using ItemMedia with Images

**For content images in lists:**
```tsx
import { Item, ItemMedia, ItemContent, ItemTitle } from '@/components/ui/item'

export function ProductList({ products }) {
  return (
    <div role="list">
      {products.map(product => (
        <Item key={product.id}>
          <ItemMedia variant="image">
            <img
              src={product.image}
              alt={`${product.name} product thumbnail`}
            />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>{product.name}</ItemTitle>
          </ItemContent>
        </Item>
      ))}
    </div>
  )
}
```

## Alt Text Best Practices

### Do ✅
- **Be descriptive**: Include relevant context
  - Good: `alt="Red bicycle with 10-speed gears"`
  - Bad: `alt="bicycle"`

- **Be concise**: Keep it brief but meaningful
  - Good: `alt="John Smith's profile photo"`
  - Bad: `alt="This is a photo of a person named John Smith wearing a blue shirt taken last summer"`

- **Include important text**: If the image contains text, include it
  - Good: `alt="Sign saying 'Please Wait Here'"`
  - Bad: `alt="sign"`

- **Match context**: Alt text should fit the surrounding content
  - Good: `alt="Sarah's payment confirmation showing $50 transfer"`
  - Bad: `alt="screenshot"`

### Don't ❌
- **Don't start with "Image of"**: Screen readers already say "image"
  - Good: `alt="Sunset over mountains"`
  - Bad: `alt="Image of sunset over mountains"`

- **Don't use generic text**: Avoid "photo", "image", "pic"
  - Good: `alt="Customer support team"`
  - Bad: `alt="photo"`

- **Don't duplicate surrounding text**: If text already describes it
  - Good: In heading "Profile Photo" with `<img alt="Sarah's profile" />`
  - Bad: In heading "Profile Photo" with `<img alt="Profile Photo" />`

- **Don't use filename**: Filenames aren't user-friendly
  - Good: `alt="Company logo"`
  - Bad: `alt="logo_2024_v3.png"`

## Testing for Compliance

### Manual Testing
1. Open DevTools → Elements Inspector
2. Right-click on image → Inspect
3. Check for `alt` attribute
4. Verify alt text is:
   - Present for all content images
   - Empty string `alt=""` for decorative images
   - Descriptive and concise

### Using Screen Readers
- **Windows**: NVDA (free) or JAWS
- **macOS**: VoiceOver (built-in)
- **Linux**: NVDA or Orca

Test that:
- All content images have descriptive alt text read aloud
- Decorative images are skipped/ignored
- Alt text sounds natural in context

### Accessibility Audits
Tools that check alt text:
- axe DevTools
- Lighthouse (Chrome DevTools)
- WAVE Browser Extension
- Accessibility Insights (Microsoft)

## WCAG 1.1.1 Criterion

**WCAG 2.1 Level A - 1.1.1 Non-text Content**

> All non-text content that is presented to users has a text alternative that serves the equivalent purpose, except for the situations listed below.

### Images of Text
If the image contains text, the alt text must include that text:
```tsx
// Image showing error message "Invalid password"
alt="Error message: Invalid password. Please try again."
```

### Functional Images
If the image is a button or link, alt text should describe the action:
```tsx
// Submit button image
alt="Submit form"

// Home link image
alt="Go to home page"
```

### Complex Images
For detailed images (charts, diagrams), provide:
1. Brief alt text (1-2 sentences)
2. Extended description nearby or via link
```tsx
<img
  src="/sales-chart.png"
  alt="Sales by region - Q1 2024. See detailed breakdown below."
/>
<details>
  <summary>Detailed Chart Data</summary>
  <table>{/* Detailed data */}</table>
</details>
```

## Related Files
- Component: [image-with-alt.tsx](../components/ui/image-with-alt.tsx)
- Component: [avatar.tsx](../components/ui/avatar.tsx)
- Component: [item.tsx](../components/ui/item.tsx)
- Checklist: [IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md)

## Resources
- [WCAG 2.1 - Non-text Content](https://www.w3.org/WAI/WCAG21/Understanding/non-text-content)
- [WebAIM - Alt Text](https://webaim.org/articles/alttext/)
- [MDN - Alternative text](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#authoring_effective_alternative_descriptions)
