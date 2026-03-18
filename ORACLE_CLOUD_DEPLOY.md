# 🦀 Gravity Claw - Oracle Cloud Free 24/7 Deployment Guide

This guide will help you deploy Gravity Claw on Oracle Cloud's **Always Free** tier for truly free 24/7 operation.

## Prerequisites
- A Google account (for GitHub)
- A phone number (for verification)
- A credit card (required for Oracle Cloud free tier - won't be charged)

---

## Step 1: Create Oracle Cloud Account

1. Go to [Oracle Cloud](https://cloud.oracle.com/)
2. Click **Start for Free**
3. Sign up with your email
4. Verify your email
5. Enter your credit card (required for verification, but you'll use Always Free resources)
6. Select your home region (choose one with ARM support like **France Central** or **UK South**)

---

## Step 2: Create Always Free Virtual Machine

1. After login, go to **Hamburger Menu → Compute → Instances**
2. Click **Create Instance**
3. Configure:
   - **Name**: `gravity-claw`
   - **Image**: Ubuntu 22.04 or 24.04
   - **Shape**: Select **VM.Standard.E2.1.Micro** (AMD) OR **VM.Standard.A1.Flex** (ARM - 4 CPUs, 24GB RAM if available)
   - **SSH Keys**: Generate a new key pair, save the private key securely
4. Click **Create**
5. Wait for instance to provision (2-5 minutes)

---

## Step 3: Configure Firewall

1. Go to **Networking → Virtual Cloud Networks → Your VCN**
2. Click **Security Lists → Default Security List**
3. Add Ingress Rules:
   - **Source CIDR**: `0.0.0.0/0`, **Destination Port**: `443`, **Protocol**: TCP
   - **Source CIDR**: `0.0.0.0/0`, **Destination Port**: `80`, **Protocol**: TCP
   - **Source CIDR**: `0.0.0.0/0`, **Destination Port**: `22`, **Protocol**: TCP

---

## Step 4: Add Swap Space (Required for 1GB RAM)

SSH into your instance and run:

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

---

## Step 5: Install Dependencies

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v  # Should be v22.x
```

---

## Step 6: Clone and Build Your Project

```bash
# Clone your repo (or upload your files)
git clone https://github.com/YOUR_USERNAME/gravity-claw.git
cd gravity-claw

# Create .env file
cp .env.example .env
nano .env  # Edit with your actual API keys

# Install and build
npm install
npm run build
```

---

## Step 7: Set Up Nginx as Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/gravity-claw
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name YOUR_IP_OR_DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/gravity-claw /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 8: Set Up Telegram Webhook

You need to set up a webhook for Telegram to reach your bot. Since you're behind Nginx:

```bash
# Get your public IP or set up a domain with Dynamic DNS
curl https://api.ipify.org  # Your public IP
```

Set the webhook:
```bash
curl -F "url=https://YOUR_IP_OR_DOMAIN/webhook" https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook
```

---

## Step 9: Run the Bot

```bash
# Test it runs
cd gravity-claw
node dist/index.js

# If it works, set up PM2 for auto-restart
sudo npm install -g pm2
pm2 start dist/index.js --name gravity-claw
pm2 startup
pm2 save
```

---

## Step 10: Keep Bot Running 24/7

PM2 will auto-restart if the bot crashes. To monitor:

```bash
pm2 monit        # Monitor logs
pm2 status       # See status
pm2 logs         # View logs
```

---

## Important Notes

### Security
1. **Never commit your .env file** to GitHub
2. Use a domain with HTTPS (set up certbot)
3. Change SSH port from 22 to something else
4. Use UFW: `sudo ufw enable` and allow only needed ports

### Bot Response Issues?
- Check your Telegram ID is in `ALLOWED_USER_IDS`
- Ensure your bot token is correct in `.env`
- Check PM2 logs: `pm2 logs gravity-claw`

### Updating the Bot
```bash
cd gravity-claw
git pull
npm run build
pm2 restart gravity-claw
```

---

## Troubleshooting

**Bot not responding?**
1. Check if Telegram webhook is set: `https://api.telegram.org/botYOUR_TOKEN/getWebhookInfo`
2. Verify firewall allows port 443/80
3. Check logs: `pm2 logs gravity-claw`

**Out of memory?**
- Increase swap (Step 4)
- Use smaller models in .env

**Instance stopped?**
- Oracle may stop instances for maintenance - PM2 will auto-restart
- Always Free has resource limits - stay under them

---

## Quick SSH Command for Future Access

```bash
ssh -i /path/to/your/private_key ubuntu@YOUR_PUBLIC_IP
```
