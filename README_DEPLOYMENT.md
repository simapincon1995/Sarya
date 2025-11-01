# HRMS Application - Deployment Guide

## 📋 Overview

This is a full-stack HRMS (Human Resource Management System) application built with:
- **Frontend**: React.js
- **Backend**: Node.js/Express
- **Database**: MongoDB
- **Real-time**: Socket.io

## 🚀 Deployment Options

### ⭐ Recommended: Heroku (Easiest)

**Why Heroku?**
- Zero server management
- Automatic SSL certificates
- Git-based deployment
- Built-in monitoring
- Free tier available

**Deploy in 5 Steps**:

1. **Install Heroku CLI**
   ```bash
   # Download from heroku.com or
   npm install -g heroku
   ```

2. **Login to Heroku**
   ```bash
   heroku login
   ```

3. **Create Heroku App**
   ```bash
   heroku create your-hrms-app-name
   ```

4. **Add MongoDB**
   ```bash
   heroku addons:create mongolab:sandbox
   ```

5. **Deploy**
   ```bash
   git push heroku main
   ```

**Set Environment Variables**:
```bash
heroku config:set JWT_SECRET=your_very_strong_secret_key_here
heroku config:set JWT_EXPIRE=7d
heroku config:set BCRYPT_ROUNDS=12
heroku config:set NODE_ENV=production
heroku config:set CORS_ORIGIN=https://your-hrms-app-name.herokuapp.com
```

**Your app will be live at**: `https://your-hrms-app-name.herokuapp.com`

---

### 🌐 GoDaddy VPS Hosting

**Important**: This option requires GoDaddy VPS (not shared hosting).

📖 **Complete Guide**: See `DEPLOYMENT_GODADDY.md`

**Quick Steps**:
1. Purchase GoDaddy VPS (Economy: $19.99/month)
2. SSH into your server
3. Run deployment script:
   ```bash
   bash deploy.sh
   ```
4. Configure Nginx and SSL
5. Point your domain to server IP

**Time Required**: 2-3 hours  
**Difficulty**: Medium-Hard

---

### 💻 Other Hosting Providers

📖 **Complete Guide**: See `DEPLOYMENT_ALTERNATIVES.md`

**Better Options**:
- **DigitalOcean**: $6/month - Best balance
- **Railway**: $5/month - Easiest setup
- **Render**: $7/month - Free tier available
- **Vultr**: $2.50/month - Cheapest

---

## 📦 What Gets Deployed?

### Frontend (React)
- Location: `client/build/`
- Built with: `npm run build`
- Served by: Nginx (production) or create-react-app (development)

### Backend (Node.js)
- Location: `server/`
- Entry point: `server/index.js`
- Runs on: Port 5000 (configurable)

### Database (MongoDB)
- Local: MongoDB installed on server
- Cloud: MongoDB Atlas (recommended)

---

## 🔧 Before Deploying

### 1. Update Configuration

Edit `server/config.env`:
```env
NODE_ENV=production
JWT_SECRET=your_super_strong_secret_key_change_this
CORS_ORIGIN=https://yourdomain.com
MONGODB_URI=mongodb://localhost:27017/sarya_connective
```

### 2. Build Frontend
```bash
cd client
npm install
npm run build
```

### 3. Test Locally
```bash
# Start MongoDB (if local)
# Then start backend
cd server
npm install
npm start

# In another terminal, test frontend
cd client
npm start
```

---

## 🐛 Common Issues & Solutions

### Issue: Cannot connect to database
**Solution**: 
- Check MongoDB is running: `systemctl status mongod`
- Verify connection string in `config.env`
- For production, use MongoDB Atlas

### Issue: Port already in use
**Solution**:
- Change PORT in `config.env`
- Or use environment variable: `PORT=3001 npm start`

### Issue: CORS errors
**Solution**:
- Add frontend URL to `CORS_ORIGIN` in `config.env`
- For multiple origins: `CORS_ORIGIN=https://domain1.com,https://domain2.com`

### Issue: Socket.io not working
**Solution**:
- Ensure WebSocket support in hosting plan
- Configure Nginx proxy correctly (see DEPLOYMENT_GODADDY.md)
- Check CORS settings

---

## 📊 Deployment Checklist

### Pre-Deployment
- [ ] Test application locally
- [ ] Build frontend successfully
- [ ] Update all environment variables
- [ ] Change default JWT_SECRET
- [ ] Test database connection
- [ ] Commit all changes to Git

### Deployment
- [ ] Choose hosting provider
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Setup database (local or Atlas)
- [ ] Configure domain name
- [ ] Setup SSL certificate
- [ ] Test all features

### Post-Deployment
- [ ] Monitor application logs
- [ ] Setup automated backups
- [ ] Configure monitoring/alerts
- [ ] Test real-time features
- [ ] Verify all API endpoints
- [ ] Performance testing

---

## 🔒 Security Considerations

### Before Going Live:
1. **Change JWT_SECRET** - Use a strong random string
2. **Enable SSL** - Use HTTPS everywhere
3. **Setup Firewall** - Only allow necessary ports
4. **MongoDB Security** - Change default passwords
5. **Environment Variables** - Never commit secrets to Git
6. **Rate Limiting** - Already configured in backend
7. **Helmet** - Security headers already configured

### Recommended:
- Use MongoDB Atlas (managed & secure)
- Setup automated backups
- Enable monitoring
- Regular security updates
- Use strong passwords

---

## 📞 Support & Resources

### Documentation
- `DEPLOYMENT_GODADDY.md` - Detailed GoDaddy VPS guide
- `DEPLOYMENT_ALTERNATIVES.md` - Other hosting options
- `deploy.sh` - Automated deployment script

### For Issues:
1. Check application logs
2. Review error messages
3. Consult relevant deployment guide
4. Check hosting provider documentation

### Useful Commands:
```bash
# Check if backend is running
curl http://localhost:5000/api/health

# View logs (PM2)
pm2 logs sarya-backend

# View logs (Heroku)
heroku logs --tail

# Restart application
pm2 restart sarya-backend
# or
heroku restart
```

---

## 🎯 Quick Start Recommendations

**For Beginners**:
→ Use **Heroku** (see top of this file)

**For Production**:
→ Use **DigitalOcean** or **AWS**

**For Existing GoDaddy Users**:
→ Follow `DEPLOYMENT_GODADDY.md`

**For Budget-Conscious**:
→ Use **Vultr** ($2.50/month)

---

## 💡 Tips

1. **Start with Heroku** - It's the fastest way to get your app online
2. **Use MongoDB Atlas** - Easier than managing local MongoDB
3. **Monitor Your App** - Use PM2 or Heroku dashboard
4. **Regular Backups** - Set up automated backups
5. **Test Everything** - Don't assume it works after deployment

---

**Need Help?** Check the detailed guides in this repository or contact your development team.

**Good luck with your deployment! 🚀**


