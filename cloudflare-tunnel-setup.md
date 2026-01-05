# Cloudflare Tunnel Setup Guide

This guide will help you set up a Cloudflare Tunnel to expose your local PermitPro PMS application to the internet securely, without opening ports on your firewall.

**Important Security Note:** Tunnel credentials (TUNNEL_ID and TUNNEL_TOKEN) are stored in your `.env` file, which is git-ignored. Never commit these values to version control. See `.env.example` for the expected structure.

## Prerequisites

1. A Cloudflare account with a domain added
2. The domain's nameservers should be pointing to Cloudflare
3. `cloudflared` installed on your server

## Step 1: Install cloudflared

### Linux (Ubuntu/Debian)
```bash
# Download and install cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

### macOS
```bash
brew install cloudflare/cloudflare/cloudflared
```

### Windows
Download from: https://github.com/cloudflare/cloudflared/releases

### Verify Installation
```bash
cloudflared --version
```

## Step 2: Create a Tunnel in Cloudflare Dashboard

1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your domain
3. Go to **Zero Trust** → **Networks** → **Tunnels**
4. Click **Create a tunnel**
5. Choose **Cloudflared** as the connector
6. Give your tunnel a name (e.g., "permitpro-pms")
7. Click **Save tunnel**

## Step 3: Install the Tunnel on Your Server

1. After creating the tunnel in the Cloudflare Dashboard, copy the tunnel token provided.

2. Add the token to your `.env` file (create it in the project root if it doesn't exist):
   ```bash
   # Edit .env file
   nano .env
   ```

3. Add the tunnel credentials to `.env`:
   ```env
   # Cloudflare Tunnel Configuration
   CLOUDFLARE_TUNNEL_ID="your-tunnel-id-here"
   CLOUDFLARE_TUNNEL_TOKEN="your-tunnel-token-here"
   ```

   **Security Note:** The `.env` file is git-ignored and should never be committed to version control.

4. Install the tunnel using the token from your environment:
   ```bash
   # Source the .env file and install (or export the variable first)
   export $(grep -v '^#' .env | xargs)
   cloudflared service install $CLOUDFLARE_TUNNEL_TOKEN
   ```

   Or if you prefer, you can use the token directly (but remember to add it to `.env` for future reference):
   ```bash
   cloudflared service install YOUR_TUNNEL_TOKEN
   ```

**Important:** Keep your tunnel token secure. It provides full access to your tunnel configuration.

## Step 4: Configure the Tunnel

1. Edit the tunnel configuration file:
   ```bash
   sudo nano /etc/cloudflared/config.yml
   ```

2. Update the configuration with your tunnel ID (from your `.env` file's `CLOUDFLARE_TUNNEL_ID`):
   ```yaml
   tunnel: YOUR_TUNNEL_ID
   credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

   ingress:
     - hostname: permitpro.yourdomain.com  # Your subdomain
       service: http://localhost:3000
     - service: http_status:404
   ```

   **Important:** Replace `YOUR_TUNNEL_ID` with the actual tunnel ID from your `.env` file (the `CLOUDFLARE_TUNNEL_ID` value). Do not commit this file with real values to git.

3. Save and exit

## Step 5: Configure DNS

1. Get your tunnel ID from your `.env` file (the `CLOUDFLARE_TUNNEL_ID` value) or from the Cloudflare Dashboard (Zero Trust → Networks → Tunnels)

2. In Cloudflare Dashboard, go to **DNS** → **Records**
3. Add a new **CNAME** record:
   - **Name**: `permitpro` (or your preferred subdomain)
   - **Target**: `YOUR_TUNNEL_ID.cfargotunnel.com` (replace `YOUR_TUNNEL_ID` with your actual tunnel ID from `.env`)
   - **Proxy status**: Proxied (orange cloud)
   - Click **Save**

## Step 6: Update Environment Variables

Update your `.env` file with all necessary variables:

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth Configuration
NEXTAUTH_URL="https://permitpro.yourdomain.com"  # Your tunnel domain
NEXTAUTH_SECRET="your-secret-here"

# File Storage
STORAGE_ROOT="./storage"

# Cloudflare Tunnel Configuration
CLOUDFLARE_TUNNEL_ID="your-tunnel-id-here"
CLOUDFLARE_TUNNEL_TOKEN="your-tunnel-token-here"
```

**Security Reminder:** The `.env` file is git-ignored. Never commit tunnel credentials or secrets to version control.

## Step 7: Start the Tunnel Service

```bash
# Start the cloudflared service
sudo systemctl start cloudflared

# Enable it to start on boot
sudo systemctl enable cloudflared

# Check status
sudo systemctl status cloudflared
```

## Step 8: Verify the Setup

1. Make sure your Next.js app is running:
   ```bash
   npm run dev
   # or for production
   npm run build && npm start
   ```

2. Visit your tunnel URL: `https://permitpro.yourdomain.com`

3. You should see your application!

## Troubleshooting

### Check Tunnel Logs
```bash
sudo journalctl -u cloudflared -f
```

### Test Tunnel Connection
```bash
cloudflared tunnel info
```

### Restart Tunnel Service
```bash
sudo systemctl restart cloudflared
```

### Verify DNS
```bash
dig permitpro.yourdomain.com
# Should return a CNAME to *.cfargotunnel.com
```

### Common Issues

1. **Tunnel not connecting**: Check that the tunnel token is correct and the service is running
2. **502 Bad Gateway**: Make sure your Next.js app is running on `localhost:3000`
3. **SSL errors**: Cloudflare automatically handles SSL, but ensure your domain is proxied (orange cloud)
4. **Session issues**: Make sure `NEXTAUTH_URL` matches your tunnel domain exactly

## Security Considerations

- Cloudflare Tunnel provides secure, encrypted connections
- No need to open firewall ports
- All traffic goes through Cloudflare's network
- Consider enabling Cloudflare Access for additional authentication layers
- Use Cloudflare's WAF (Web Application Firewall) rules for additional protection

## Updating the Tunnel Configuration

If you need to change the configuration:

1. Edit `/etc/cloudflared/config.yml`
2. Restart the service:
   ```bash
   sudo systemctl restart cloudflared
   ```

## Additional Resources

- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Cloudflare Tunnel GitHub](https://github.com/cloudflare/cloudflared)

