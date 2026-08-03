# Deployment and Domain Setup Guide for eradashboard.com.et

This directory contains production-ready configuration templates to map your domain **www.eradashboard.com.et** to the Ethiopian Roads Administration ERP Dashboard application.

---

## 1. Domain & DNS Configuration (First Step)
Before setting up your server, you need to point your domain name to your server's Public IP address. Log in to your domain registrar (e.g., Ethio Telecom, GoDaddy, Namecheap) and configure the following **DNS Records**:

| Type | Host | Value / Destination | TTL |
| :--- | :--- | :--- | :--- |
| **A** | `@` | `YOUR_SERVER_PUBLIC_IP` | 3600 (1 Hour) |
| **CNAME** | `www` | `eradashboard.com.et.` | 3600 (1 Hour) |

---

## 2. Server Environment Setup
Log in to your Ubuntu/Linux server and complete the following baseline installations:

```bash
# Update local packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (v18 or v20 LTS recommended)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Process Manager (PM2) to keep the app running forever
sudo npm install -g pm2
```

---

## 3. Deploying and Running the Application
Clone your repository or upload the files to your server directory (e.g., `/var/www/era-dashboard`):

```bash
# 1. Install project dependencies
npm install

# 2. Build the production bundle
npm run build

# 3. Start the application under PM2 process manager
pm2 start dist/server.cjs --name "era-dashboard"

# 4. Ensure PM2 starts automatically on server boot
pm2 startup
pm2 save
```

*Note: The application will run locally on `http://127.0.0.1:3000` under the hood.*

---

## 4. Option A: Web Server Configuration (Nginx - Highly Recommended)
Nginx is the standard, high-performance option for proxying modern Node.js web applications.

```bash
# 1. Install Nginx
sudo apt install nginx -y

# 2. Copy the template to sites-available
sudo cp /deployment/nginx.conf /etc/nginx/sites-available/eradashboard.com.et

# 3. Enable the configuration link
sudo ln -s /etc/nginx/sites-available/eradashboard.com.et /etc/nginx/sites-enabled/

# 4. Test Nginx syntax
sudo nginx -t

# 5. Reload Nginx to apply changes
sudo systemctl reload nginx
```

---

## 5. Option B: Web Server Configuration (Apache)
If your existing infrastructure relies on Apache:

```bash
# 1. Install Apache and proxy modules
sudo apt install apache2 -y
sudo a2enmod proxy proxy_http ssl rewrite headers proxy_wstunnel deflate

# 2. Copy the template to sites-available
sudo cp /deployment/apache.conf /etc/apache2/sites-available/eradashboard.com.et.conf

# 3. Enable the virtual host configuration
sudo a2ensite eradashboard.com.et.conf

# 4. Test configuration
sudo apache2ctl configtest

# 5. Restart Apache
sudo systemctl restart apache2
```

---

## 6. Securing with Let's Encrypt SSL (HTTPS)
Use Certbot to generate and install trusted SSL certificates automatically:

### For Nginx:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d eradashboard.com.et -d www.eradashboard.com.et
```

### For Apache:
```bash
sudo apt install certbot python3-certbot-apache -y
sudo certbot --apache -d eradashboard.com.et -d www.eradashboard.com.et
```

*(Certbot will update your `nginx.conf` or `apache.conf` file automatically with the appropriate SSL certificate paths).*
