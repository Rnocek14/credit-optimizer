# OKLCH Color System Documentation

This project uses **OKLCH** (Oklch Lightness Chroma Hue) as the primary color format. This guide explains the conventions to prevent color rendering issues.

---

## ⚠️ Critical Rule: Never Wrap CSS Variables

**All CSS variables contain COMPLETE `oklch()` values.** Never wrap them in `hsl()` or `oklch()`.

```css
/* Variables already contain the full color value */
--primary: oklch(0.55 0.22 280);
--background: oklch(0.99 0.00 0);
--border: oklch(0.80 0.01 250);
```

### ❌ WRONG - Double-wrapping breaks colors
```tsx
// Creates invalid CSS like oklch(oklch(...)) or hsl(oklch(...))
background: 'oklch(var(--primary))'  // BROKEN!
background: 'hsl(var(--primary))'    // BROKEN!
border: '1px solid hsl(var(--border))'
```

### ✅ CORRECT - Use Variables Directly
```tsx
// Direct usage - variables ARE valid colors
background: 'var(--primary)'
border: '1px solid var(--border)'
color: 'var(--foreground)'
```

---

## Using Colors with Opacity

Use `color-mix()` for transparency:

### ❌ WRONG
```css
background: oklch(var(--primary) / 0.5);  /* Invalid - var already contains oklch() */
box-shadow: 0 4px 12px hsl(var(--foreground) / 0.1);
```

### ✅ CORRECT
```css
background: color-mix(in oklch, var(--primary) 50%, transparent);
box-shadow: 0 4px 12px color-mix(in oklch, var(--foreground) 10%, transparent);
```

---

## Quick Reference

| Use Case | Pattern |
|----------|---------|
| Solid color | `var(--primary)` |
| 50% opacity | `color-mix(in oklch, var(--primary) 50%, transparent)` |
| Border | `border: 1px solid var(--border)` |
| Background | `background: var(--card)` |
| Text color | `color: var(--foreground)` |

---

## All Variables Use Full OKLCH

Every CSS variable contains a complete `oklch()` value - no exceptions:

```css
/* All variables are complete color values */
--primary: oklch(0.55 0.22 280);
--lp-green-50: oklch(0.97 0.03 145);
--brand-primary: oklch(0.55 0.22 280);
--accent-cyan: oklch(0.75 0.15 200);
```

Use them directly:
```tsx
className="bg-[var(--lp-green-50)]"
style={{ backgroundColor: 'var(--primary)' }}
```

---

## Tailwind Classes

Tailwind handles OKLCH colors automatically:

```tsx
// ✅ CORRECT - Tailwind classes
className="bg-primary text-foreground border-border"
className="bg-primary/50"  // Tailwind handles opacity

// ❌ WRONG - Don't use arbitrary values with wrappers
className="bg-[oklch(var(--primary))]"  // BROKEN!
className="bg-[hsl(var(--primary))]"    // BROKEN!

// ✅ OK - Arbitrary values with var() directly
className="bg-[var(--primary)]"
```

---

## Chart Libraries (Recharts, etc.)

CSS variables work directly in SVG:

```tsx
<Line stroke="var(--primary)" />
<Bar fill="var(--destructive)" />
<Area fill="var(--success)" fillOpacity={0.3} />
```

---

## Summary

1. **Never** wrap variables in `hsl()` or `oklch()` - they already contain full values
2. **Always** use `var(--xxx)` directly for solid colors
3. **Use** `color-mix(in oklch, var(--xxx) %, transparent)` for opacity
4. **Tailwind** classes handle everything automatically

---

## Audit Command

Find violations:
```bash
# Find hsl() wrapping (always wrong)
grep -r "hsl(var(--" src/ --include="*.tsx" --include="*.ts" --include="*.css"

# Find oklch() wrapping (wrong if variable already contains oklch)
grep -r "oklch(var(--" src/ --include="*.tsx" --include="*.ts" --include="*.css"
```
