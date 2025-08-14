# Life Path Navigation Architecture

## 4-Hub System Overview

Life Path uses a **4-hub navigation architecture** that consolidates all features into four primary areas:

### 🔍 **DISCOVER** (`/discover`)
Explore career opportunities and learning resources
- **Tabs**: `careers`, `courses`, `mentors`, `market`
- **Legacy Routes**: `/explore`, `/explore-courses`, `/salary-insights`, `/market-intelligence`
- **CTAs**: "Save to Plan" - adds items to planning hub

### 🎯 **PLAN** (`/plan`) 
Strategic planning and goal setting with Today dashboard
- **Tabs**: `roadmap`, `goals`, `workflows`, `proof`
- **Legacy Routes**: `/planner`, `/goals`, `/maya-roadmap`, `/workflows`
- **Special**: Today dashboard with Next Step, Focus Skills, Quick Wins, Streak
- **CTAs**: "Take Next Step" - navigates to active roadmap item

### 📈 **PROGRESS** (`/progress`)
Track learning history and showcase achievements  
- **Tabs**: `history`, `portfolio`, `credentials`, `resume`
- **Legacy Routes**: `/history`, `/learning-history`, `/projects`, `/wallet`, `/badges`, `/certificates`, `/resume-builder`
- **CTAs**: "Add to Resume", "Manage Wallet"

### 🤝 **CONTRIBUTE** (`/contribute`)
Share expertise and help others (permission-gated)
- **Tabs**: `teach`, `institution`, `employer`, `admin` (based on permissions)
- **Legacy Routes**: `/teach-hub`, `/institution-hub`, `/employer-hub`, `/admin*`
- **Progressive**: Only shown when user has contributor permissions

## Progressive Disclosure

Navigation visibility adapts to user journey stage:

```typescript
// Journey Stages
type JourneyStage = 'new' | 'active' | 'power';

// Visibility Rules
- Stage 'new': Show DISCOVER + PLAN only
- Stage 'active': Show DISCOVER + PLAN + PROGRESS  
- Stage 'power' + permissions: Show all 4 hubs including CONTRIBUTE
```

## Tab-Based Content

All content lives within hub tabs using URL parameters:

```typescript
// URL Structure
/discover?tab=careers    // Default: careers
/plan?tab=roadmap       // Default: roadmap  
/progress?tab=history   // Default: history
/contribute?tab=teach   // Default: teach (if permitted)

// Deep Linking Support
- URLs preserve active tab on refresh
- Direct navigation to specific tabs works
- Tab state syncs with URL parameters
```

## Adding New Features

### ✅ **DO**: Add to existing hub tabs
```typescript
// Example: Adding new planning feature
const planFeatures = [
  { title: "AI Roadmap", tab: "roadmap", ... },
  { title: "Goal Setting", tab: "goals", ... },
  { title: "NEW FEATURE", tab: "workflows", ... }, // ← Add here
];
```

### ❌ **DON'T**: Create new top-level navigation
```typescript
// WRONG - Don't add 5th hub
<Button>NEW TOP LEVEL ITEM</Button>

// RIGHT - Add to existing hub
<TabsTrigger value="new-feature">New Feature</TabsTrigger>
```

## Component Structure

```
src/components/
├── HubNavigation.tsx          # Main 4-hub navigation  
├── TodayDashboard.tsx         # Plan hub daily focus strip
└── maya/MayaInlinePanel.tsx   # AI guidance sidebars

src/pages/
├── DiscoverHub.tsx           # Discover tab container
├── PlanHub.tsx               # Plan tab container + Today dashboard
├── ProgressHub.tsx           # Progress tab container  
└── ContributeTabbed.tsx      # Contribute tab container
```

## Testing Data-TestIDs

Consistent testing attributes for reliability:

```typescript
// Navigation
data-testid="nav-discover|plan|progress|contribute"

// Hub Tabs  
data-testid="tab-careers|courses|mentors|market"        // Discover
data-testid="tab-roadmap|goals|workflows|proof"         // Plan
data-testid="tab-history|portfolio|credentials|resume"  // Progress
data-testid="tab-teach|institution|employer|admin"      // Contribute

// Today Dashboard
data-testid="today-next-step|focus-skills|quick-wins|streak"

// CTAs
data-testid="cta-next-step|save-to-plan|add-to-resume|manage-wallet"
```

## Route Redirects

All legacy routes safely redirect to appropriate hub tabs:

```typescript
// Examples
/goals → /plan?tab=goals
/explore → /discover?tab=careers  
/learning-history → /progress?tab=history
/teach-hub → /contribute?tab=teach
```

## Best Practices

1. **Stay within 4 hubs** - Don't create new top-level navigation
2. **Use tab parameters** - All content should be tab-based within hubs
3. **Add data-testids** - Essential for stable Cypress testing
4. **Consider progressive disclosure** - New features should respect journey stages
5. **Maintain redirects** - Ensure legacy URLs don't break
6. **Follow CTA conventions** - Use established patterns ("Save to Plan", etc.)

## Track Integration

The Track Selector appears in hub headers and scopes data when multiple tracks are supported:

```typescript
// Track-aware components
const { activeTrackId } = useActiveTrackStore();

// Scope data to active track
goals.filter(goal => goal.trackId === activeTrackId)
```

This architecture ensures scalable navigation that grows with the platform while maintaining simplicity and clear user mental models.