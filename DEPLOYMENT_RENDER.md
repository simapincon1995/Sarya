# Render Deployment Guide

This guide will help you deploy the Sarya Connective HRMS application to Render.

## Prerequisites

1. A Render account (sign up at https://render.com)
2. MongoDB Atlas account (or any MongoDB database)
3. Git repository with your code

## Deployment Steps

### Option 1: Using Render Blueprint (Recommended)

1. **Push your code to GitHub/GitLab/Bitbucket**
   - Make sure all your code is committed and pushed

2. **Create a new Blueprint in Render**
   - Go to Render Dashboard
   - Click "New" → "Blueprint"
   - Connect your Git repository
   - Render will automatically detect the `render.yaml` file

3. **Configure Environment Variables**
   - In the Render dashboard, go to your service
   - Navigate to "Environment" tab
   - Add the following required environment variables:
     - `MONGODB_URI`: Your MongoDB connection string
     - `JWT_SECRET`: A strong random secret key (minimum 32 characters)
     - `CORS_ORIGIN`: Your Render service URL (e.g., `https://your-app.onrender.com`)
     - `SESSION_SECRET`: A random secret for sessions

4. **Deploy**
   - Render will automatically deploy your application
   - The build process will:
     - Install all dependencies (root, server, client)
     - Build the React client
     - Start the Node.js server

### Option 2: Manual Setup

1. **Create a Web Service**
   - Go to Render Dashboard
   - Click "New" → "Web Service"
   - Connect your Git repository

2. **Configure Build Settings**
   - **Name**: sarya-connective (or your preferred name)
   - **Environment**: Node
   - **Region**: Choose closest to your users (e.g., Oregon)
   - **Branch**: main (or your default branch)
   - **Root Directory**: (leave empty, root of repo)
   - **Build Command**: `npm run install-all && npm run build`
   - **Start Command**: `cd server && npm start`

3. **Environment Variables**
   Add the following in the "Environment" section:

   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key_minimum_32_characters
   JWT_EXPIRE=7d
   BCRYPT_ROUNDS=12
   CORS_ORIGIN=https://your-app.onrender.com
   APP_NAME=Sarya Connective
   APP_VERSION=1.0.0
   DEFAULT_TIMEZONE=Asia/Kolkata
   DEFAULT_LANGUAGE=en
   DEFAULT_CURRENCY=INR
   DEFAULT_DATE_FORMAT=DD/MM/YYYY
   DEFAULT_TIME_FORMAT=HH:mm
   MAX_FILE_SIZE=10485760
   UPLOAD_PATH=./uploads
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   SESSION_SECRET=your_session_secret_key
   ```

4. **Advanced Settings**
   - Enable "Auto-Deploy": Yes
   - Health Check Path: `/api/health`

5. **Create the Service**
   - Click "Create Web Service"
   - Render will start building and deploying your application

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/dbname` |
| `JWT_SECRET` | Secret key for JWT tokens (min 32 chars) | `your_super_secret_jwt_key_here` |
| `CORS_ORIGIN` | Allowed CORS origins | `https://your-app.onrender.com` |
| `SESSION_SECRET` | Secret for session management | `your_session_secret_here` |

### Optional Variables

All other variables have default values but can be customized as needed.

## MongoDB Atlas Setup

1. **Create a MongoDB Atlas Account**
   - Go to https://www.mongodb.com/cloud/atlas
   - Create a free cluster

2. **Configure Network Access**
   - In Atlas Dashboard → Network Access
   - Add IP Address: `0.0.0.0/0` (allows all IPs, or add Render's IPs)
   - For Render, you can allow all IPs or add specific Render IP ranges

3. **Create Database User**
   - Go to Database Access
   - Create a new database user
   - Save the username and password

4. **Get Connection String**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your actual password
   - URL-encode special characters in password:
     - `@` → `%40`
     - `#` → `%23`
     - `$` → `%24`
     - `%` → `%25`
     - `&` → `%26`
     - `/` → `%2F`
     - `?` → `%3F`

5. **Update MONGODB_URI in Render**
   - Use the connection string as your `MONGODB_URI` value

## Post-Deployment

1. **Verify Deployment**
   - Check the Render logs for any errors
   - Visit your app URL: `https://your-app.onrender.com`
   - Check health endpoint: `https://your-app.onrender.com/api/health`

2. **Test the Application**
   - Create a test user account
   - Verify all features work correctly
   - Check real-time features (Socket.io)

3. **Monitor Logs**
   - Render provides real-time logs
   - Monitor for any runtime errors
   - Check database connection status

## Troubleshooting

### Build Failures

- **Issue**: Build command fails
  - **Solution**: Check Node.js version compatibility (requires >=16.0.0)
  - Verify all dependencies in package.json files

- **Issue**: Client build fails
  - **Solution**: Check for environment-specific code in React components
  - Verify all required environment variables are set

### Runtime Errors

- **Issue**: MongoDB connection fails
  - **Solution**: 
    - Verify `MONGODB_URI` is correct
    - Check MongoDB Atlas Network Access settings
    - Ensure IP whitelist includes Render's IPs (or 0.0.0.0/0)

- **Issue**: CORS errors
  - **Solution**: 
    - Update `CORS_ORIGIN` with your Render URL
    - Include both `http://` and `https://` versions if needed
    - Format: `https://your-app.onrender.com,https://www.your-domain.com`

- **Issue**: Socket.io not working
  - **Solution**: 
    - Render supports WebSockets on paid plans
    - On free tier, Socket.io may fall back to polling
    - Consider upgrading to a paid plan for better Socket.io support

### Performance

- **Issue**: Slow response times
  - **Solution**: 
    - Render free tier has limitations
    - Consider upgrading to paid plan for better performance
    - Optimize database queries
    - Enable caching where possible

## Custom Domain

1. **Add Custom Domain in Render**
   - Go to your service → Settings → Custom Domains
   - Add your domain
   - Follow DNS configuration instructions

2. **Update CORS_ORIGIN**
   - Add your custom domain to `CORS_ORIGIN`
   - Format: `https://your-app.onrender.com,https://your-domain.com`

3. **SSL Certificate**
   - Render automatically provisions SSL certificates
   - Wait for certificate to be issued (usually within minutes)

## Important Notes

1. **Render Free Tier Limitations**
   - Services sleep after 15 minutes of inactivity
   - Cold starts can take 30-60 seconds
   - Upgrade to paid plan for always-on service

2. **Environment Variables**
   - Never commit sensitive values to Git
   - Use Render's environment variables feature
   - Mark sensitive variables as "Secret" in Render

3. **File Uploads**
   - Render's filesystem is ephemeral
   - Consider using cloud storage (S3, Cloudinary) for file uploads
   - Update `UPLOAD_PATH` accordingly

4. **Database Migrations**
   - Run any necessary database migrations after deployment
   - Use MongoDB Atlas's built-in tools or scripts

## Support

For Render-specific issues:
- Render Documentation: https://render.com/docs
- Render Community: https://community.render.com

For application-specific issues:
- Check application logs in Render dashboard
- Review server/index.js for configuration
- Verify all environment variables are set correctly

