# HRMS Deployment Guide

## 🚀 Deployment Overview

This guide covers deployment to **Render.com** (as configured in your `render.yaml`), but the principles apply to other platforms as well.

---

## ✅ Pre-Deployment Checklist

### 1. **Environment Variables**
Ensure these are set in your deployment platform:

```bash
# Required
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hrms
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
NODE_ENV=production

# Optional
PORT=5000
CORS_ORIGIN=https://your-frontend-domain.com
```

### 2. **Build Configuration**
Your app has two parts:
- **Backend**: Node.js/Express (server/)
- **Frontend**: React (client/)

---

## 📦 Deployment Methods

### **Option A: Single Server Deployment (Recommended)**

Deploy both frontend and backend together as one service.

#### **Build Commands:**
```bash
# Install server dependencies
cd server && npm install

# Install client dependencies and build
cd ../client && npm install && npm run build

# Copy build to server
# (Already configured in your setup)
```

#### **Start Command:**
```bash
cd server && node index.js
```

#### **What Happens:**
1. Server starts on specified PORT
2. Automatically checks for default templates
3. If no templates exist, creates them automatically ✅
4. Serves React build from `/client/build`
5. API available at `/api/*`
6. Frontend served at `/*`

---

### **Option B: Separate Deployments**

Deploy frontend and backend separately.

#### **Backend (API Server):**
- Deploy `server/` folder
- Set environment variables
- Start command: `node index.js`
- Templates auto-initialize on first startup ✅

#### **Frontend (React App):**
- Deploy `client/` folder
- Build command: `npm run build`
- Update API base URL in `client/src/services/api.js`

---

## 🎯 Template Initialization (Automatic)

### **How It Works:**

Your server now **automatically initializes templates** on startup:

```javascript
// In server/index.js (already added)
.then(async () => {
  console.log('✅ MongoDB connected successfully');
  
  // Check if default templates exist
  const templateCount = await Template.countDocuments({ isDefault: true });
  
  if (templateCount === 0) {
    // No templates? Create them!
    await Template.createDefaultTemplates();
    console.log('✅ Default templates initialized');
  }
})
```

### **What This Means:**

✅ **No manual script needed** - Templates created automatically  
✅ **Idempotent** - Only creates templates if they don't exist  
✅ **Zero downtime** - Happens during server startup  
✅ **Works on any platform** - Render, Vercel, AWS, Heroku, etc.

---

## 🔧 Manual Template Initialization (Optional)

If you prefer to run the script manually (e.g., for testing):

### **Local/Development:**
```bash
cd server
node init-templates.js
```

### **Production Server (SSH):**
```bash
# SSH into your server
ssh user@your-server.com

# Navigate to app directory
cd /path/to/hrms/server

# Run script
node init-templates.js
```

### **Render.com (One-time Job):**
You can't directly SSH, but you can:

1. **Option 1**: Use Render Shell (if available)
   - Go to your service dashboard
   - Click "Shell" tab
   - Run: `cd server && node init-templates.js`

2. **Option 2**: Create a temporary API endpoint
   ```javascript
   // Add to server/index.js temporarily
   app.post('/api/admin/init-templates', async (req, res) => {
     const Template = require('./models/Template');
     await Template.createDefaultTemplates();
     res.json({ message: 'Templates initialized' });
   });
   ```
   Then call it once via Postman/curl and remove the endpoint.

3. **Option 3**: Let automatic initialization handle it ✅ (BEST)

---

## 📋 Render.com Specific Deployment

Your `render.yaml` is already configured. Here's what happens:

### **1. Push to GitHub:**
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### **2. Render Auto-Deploys:**
- Detects `render.yaml`
- Creates web service
- Runs build commands:
  ```bash
  cd client && npm install && npm run build
  cd ../server && npm install
  ```
- Starts server: `node index.js`
- **Templates auto-initialize** on first run ✅

### **3. Set Environment Variables on Render:**

Go to your service → Environment → Add:
```
MONGODB_URI = mongodb+srv://...
JWT_SECRET = your-secret-key
NODE_ENV = production
CORS_ORIGIN = https://your-app.onrender.com
```

### **4. Deploy:**
Click "Manual Deploy" or push to trigger auto-deploy.

---

## 🔍 Verify Deployment

### **1. Check Server Health:**
```bash
curl https://your-app.onrender.com/api/health
```

Expected response:
```json
{
  "status": "OK",
  "message": "Sarya Connective API is running",
  "timestamp": "2025-11-26T..."
}
```

### **2. Check Templates:**
Look at server logs on Render dashboard. You should see:
```
✅ MongoDB connected successfully
✅ Found 7 default templates
```
or
```
✅ MongoDB connected successfully
📝 No default templates found. Creating default templates...
✅ Default templates initialized successfully
```

### **3. Test Document Generation:**
- Login to your app
- Go to Employees page
- Click document icon (📄)
- Try generating an appointment letter
- Should work! ✅

---

## 🐛 Troubleshooting

### **Templates Not Creating:**

**Check logs:**
```bash
# Render dashboard → Logs tab
# Look for template initialization messages
```

**Verify MongoDB connection:**
- Ensure `MONGODB_URI` is correct
- Check MongoDB Atlas IP whitelist (allow 0.0.0.0/0 for Render)
- Verify database user has read/write permissions

