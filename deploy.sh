#!/bin/bash

# Sarya Connective - Automated Deployment Script
# For VPS Servers (GoDaddy VPS, DigitalOcean, AWS, etc.)

set -e

echo "🚀 Starting Sarya Connective Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root (use sudo)"
    exit 1
fi

# Update system
print_info "Updating system packages..."
apt-get update && apt-get upgrade -y
print_success "System updated"

# Install Node.js
if ! command -v node &> /dev/null; then
    print_info "Installing Node.js 18 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    print_success "Node.js installed"
else
    print_info "Node.js already installed: $(node -v)"
fi

# Install MongoDB
if ! command -v mongod &> /dev/null; then
    print_info "Installing MongoDB..."
    wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
    apt-get update
    apt-get install -y mongodb-org
    systemctl start mongod
    systemctl enable mongod
    print_success "MongoDB installed and started"
else
    print_info "MongoDB already installed"
fi

# Install Nginx
if ! command -v nginx &> /dev/null; then
    print_info "Installing Nginx..."
    apt-get install -y nginx
    systemctl start nginx
    systemctl enable nginx
    print_success "Nginx installed and started"
else
    print_info "Nginx already installed"
fi

# Install PM2
if ! command -v pm2 &> /dev/null; then
    print_info "Installing PM2..."
    npm install -g pm2
    print_success "PM2 installed"
else
    print_info "PM2 already installed"
fi

# Install Git if not present
if ! command -v git &> /dev/null; then
    print_info "Installing Git..."
    apt-get install -y git
    print_success "Git installed"
fi

# Setup application directory
APP_DIR="/var/www/sarya-connective"
print_info "Setting up application in $APP_DIR"

# Create directory if it doesn't exist
mkdir -p $APP_DIR

# Build frontend
print_info "Building frontend..."
cd $APP_DIR
if [ -d "client" ]; then
    cd client
    npm install --production=false
    npm run build
    print_success "Frontend built successfully"
else
    print_error "Client directory not found. Please ensure application files are present."
    exit 1
fi

# Install backend dependencies
print_info "Installing backend dependencies..."
cd $APP_DIR/server
if [ ! -f "config.env" ]; then
    print_info "Creating config.env from template..."
    cat > config.env << EOL
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/sarya_connective
JWT_SECRET=CHANGE_THIS_TO_A_STRONG_RANDOM_SECRET_KEY
JWT_EXPIRE=7d
BCRYPT_ROUNDS=12
CORS_ORIGIN=https://yourdomain.com
APP_NAME=Sarya Connective
APP_VERSION=1.0.0
DEFAULT_TIMEZONE=Asia/Kolkata
DEFAULT_LANGUAGE=en
DEFAULT_CURRENCY=INR
EOL
    print_info "⚠️  IMPORTANT: Edit $APP_DIR/server/config.env to set JWT_SECRET and CORS_ORIGIN"
fi

npm install --production
print_success "Backend dependencies installed"

# Start application with PM2
print_info "Starting application with PM2..."
pm2 stop sarya-backend || true  # Stop if already running
pm2 delete sarya-backend || true  # Delete if exists
pm2 start index.js --name "sarya-backend"
pm2 save
print_success "Application started with PM2"

# Setup PM2 startup
pm2 startup systemd -u root --hp /root || true

# Setup firewall
print_info "Configuring firewall..."
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable
print_success "Firewall configured"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_success "Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_info "Next steps:"
echo "1. Edit $APP_DIR/server/config.env with your settings"
echo "2. Configure Nginx (see DEPLOYMENT_GODADDY.md)"
echo "3. Setup SSL certificate: certbot --nginx -d yourdomain.com"
echo "4. Restart application: pm2 restart sarya-backend"
echo ""
echo "STSlog commands:"
echo "  pm2 logs sarya-backend    # View logs"
echo "  pm2 status                # Check status"
echo "  pm2 restart sarya-backend # Restart app"
echo ""


