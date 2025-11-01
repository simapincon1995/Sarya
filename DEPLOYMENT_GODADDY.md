# Deployment Guide for GoDaddy Hosting

## Application Overview
Your HRMS application consists of:
- **Frontend**: React application (runs on port 3000)
- **Backend**: Node.js/Express server (runs on port 5000)
- **Database**: MongoDB
- **Real-time**: Socket.io for live updates

## ⚠️ Important Considerations for GoDaddy

### Option 1: GoDaddy VPS Hosting (Recommended)
GoDaddy VPS hosting is the **ONLY viable option** for your application because:
- Shared hosting doesn't support Node.js apps
- Your app requires MongoDB, which shared hosting doesn't support
- Real-time Socket.io requires persistent connections
- VPS gives you root access to install necessary tools

### Option 2: Alternative Hosting (Better Options)
Consider these alternatives that are more suitable for Node.js apps:
- **AWS**, **Azure**, **Google Cloud** (cloud platforms)
- **DigitalOcean**, **Linode**, **Vultr** (VPS providers)
- **Heroku**, **Railway**, **Render** (PaaS providers)
- **A2 Hosting**, **Hostinger**, **SiteGround** (Node.js-friendly)

---

## Deployment on GoDaddy VPS

### Prerequisites
1. **GoDaddy VPS with cPanel** or root access (SSH)
2. Node.js 18+ installed
3. MongoDB installed
4. PM2 (process manager)
5. Nginx (reverse proxy)
6. Domain name pointed to your VPS IP

### Step 1: Server Setup

#### Connect to your VPS via SSH
```bash
ssh root@your-server-ip
```

#### Install Node.js
```bash
# Update system
apt-get update && apt-get upgrade -y

# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Verify installation
node -v  # Should show v18.x.x or higher
npm -v
```

#### Install MongoDB
```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -

# Create list file
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Install MongoDB
apt-get update
apt-get install -y mongodb-org

# Start MongoDB
systemctl start mongod
systemctl enable mongod

# Verify MongoDB
systemctl status mongod
```

#### Install Nginx
```bash
apt-get install -y nginx
systemctl start nginx
systemctl enable nginx
```

#### Install PM2
```bash
npm install -g pm2
```

---

### Step 2: Upload Application Files

#### Option A: Using Git (Recommended)
```bash
# Install Git
apt-get install -y git

# Clone your repository
cd /var/www
git clone https://github.com/your-org/sarya-connective.git
cd sarya-connective

# Install dependencies
npm run install-all
```

#### Option B: Using File Manager (FTP/cPanel)
1. Upload all files via FTP or cPanel File Manager
2. Ensure file permissions are correct (755 for directories, 644 for files)

---

### Step 3: Build Frontend

```bash
cd /var/www/sarya-connective
npm run build
```

This creates the production build in `client/build/` directory.

---

### Step 4: Configure Backend

Create production environment file:

```bash
cd /var/www/sarya-connective/server
nano config.env
```

Add/Update these values:
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/sarya_connective
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
BCRYPT_ROUNDS=12
CORS_ORIGIN=https://yourdomain.com,http://yourdomain.com
APP_NAME=Sarya Connective
APP_VERSION=1.0.0
DEFAULT_TIMEZONE=Asia/Kolkata
DEFAULT_LANGUAGE=en
DEFAULT_CURRENCY=INR
```

**⚠️ IMPORTANT**: Change `JWT_SECRET` to a strong random string in production!

---

### Step 5: Initialize MongoDB

```bash
cd /var/www/sarya-connective/server
mongo < init-mongo.js
```

Or manually:
```bash
mongo
use sarya_connective
# Your database will be initialized
exit
```

---

### Step 6: Start Backend with PM2

```bash
cd /var/www/sarya-connective/server

# Start the application
pm2 start index.js --name "sarya-backend"

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd
```

Verify it's running:
```bash
pm2 status
pm2 logs sarya-backend
```

---

### Step 7: Configure Nginx

Edit Nginx configuration:

```bash
nano /etc/nginx/sites-available/sarya-connective
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS (after SSL setup)
    # return 301 https://$server_name$request_uri;
    
    root /var/www/sarya-connective/client/build;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;
    
    # Serve static files
    location / {
        try_files $ prog.html /index.html;
    }
    
    # API proxy to backend
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Socket.io proxy (important for real-time features)
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:
```bash
ln -s /etc/nginx/sites-available/sarya-connective /etc/nginx/sites-enabled/
nginx -t  # Test configuration
systemctl reload nginx
```

