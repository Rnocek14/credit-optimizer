# OKLCH Color System Documentation

This project uses **OKLCH** (Oklch Lightness Chroma Hue) as the primary color format. This guide explains the conventions to prevent color rendering issues.

---

## ⚠️ Critical Rule: Never Wrap CSS Variables in `hsl()`

Our CSS variables in `index.css` contain **full OKLCH color values**, not raw HSL triplets.

```css
/* ✅ Variables contain COMPLETE color values */
--primary: oklch(0.55 0.22 280);
--background: oklch(0.99 0.00 0);
--border: oklch(0.80 0.01 250);
```

### ❌ WRONG - Creates Invalid CSS
```tsx
// This creates: hsl(oklch(0.55 0.22 280)) - BROKEN!
background: 'hsl(var(--primary))'
border: '1px solid hsl(var(--border))'
filter: 'drop-shadow(0 0 2em hsl(var(--primary) / 0.5))'
```

### ✅ CORRECT - Use Variables Directly
```tsx
// Direct usage - variables already contain valid colors
background: 'var(--primary)'
border: '1px solid var(--border)'
color: 'var(--foreground)'
```

---

## Using Colors with Opacity

Since OKLCH values can't use the `/opacity` shorthand, use `color-mix()`:

### ❌ WRONG
```css
background: hsl(var(--primary) / 0.5);
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

## All Variables Use OKLCH

All CSS variables in this project—including the `--lp-*` status colors—now use **full OKLCH values**. There are no longer any HSL triplet exceptions:

```css
/* All variables contain complete OKLCH color values */
--lp-green-50: oklch(0.97 0.03 145);
--lp-red-50: oklch(0.97 0.02 25);
--lp-blue-50: oklch(0.97 0.02 250);
```

Use them directly without any wrapper:
```tsx
className="bg-[var(--lp-green-50)]"
```

---

## Tailwind Classes

Tailwind handles the color format automatically. Use semantic tokens:

```tsx
// ✅ CORRECT - Tailwind classes
className="bg-primary text-foreground border-border"
className="bg-primary/50"  // Tailwind handles opacity

// ❌ AVOID - Arbitrary values with hsl()
className="bg-[hsl(var(--primary))]"  // BROKEN!

// ✅ OK - Arbitrary values with var()
className="bg-[var(--primary)]"
```

---

## Chart Libraries (Recharts, etc.)

For SVG-based charts, CSS variables work directly:

```tsx
// ✅ CORRECT
<Line stroke="var(--primary)" />
<Bar fill="var(--destructive)" />
<Area fill="var(--success)" fillOpacity={0.3} />
```

---

## Summary

1. **Never** use `hsl(var(--xxx))` for semantic tokens
2. **Always** use `var(--xxx)` directly for solid colors
3. **Use** `color-mix(in oklch, ...)` for opacity
4. **Exception**: `--lp-*` variables need `hsl()` wrapper
5. **Tailwind** classes handle everything automatically

---

## Audit Command

To find violations, search for this pattern:
```bash
grep -r "hsl(var(--" src/ --include="*.tsx" --include="*.ts" --include="*.css"
```

Exclude false positives for `--lp-*` variables which legitimately need `hsl()`.
