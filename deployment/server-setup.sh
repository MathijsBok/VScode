#!/bin/bash

# Server Initial Setup Script
# Run this ONCE on a fresh Ubuntu server (20.04/22.04)
# Usage: sudo ./server-setup.sh

set -e

echo "========================================"
echo "  Klever Support - Server Setup"
echo "  Setting up dev + prod environments"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo)${NC}"
    exit 1
fi

# ============================================
# 1. SYSTEM UPDATE
# ============================================
echo -e "${YELLOW}[1/10] Updating system packages...${NC}"
apt update && apt upgrade -y

# ============================================
# 2. INSTALL NODE.JS 20.x
# ============================================
echo -e "${YELLOW}[2/10] Installing Node.js 20.x...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v
npm -v

# ============================================
# 3. INSTALL POSTGRESQL
# ============================================
echo -e "${YELLOW}[3/10] Installing PostgreSQL...${NC}"
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql

# Create databases
echo -e "${YELLOW}Creating databases...${NC}"
sudo -u postgres psql <<EOF
CREATE DATABASE ticket_system_dev;
CREATE DATABASE ticket_system_prod;
ALTER USER postgres PASSWORD 'CHANGE_THIS_PASSWORD';
EOF

echo -e "${GREEN}Databases created: ticket_system_dev, ticket_system_prod${NC}"

# ============================================
# 4. INSTALL NGINX
# ============================================
echo -e "${YELLOW}[4/10] Installing Nginx...${NC}"
apt install -y nginx
systemctl start nginx
systemctl enable nginx

# ============================================
# 5. INSTALL PM2
# ============================================
echo -e "${YELLOW}[5/10] Installing PM2...${NC}"
npm install -g pm2
pm2 startup systemd -u $SUDO_USER --hp /home/$SUDO_USER

# ============================================
# 6. INSTALL CERTBOT (SSL)
# ============================================
echo -e "${YELLOW}[6/10] Installing Certbot for SSL...${NC}"
apt install -y certbot python3-certbot-nginx

# ============================================
# 7. CREATE DIRECTORY STRUCTURE
# ============================================
echo -e "${YELLOW}[7/10] Creating directory structure...${NC}"
mkdir -p /var/www/ticket-system-dev
mkdir -p /var/www/ticket-system-prod
mkdir -p /var/log/pm2

# Set ownership (replace 'deploy' with your deployment user)
chown -R $SUDO_USER:$SUDO_USER /var/www/ticket-system-dev
chown -R $SUDO_USER:$SUDO_USER /var/www/ticket-system-prod
chown -R $SUDO_USER:$SUDO_USER /var/log/pm2

# ============================================
# 8. INSTALL GIT
# ============================================
echo -e "${YELLOW}[8/10] Installing Git...${NC}"
apt install -y git

# ============================================
# 9. CONFIGURE FIREWALL
# ============================================
echo -e "${YELLOW}[9/10] Configuring firewall...${NC}"
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw --force enable

# ============================================
# 10. FINAL INSTRUCTIONS
# ============================================
echo ""
echo -e "${GREEN}========================================"
echo "  Server setup complete!"
echo "========================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Update PostgreSQL password in this script (line 47)"
echo "   Then run: sudo -u postgres psql -c \"ALTER USER postgres PASSWORD 'your_new_password';\""
echo ""
echo "2. Clone your repository:"
echo "   cd /var/www/ticket-system-dev"
echo "   git clone YOUR_REPO_URL ."
echo "   git checkout develop"
echo ""
echo "   cd /var/www/ticket-system-prod"
echo "   git clone YOUR_REPO_URL ."
echo "   git checkout main"
echo ""
echo "3. Copy and configure .env files:"
echo "   cp deployment/env-templates/backend.env.development /var/www/ticket-system-dev/backend/.env"
echo "   cp deployment/env-templates/frontend.env.development /var/www/ticket-system-dev/frontend/.env"
echo "   cp deployment/env-templates/backend.env.production /var/www/ticket-system-prod/backend/.env"
echo "   cp deployment/env-templates/frontend.env.production /var/www/ticket-system-prod/frontend/.env"
echo ""
echo "4. Install dependencies and build:"
echo "   cd /var/www/ticket-system-dev/backend && npm install && npm run build && npm run db:migrate"
echo "   cd /var/www/ticket-system-dev/frontend && npm install"
echo "   cd /var/www/ticket-system-prod/backend && npm ci && npm run build && npm run db:migrate"
echo "   cd /var/www/ticket-system-prod/frontend && npm ci && npm run build"
echo ""
echo "5. Setup nginx:"
echo "   cp deployment/nginx-ticket-system.conf /etc/nginx/sites-available/ticket-system"
echo "   ln -s /etc/nginx/sites-available/ticket-system /etc/nginx/sites-enabled/"
echo "   nginx -t"
echo "   systemctl reload nginx"
echo ""
echo "6. Get SSL certificates:"
echo "   certbot --nginx -d dev.kleverchain.cloud -d support.kleverchain.cloud"
echo ""
echo "7. Start PM2:"
echo "   cp deployment/ecosystem.config.js /var/www/"
echo "   cd /var/www && pm2 start ecosystem.config.js"
echo "   pm2 save"
echo ""
echo "Done! Your apps will be available at:"
echo "  - https://dev.kleverchain.cloud (Development)"
echo "  - https://support.kleverchain.cloud (Production)"