---

### Step 8: Setup SSL Certificate

Install Certbot for free SSL:
```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts and Certbot will configure SSL automatically.

---

### Step 9: Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
```

---

### Step 10: Domain Configuration in GoDaddy

1. Log in to your GoDaddy account
2. Go to Domain Management
3. Click on your domain
4. Under DNS settings, add:
   - **A Record**: `@` → Your VPS IP address
   - **A Record**: `www` → Your VPS IP address
5. Wait for DNS propagation (24-48 hours, usually faster)

---

## Monitoring and Maintenance

### Check Application Status
```bash
# Check PM2 processes
pm2 status

# View logs
pm2 logs sarya-backend

# Restart application
pm2 restart sarya-backend

# Stop application
pm2 stop sarya-backend
```

### Check System Resources
```bash
# Check disk space
df -h

# Check memory
free -m

# Check MongoDB
systemctl status mongod
mongo --eval "db.adminCommand('listDatabases')"
```

### Backup Database
```bash
# Create backup
mongodump --out /backup/$(date +%Y%m%d)

# Restore from backup
mongorestore /backup/20240101
```

---

## Troubleshooting

### Application won't start
```bash
# Check logs
pm2 logs sarya-backend

# Check if MongoDB is running
systemctl status mongod

# Check if port 5000 is in use
netstat -tulpn | grep 5000
```

### Can't connect to API
```bash
# Check Nginx status
systemctl status nginx

# Check Nginx error logs
tail -f /var/log/nginx/error.log

# Test backend directly
curl http://localhost:5000/api/health
```

### Socket.io not working
- Ensure `/socket.io/` location block is properly configured in Nginx
- Check CORS settings in `server/index.js`
- Verify WebSocket upgrade headers are set correctly

---

## Alternative: GoDaddy cPanel (Limited)

If you only have cPanel hosting (not VPS):

### Limitations
- ❌ No Node.js support on most GoDaddy shared hosting plans
- ❌ No MongoDB support
- ❌ Socket.io won't work properly

### Workaround (Not Recommended)
1. You would need to find a separate hosting provider for your backend
2. Use GoDaddy only for static frontend hosting
3. Connect frontend to external API

**This approach is NOT recommended** and will cause significant issues with your application.

---

## Cost Comparison

### GoDaddy VPS
- **Economy VPS**: $19.99/month (1GB RAM, 1 CPU) - May struggle with your app
- **Deluxe VPS**: $39.99/month (4GB RAM, 2 CPUs) - Better option
- **Ultimate VPS**: $59.99/month (8GB RAM, 4 CPUs) - Recommended

### Recommended Alternatives (Better Value)
- **DigitalOcean**: $6-12/month (Better specs, easier setup)
- **Linode**: $5-10/month
- **AWS Lightsail**: $5-10/month
- **Heroku**: Free tier available, $7+/month for production

---

## Security Checklist

- [ ] Change default MongoDB authentication
- [ ] Use strong JWT_SECRET
- [ ] Enable firewall (UFW)
- [ ] Setup SSL certificate
- [ ] Keep system updated (`apt-get update && apt-get upgrade`)
- [ ] Setup automatic backups
- [ ] Use environment variables for secrets
- [ ] Limit MongoDB access to localhost only
- [ ] Setup fail2ban for SSH protection
- [ ] Regular security audits

---

## Need Help?

If you encounter issues:
1. Check PM2 logs: `pm2 logs sarya-backend`
2. Check Nginx logs: `tail -f /var/log/nginx/error.log`
3. Check MongoDB logs: `tail -f /var/log/mongodb/mongod.log`

For any specific errors, the logs will provide detailed information.

---

## Summary

**Recommended Path**: Use GoDaddy VPS with this guide, or better yet, consider switching to DigitalOcean, AWS, or Heroku for easier deployment and better performance at similar or lower costs.

Your application requires:
- ✅ Node.js runtime
- ✅ MongoDB database
- ✅ Persistent connections (Socket.io)
- ✅ Reverse proxy (Nginx)

These requirements make VPS hosting essential - shared hosting won't work.


