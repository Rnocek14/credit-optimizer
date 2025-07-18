# PathfindAI Deployment Guide

## 🚀 Production Deployment Instructions

### Option 1: Vercel Deployment (Recommended)

1. **Connect Repository**
   ```bash
   # Install Vercel CLI (optional)
   npm i -g vercel
   
   # Deploy from GitHub
   # Go to vercel.com → Import Git Repository → Select your repo
   ```

2. **Configure Environment Variables in Vercel Dashboard:**
   - `VITE_SUPABASE_URL` = Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = Your Supabase anon key
   - Deploy will automatically use `vercel.json` configuration

### Option 2: Netlify Deployment

1. **Connect Repository**
   - Go to netlify.com → Add New Site → Import from Git
   - Select your repository

2. **Build Settings:**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Netlify will automatically use `netlify.toml` configuration

### 🔐 Environment Variables Setup

The following environment variables need to be configured in your deployment platform:

**Frontend Environment Variables:**
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon (publishable) key

**Backend Environment Variables (Supabase Edge Functions):**
- `SUPABASE_URL` - Your Supabase project URL  
- `SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `OPENAI_API_KEY` - Your OpenAI API key

### 🌐 Custom Domain Setup

1. **Add your domain in deployment platform:**
   - Vercel: Project Settings → Domains
   - Netlify: Site Settings → Domain management

2. **Configure DNS:**
   - Add CNAME record pointing to your deployment URL
   - Or use A record with platform's IP address

### 🔒 Supabase Production Configuration

1. **Update Site URL and Redirect URLs:**
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Site URL: `https://yourdomain.com`
   - Add redirect URLs:
     - `https://yourdomain.com/auth`
     - `https://yourdomain.com/onboarding`
     - `https://yourdomain.com/dashboard`

2. **CORS Configuration (if needed):**
   - Usually automatic with proper Site URL configuration
   - Add your domain to allowed origins if experiencing CORS issues

### 🧪 Testing Production Flow

Test this complete user journey:
1. **Signup** → Email verification → Auto-redirect to onboarding
2. **Onboarding** → Form completion → Roadmap generation
3. **Dashboard** → View career tracks and roadmap steps
4. **Progress tracking** → Mark steps complete
5. **Authentication** → Logout and login flow

### 🚀 Launch Checklist

- [ ] Deploy to production platform
- [ ] Configure custom domain
- [ ] Update Supabase URLs
- [ ] Test complete signup flow
- [ ] Test roadmap generation with OpenAI
- [ ] Verify mobile responsiveness
- [ ] Check all error pages (404, 500)
- [ ] Test authentication flows
- [ ] Monitor Edge Function logs

## 📊 Monitoring & Analytics

Consider adding:
- Vercel Analytics
- PostHog or Google Analytics
- Sentry for error monitoring
- Supabase monitoring for database performance

## 🔧 Environment Variables Reference

```bash
# Frontend (.env.local for local development)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Backend (Supabase Edge Functions - Configure in Supabase Dashboard)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
```