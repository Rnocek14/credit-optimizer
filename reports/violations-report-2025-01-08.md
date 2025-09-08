# Codebase Color Violations Report

Generated: 2025-01-08T16:45:00.000Z

## Summary
- Files with violations: 12
- Total violations: 89

## Violations by File

### src/components/CelebrationModal.tsx

- Line 45: `#FFD700`
  Context: `colors: ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#1E90FF']`
- Line 45: `#FFA500`
  Context: `colors: ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#1E90FF']`
- Line 45: `text-yellow-500`
  Context: `<Star className="h-8 w-8 text-yellow-500" />`
- Line 47: `text-orange-500`
  Context: `<Zap className="h-8 w-8 text-orange-500" />`
- Line 49: `text-purple-500`
  Context: `<Trophy className="h-8 w-8 text-purple-500" />`

### src/components/EnhancedSkillTreeCanvas.tsx

- Line 167: `#3b82f6`
  Context: `Programming: '#3b82f6',`
- Line 168: `#f59e0b`
  Context: `Framework: '#f59e0b',`
- Line 169: `#10b981`
  Context: `Backend: '#10b981',`
- Line 170: `#ec4899`
  Context: `Design: '#ec4899',`

### src/components/CertificatePDFTemplate.tsx

- Line 7: `#ffffff`
  Context: `backgroundColor: '#ffffff',`
- Line 17: `#2563eb`
  Context: `color: '#2563eb',`
- Line 23: `#1e293b`
  Context: `color: '#1e293b',`

### src/components/AdaptiveLearningTracker.tsx

- Line 460: `text-green-500`
  Context: `<CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />`

### src/App.css

- Line 15: `#646cffaa`
  Context: `filter: drop-shadow(0 0 2em #646cffaa);`
- Line 18: `#61dafbaa`
  Context: `filter: drop-shadow(0 0 2em #61dafbaa);`

### src/components/LocationROIExplorer.tsx

- Line 75: `hsl(${10 + normalizedValue / 0.3 * 20}, 70%, ${40 + normalizedValue / 0.3 * 20}%)`
  Context: Dynamic HSL generation
- Line 78: `hsl(${30 + intensity * 30}, 70%, ${60 + intensity * 20}%)`
  Context: Dynamic HSL generation

## Recommended Actions

1. Replace hex colors with semantic tokens: `hsl(var(--primary))`
2. Use semantic Tailwind classes: `text-primary` instead of `text-blue-500`
3. Define new semantic tokens in `index.css` if needed
4. Run the automated migration tool: `npx migrate-colors`