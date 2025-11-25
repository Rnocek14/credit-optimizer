# Life Path Migration Guide

## Overview
This guide provides step-by-step instructions for migrating the Life Path project from Lovable to independent hosting (Vercel, Netlify, or custom infrastructure).

**Exportability Score: 88/100** - Highly portable with minimal Lovable dependencies.

---

## Pre-Migration Checklist

### ✅ What You Already Own
- [x] Supabase project (database, auth, storage, edge functions)
- [x] GitHub repository with full codebase
- [x] 524 database migrations in `supabase/migrations/`
- [x] 84 edge functions in `supabase/functions/`
- [x] Domain registration (if applicable)

### 🔧 What Needs Updating
- [ ] Remove Lovable dev dependencies
- [ ] Update environment variables
- [ ] Configure hosting provider
- [ ] Deploy edge functions via Supabase CLI

---

## Step-by-Step Migration

### Step 1: Verify Local Build
```bash
# Clone your repo
git clone <your-repo-url>
cd life-path

# Install dependencies
npm install

# Build the project
npm run build

# Test locally
npm run preview
```

**Expected result:** Build completes successfully, preview runs on localhost.

---

### Step 2: Environment Variables

#### Frontend Variables (Set in Vercel/Netlify Dashboard)
```env
VITE_SUPABASE_URL=https://vzpissitddpunkpythsb.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...
VITE_SUPABASE_PROJECT_ID=vzpissitddpunkpythsb
VITE_LP_DEGREE_MARKETPLACE=1
```

#### Edge Function Secrets (Set in Supabase Dashboard)
Go to: Supabase Dashboard → Project Settings → Edge Functions → Secrets

```bash
# Required secrets:
OPENAI_API_KEY=sk-...
CRON_SECRET=your-cron-secret
RESEND_API_KEY=re-...
```

---

### Step 3: Deploy to Hosting Provider

#### Option A: Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Project Settings → Environment Variables
```

Configuration is already in `vercel.json`.

#### Option B: Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod

# Set environment variables in Netlify dashboard
# Site Settings → Environment Variables
```

Configuration is already in `netlify.toml`.

#### Option C: Docker/VPS
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 8080
CMD ["npm", "run", "preview"]
```

---

### Step 4: Deploy Edge Functions

```bash
# Link to your Supabase project
supabase link --project-ref vzpissitddpunkpythsb

# Deploy all edge functions
supabase functions deploy calculate-career-switch
supabase functions deploy maya-intelligence-engine
supabase functions deploy course-path-integrator
# ... deploy remaining 81 functions

# Or deploy all at once
cd supabase/functions
for dir in */; do
  supabase functions deploy "${dir%/}"
done
```

---

### Step 5: Update Supabase Configuration

In Supabase Dashboard → Authentication → URL Configuration:

```
Site URL: https://your-new-domain.com
Redirect URLs:
  https://your-new-domain.com/**
  http://localhost:8080/**
```

---

### Step 6: DNS & Domain Setup

If using custom domain:

1. **Vercel:**
   - Dashboard → Project → Settings → Domains
   - Add your domain and follow DNS instructions

2. **Netlify:**
   - Site Settings → Domain Management → Custom Domains
   - Update DNS records as shown

3. **Cloudflare (recommended for caching/security):**
   - Add your domain to Cloudflare
   - Point A/CNAME records to your hosting provider
   - Enable proxy (orange cloud)

---

### Step 7: Update Mobile Config (If Using Capacitor)

Edit `capacitor.config.json`:

```json
{
  "appId": "com.yourcompany.lifepath",
  "appName": "Life Path",
  "webDir": "dist",
  "server": {
    "url": "https://your-new-domain.com",
    "cleartext": true
  }
}
```

Then rebuild native apps:
```bash
npm run build
npx cap sync
npx cap run ios
npx cap run android
```

---

## Post-Migration Verification

### ✅ Frontend Checklist
- [ ] Site loads correctly
- [ ] All pages render
- [ ] Routing works (no 404s)
- [ ] Assets load (images, fonts, etc.)

### ✅ Backend Checklist
- [ ] User login works
- [ ] Database queries return data
- [ ] File uploads work
- [ ] Edge functions respond correctly

### ✅ Scheduled Jobs Checklist
- [ ] pg_cron jobs still running (check Supabase logs)
- [ ] No errors in edge function logs

---

## Rollback Plan

If anything breaks:

1. **Frontend:** Revert DNS to Lovable until issues resolved
2. **Backend:** Supabase continues working independently
3. **Edge Functions:** Redeploy previous version:
   ```bash
   supabase functions deploy <function-name> --import-map supabase/functions/import_map.json
   ```

---

## Common Issues & Solutions

### Issue: "Supabase client error"
**Solution:** Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are set correctly.

### Issue: "Authentication redirect fails"
**Solution:** Add your new domain to Supabase → Authentication → Redirect URLs.

### Issue: "Edge function 500 error"
**Solution:** Check secrets are set in Supabase dashboard. View logs:
```bash
supabase functions logs <function-name>
```

### Issue: "CORS errors"
**Solution:** Update allowed origins in edge function CORS headers.

---

## Performance Optimization

After migration, consider:

1. **CDN:** Enable Cloudflare or your host's CDN
2. **Image Optimization:** Use Supabase Storage transformations
3. **Edge Caching:** Configure cache headers in `netlify.toml`/`vercel.json`
4. **Database:** Enable connection pooling in Supabase

---

## Cost Breakdown (Post-Migration)

- **Hosting:** $0-20/month (Vercel/Netlify free tier → Pro)
- **Supabase:** $25/month (Pro plan) or usage-based
- **Domain:** $10-15/year
- **Total:** ~$35/month for production app

---

## Need Help?

- **Supabase Docs:** https://supabase.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **Netlify Docs:** https://docs.netlify.com

Migration should take 2-4 hours for a developer familiar with the stack.
