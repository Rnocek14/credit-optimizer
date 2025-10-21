# Changelog

## [Phase 1a] - 2025-10-21 - Auto-Complete & Analytics Hardening

### ✨ Auto-Complete Enhancements
- **Status-Aware Messaging**: Centralized `getAutoCompleteMessage` with `ok`, `partial`, `none` status handling
- **Pluralization**: Smart singular/plural forms ("1 module" vs "2 modules")
- **Double-Click Protection**: Button disabled during processing with `aria-busy` for accessibility
- **Async Safety**: Try-finally block ensures state cleanup even if errors occur

### 📊 Analytics Improvements
- **ACE Tracking**: Auto-complete events now log status, constraints used, and suggestion counts
- **Null Guards**: Filters out undefined/null constraint values before analytics
- **Empty-Degree Guard**: Validates modules before processing to prevent NaN totals

### 🎯 Workload & Timeline
- **Concurrency Totals**: Fixed NaN issues in total weeks and workload hours calculations
- **Timeline Validation**: Proper handling of empty or invalid degree data

### 🧪 Testing
- **Status Message Tests**: Complete coverage of `getAutoCompleteMessage` edge cases
- **Pluralization Tests**: Validates singular/plural handling

## [1.0.0] - 2024-02-14 - 4-Hub UX Consolidation

### 🎯 Major UX Overhaul
- **4-Hub Navigation System**: Consolidated entire application into 4 primary hubs (Discover, Plan, Progress, Contribute)
- **Progressive Disclosure**: Hub visibility based on user journey stage (new → active → power users)
- **Today Dashboard**: Added concise daily focus strip in Plan hub with actionable cards

### 🧭 Navigation Improvements  
- **Removed Legacy Navigation**: Deleted old mega-menu Navigation component
- **Hub-Centric Routing**: All navigation now goes through 4 primary hubs with tab-based content
- **Updated Data TestIDs**: Standardized testing attributes (`nav-discover`, `nav-plan`, etc.)
- **Fixed Default Landing**: Authenticated users now land on `/plan` by default

### 📱 Hub Content Organization
- **Discover Hub**: Careers, Courses, Mentors tabs with "Save to Plan" CTAs
- **Plan Hub**: Roadmap, Goals, Workflows, Proof Projects tabs + Today dashboard
- **Progress Hub**: History, Portfolio, Credentials, Resume tabs with "Add to Resume" CTAs  
- **Contribute Hub**: Tab-based interface for Teach, Institution, Employer, Admin features

### 🔗 URL & Tab Integration
- **Deep Linking**: All hub tabs support `?tab=` URL parameters
- **Tab State Sync**: URL updates preserve active tab on refresh
- **Legacy Redirects**: Comprehensive redirect mapping for all old routes

### 🧪 Testing & Reliability
- **Cypress Test Suite**: Complete 4-hub navigation testing with data-testids
- **Data TestID Standards**: Consistent testing attributes across all components
- **Progressive Disclosure Testing**: Journey stage-based navigation visibility

### 🎨 User Experience
- **Today Dashboard Cards**: Next Step, Focus Skills, Quick Wins, Streak/XP with real-time data
- **Primary CTA Flow**: "Take Next Step" button links to active roadmap item
- **Consistent Design**: Unified card layouts and interaction patterns across hubs
- **Mobile Responsive**: Bottom navigation for mobile with 4-hub structure

### 🛡️ Security & Permissions
- **Role-Based Access**: Contribute hub shows only permitted features
- **Journey Store Integration**: User permissions and stage properly initialized
- **Access Control**: Graceful handling of restricted features

### 📁 Code Organization
- **Component Cleanup**: Removed unused Navigation component 
- **New Components**: TodayDashboard, ContributeTabbed for better separation
- **Store Integration**: Journey store properly wired for progressive disclosure
- **Route Consolidation**: Streamlined App.tsx with comprehensive legacy redirects

### 🔧 Technical Improvements
- **Performance**: Parallel tool execution for faster development
- **Maintainability**: Cleaner component structure with focused responsibilities  
- **TypeScript**: Enhanced type safety across navigation components
- **Documentation**: README_NAV.md explaining hub architecture

### ⬆️ Breaking Changes
- Old `/navigation` routes redirected to appropriate hubs
- All standalone pages now live within hub tab structure
- Navigation component completely replaced with HubNavigation

### 🚀 Future-Ready
- Multi-track support in header positioning
- Extensible tab system for adding new features
- Scalable permission-based feature disclosure
- Ready for advanced personalization and AI recommendations