**Manual fix:**
```bash
# Connect to your MongoDB using Compass or mongosh
use hrms

# Check templates
db.templates.find({isDefault: true}).count()

# If 0, manually run:
# Option 1: Use the API endpoint method above
# Option 2: Connect via mongo shell and insert templates
```

### **Document Generation Fails:**

1. **Check template exists:**
   ```javascript
   db.templates.findOne({type: 'appointment_letter', isDefault: true})
   ```

2. **Check server logs** for specific error

3. **Verify employee data** has required fields (joiningDate, etc.)

---

## 🔐 Security Best Practices

### **1. Environment Variables:**
- Never commit `.env` or `config.env` files
- Use platform-specific environment variable settings
- Rotate JWT_SECRET periodically

### **2. MongoDB Security:**
- Use strong password
- Enable MongoDB Atlas IP whitelist
- Create database user with minimal required permissions
- Enable MongoDB audit logs

### **3. CORS Configuration:**
- Set specific domains in `CORS_ORIGIN`
- Don't use `*` in production

### **4. Rate Limiting:**
- Already configured (500 requests per 15 minutes)
- Adjust based on your needs

---

## 📊 Monitoring

### **Key Metrics to Monitor:**

1. **Server Health:**
   - API response times
   - Error rates
   - Memory usage

2. **Database:**
   - Connection count
   - Query performance
   - Storage size

3. **Template Usage:**
   - Check `usageCount` in templates collection
   - Monitor document generation frequency

### **Render Monitoring:**
- Built-in metrics available in dashboard
- Set up alerts for downtime
- Monitor deployment logs

---

## 🔄 Updating Templates

### **Method 1: Via UI (Recommended)**
1. Login as Admin
2. Go to Templates page
3. Edit existing templates
4. Changes take effect immediately

### **Method 2: Via Database**
```javascript
// Update template content directly in MongoDB
db.templates.updateOne(
  { type: 'appointment_letter', isDefault: true },
  { $set: { content: '<html>...</html>' } }
)
```

### **Method 3: Re-run Initialization**
⚠️ This will **overwrite** existing default templates:
```bash
# Delete existing defaults
db.templates.deleteMany({isDefault: true})

# Restart server or run init script
node init-templates.js
```

---

## 🚦 Deployment Workflow

### **Development → Staging → Production**

```bash
# 1. Development
npm run dev:server  # Start backend
npm start           # Start frontend (separate terminal)

# 2. Test locally
npm test

# 3. Build
cd client && npm run build

# 4. Test production build locally
cd ../server && node index.js
# Visit http://localhost:5000

# 5. Commit & Push
git add .
git commit -m "Feature: Document generation improvements"
git push origin main

# 6. Deploy
# Render auto-deploys on push (if configured)
# Or click "Manual Deploy" in Render dashboard

# 7. Verify
curl https://your-app.onrender.com/api/health
# Test in browser
```

---

## 📱 Post-Deployment Testing

### **Checklist:**

- [ ] Login works
- [ ] Employee CRUD operations work
- [ ] Attendance marking works
- [ ] Leave management works
- [ ] Payroll generation works
- [ ] **Document generation works** (all 7 types)
- [ ] Bulk payslip generation works
- [ ] Template management works
- [ ] Dashboard loads
- [ ] All API endpoints respond

### **Document Generation Test:**

1. **Appointment Letter:**
   - Go to Employees
   - Click document icon
   - Select "Appointment Letter"
   - Should preview and download ✅

2. **Payslip:**
   - Generate monthly payroll
   - Click "Bulk Payslips"
   - Select month/year
   - Generate all payslips
   - Download and verify ✅

3. **Leave Letters:**
   - Approve/reject a leave
   - Should auto-generate letter ✅

---

## 🎉 Summary

### **✅ What You DON'T Need to Do:**
- ❌ Manually run `init-templates.js` on server
- ❌ SSH into production to initialize templates
- ❌ Create templates via API calls
- ❌ Worry about template initialization

### **✅ What Happens Automatically:**
- ✅ Server connects to MongoDB
- ✅ Checks if default templates exist
- ✅ Creates them if missing
- ✅ Logs success/failure
- ✅ Ready to generate documents

### **🎯 Simple Deployment Steps:**

1. **Set environment variables** on Render
2. **Push to GitHub** (or click "Manual Deploy")
3. **Wait for build** to complete
4. **Check logs** - should see "✅ Default templates initialized"
5. **Test document generation** - should work!

That's it! Your templates will be automatically available on every deployment. 🚀

---

## 📞 Support

**Having issues?**
- Check Render logs first
- Verify MongoDB connection
- Test API health endpoint
- Review template initialization logs

**Common Issues:**
1. **Templates not found** → Check logs for initialization errors
2. **MongoDB connection failed** → Verify MONGODB_URI and IP whitelist
3. **Document generation fails** → Check template exists in database
4. **CORS errors** → Set correct CORS_ORIGIN

---

## 🔄 Maintenance

### **Regular Tasks:**

**Weekly:**
- Monitor error logs
- Check database size
- Review document generation metrics

**Monthly:**
- Update dependencies (`npm outdated`)
- Review and optimize slow queries
- Backup database

**Quarterly:**
- Security audit
- Performance optimization
- Template content review

---

**Your deployment is now fully automated and production-ready!** 🎊
