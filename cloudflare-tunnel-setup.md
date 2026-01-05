# Cloudflare Tunnel Setup Guide

This guide will help you set up a Cloudflare Tunnel to expose your local PermitPro PMS application to the internet securely, without opening ports on your firewall.

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

After creating the tunnel, Cloudflare will provide you with a command to run. It will look like:

```bash
cloudflared service install YOUR_TUNNEL_TOKEN
```

**Important:** Copy the entire command including the token and run it on your server.

Alternatively, you can manually install:

1. Copy the tunnel token from the dashboard
2. Create the credentials file:
   ```bash
   mkdir -p ~/.cloudflared
   # The token will be saved automatically when you run the install command
   ```

## Step 4: Configure the Tunnel

1. Edit the tunnel configuration file:
   ```bash
   sudo nano /etc/cloudflared/config.yml
   ```

2. Update the configuration (replace with your values):
   ```yaml
   tunnel: YOUR_TUNNEL_ID
   credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

   ingress:
     - hostname: permitpro.yourdomain.com  # Your subdomain
       service: http://localhost:3000
     - service: http_status:404
   ```

3. Save and exit

## Step 5: Configure DNS

1. In Cloudflare Dashboard, go to **DNS** → **Records**
2. Add a new **CNAME** record:
   - **Name**: `permitpro` (or your preferred subdomain)
   - **Target**: `YOUR_TUNNEL_ID.cfargotunnel.com`
   - **Proxy status**: Proxied (orange cloud)
   - Click **Save**

## Step 6: Update Environment Variables

Update your `.env` file to use your tunnel domain:

```env
# Update NEXTAUTH_URL to your tunnel domain
NEXTAUTH_URL="https://permitpro.yourdomain.com"

# Keep other settings the same
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-here"
STORAGE_ROOT="./storage"
```

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

