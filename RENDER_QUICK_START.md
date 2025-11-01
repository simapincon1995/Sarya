# Render Quick Start Guide

## Quick Deployment Steps

### 1. Prepare Your Repository
- Ensure all code is committed and pushed to GitHub/GitLab/Bitbucket
- The repository should be accessible from Render

### 2. Deploy Using Blueprint (Easiest)

1. Go to https://render.com and sign in
2. Click "New" → "Blueprint"
3. Connect your Git repository
4. Render will detect `render.yaml` automatically
5. Click "Apply" to deploy

### 3. Set Required Environment Variables

Go to your service → Environment tab and add:

**Critical Variables:**
```
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
JWT_SECRET=your_very_long_secret_key_minimum_32_characters
CORS_ORIGIN=https://your-app-name.onrender.com
SESSION_SECRET=another_random_secret_for_sessions
```

**Note:** Mark `MONGODB_URI`, `JWT_SECRET`, and `SESSION_SECRET` as **Secret** (encrypted) in Render.

### 4. Wait for Deployment

- Build typically takes 5-10 minutes
- First deployment may take longer
- Monitor logs for any errors

### 5. Verify Deployment

- Visit: `https://your-app-name.onrender.com`
- Check health: `https://your-app-name.onrender.com/api/health`
- Test login functionality

## Important Notes

1. **Free Tier**: Services sleep after 15 min inactivity (cold start ~30-60s)
2. **Environment Variables**: All sensitive data should be in Render dashboard, NOT in code
3. **MongoDB Atlas**: Ensure Network Access allows `0.0.0.0/0` or Render's IPs
4. **CORS**: Must include your Render URL in `CORS_ORIGIN`

## Troubleshooting

- **Build Fails**: Check Node version (requires >=16.0.0)
- **Database Connection Fails**: Verify MongoDB Atlas Network Access
- **CORS Errors**: Update `CORS_ORIGIN` with exact Render URL
- **Socket.io Issues**: Works best on paid plans; free tier may use polling

For detailed instructions, see `DEPLOYMENT_RENDER.md`

