# Staging Environment Setup Guide

This guide will help you set up a staging environment at `staging.olanfans.com` on the same EC2 instance as production.

## Overview

The staging environment will run alongside production with:
- **Separate database**: MySQL on port 3307 (internally)
- **Separate app container**: Next.js on port 3001
- **No Discord bot**: Discord notifications disabled for staging
- **Separate volumes**: Database and images isolated from production
- **Public URL**: https://staging.olanfans.com

## Prerequisites

- EC2 instance already running production
- SSH access to EC2 instance
- Domain DNS access to add staging subdomain
- GitHub repository access for secrets configuration

---

## Step 1: DNS Configuration

Add a DNS A record for the staging subdomain:

```
Type: A
Name: staging
Value: <your-ec2-public-ip>
TTL: 300 (or your preference)
```

Wait for DNS propagation (usually a few minutes).

---

## Step 2: Push Staging Files to Repository

All the necessary files have been created locally:
- `docker-compose.staging.yml`
- `.env.staging`
- `deploy-staging.sh`
- `nginx-staging.conf`
- `.github/workflows/deploy-staging.yml`

**Commit and push these files to your repository:**

```bash
git add docker-compose.staging.yml .env.staging deploy-staging.sh nginx-staging.conf .github/workflows/deploy-staging.yml package.json
git commit -m "Add staging environment configuration"
git push origin main
```

---

## Step 3: Configure GitHub Secrets for Staging

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

### New Secrets to Add:
- `DB_PASSWORD_STAGING`: MySQL database password for staging (can be same as prod or different)
- `MYSQL_ROOT_PASSWORD_STAGING`: MySQL root password for staging (can be same as prod or different)

### Existing Secrets (reused):
- `EC2_SSH_PRIVATE_KEY`: Already configured
- `EC2_HOST`: Already configured
- `EC2_USER`: Already configured

**Note**: You can use the same passwords as production or create separate ones for staging.
**Note**: Discord bot is disabled for staging, so Discord/AWS secrets are not needed.

---

## Step 4: SSH into EC2 Instance

```bash
ssh -i ~/path/to/your-key.pem ec2-user@<your-ec2-ip>
```

---

## Step 5: Pull Latest Code

```bash
cd ~/prog-hub
git pull origin main
```

---

## Step 6: Update .env.staging with Secrets

The `.env.staging` file has placeholders. Replace them with actual values:

```bash
nano .env.staging
```

Replace all `REPLACE_WITH_SECRET` values with actual credentials:
- `DB_PASSWORD`
- `MYSQL_ROOT_PASSWORD`

**Note**: The GitHub Actions workflow will also do this automatically on deployment.
**Note**: Discord is disabled for staging (`DISCORD_ENABLED=false`), so no Discord/AWS credentials needed.

---

## Step 7: Create Image Directories

Create directories for staging images:

```bash
mkdir -p ~/prog-hub/public/deck-images-staging
mkdir -p ~/prog-hub/public/banlist-images-staging
```

---

## Step 8: Configure Nginx for Staging

Copy the staging nginx configuration to the nginx sites directory:

```bash
sudo cp ~/prog-hub/nginx-staging.conf /etc/nginx/sites-available/staging.olanfans.com
sudo ln -s /etc/nginx/sites-available/staging.olanfans.com /etc/nginx/sites-enabled/
```

Test nginx configuration:

```bash
sudo nginx -t
```

If successful, reload nginx:

```bash
sudo systemctl reload nginx
```

---

## Step 9: Obtain SSL Certificate for Staging

Use Certbot to get an SSL certificate for the staging subdomain:

```bash
sudo certbot --nginx -d staging.olanfans.com
```

Follow the prompts. Certbot will automatically update your nginx configuration with SSL settings.

---

## Step 10: Deploy Staging Environment

Make the deployment script executable and run it:

```bash
chmod +x ~/prog-hub/deploy-staging.sh
./deploy-staging.sh
```

This will:
1. Pull latest code
2. Stop any existing staging containers
3. Build staging containers
4. Start staging containers
5. Display container status

---

## Step 11: Verify Deployment

### Check Container Status

```bash
docker ps | grep staging
```

You should see two running containers:
- `mysql_db_staging`
- `next_app_staging`

### Check Logs

```bash
# Next.js app logs
docker logs -f next_app_staging

# MySQL logs
docker logs mysql_db_staging
```

### Test the Application

Visit https://staging.olanfans.com in your browser. You should see the application running.

---

## Step 12: Create Staging Branch (Optional)

To use the GitHub Actions workflow that auto-deploys on push to 'staging' branch:

```bash
# On your local machine
git checkout -b staging
git push -u origin staging
```

Now whenever you push to the `staging` branch, GitHub Actions will automatically deploy to staging.

---

## Managing Both Environments

### Production Commands

```bash
# View production logs
npm run logs

# Stop production
npm run docker:down

# Rebuild production
npm run docker:build
npm run docker:up
```

### Staging Commands

```bash
# View staging logs
npm run logs:staging

# Stop staging
npm run docker:staging:down

# Rebuild staging
npm run docker:staging:build
npm run docker:staging:up
```

### Manual Deployment

**Production:**
```bash
./deploy.sh
```

**Staging:**
```bash
./deploy-staging.sh
```

---

## Port Mapping Summary

| Service | Production Port | Staging Port | External Access |
|---------|----------------|--------------|-----------------|
| Next.js | 3000 | 3001 | Via Nginx (443) |
| MySQL | 3306 | 3307 | Localhost only |

---

## Database Access

### Production Database
```bash
docker exec -it mysql_db_prod mysql -u appuser -p
# Database: appdb
```

### Staging Database
```bash
docker exec -it mysql_db_staging mysql -u appuser -p
# Database: appdb_staging
```

---

## Discord Bot

Discord notifications are **disabled** for staging (`DISCORD_ENABLED=false` in `.env.staging`). This keeps staging quiet and avoids polluting production Discord channels with test data.

If you need to enable Discord for staging in the future:
1. Uncomment the `discord_bot` service in `docker-compose.staging.yml`
2. Set `DISCORD_ENABLED=true` in `.env.staging`
3. Add Discord channel IDs and AWS SQS configuration
4. Redeploy staging

---

## Troubleshooting

### Port Conflicts
If port 3001 or 3307 are already in use, modify `docker-compose.staging.yml` to use different ports.

### SSL Certificate Issues
If Certbot fails, ensure:
- DNS record is propagated (`dig staging.olanfans.com`)
- Port 80 and 443 are open in EC2 security group
- Nginx is running (`sudo systemctl status nginx`)

### Container Won't Start
Check logs:
```bash
docker logs next_app_staging
docker logs mysql_db_staging
```

Common issues:
- Database connection failed: Check `.env.staging` DATABASE_URL
- Port already in use: Another service using port 3001

### Database Initialization Failed
Remove the staging volume and recreate:
```bash
npm run docker:staging:clean
npm run docker:staging:build
npm run docker:staging:up
```

---

## Copying Production Database to Staging (Optional)

To test with production data:

```bash
# Dump production database
docker exec mysql_db_prod mysqldump -u appuser -p<password> appdb > prod_dump.sql

# Import to staging
docker exec -i mysql_db_staging mysql -u appuser -p<password> appdb_staging < prod_dump.sql
```

---

## Cleanup

To completely remove the staging environment:

```bash
# Stop and remove containers, volumes, images
npm run docker:staging:clean

# Remove nginx config
sudo rm /etc/nginx/sites-enabled/staging.olanfans.com
sudo rm /etc/nginx/sites-available/staging.olanfans.com
sudo systemctl reload nginx

# Revoke SSL certificate
sudo certbot revoke --cert-name staging.olanfans.com

# Remove image directories
rm -rf ~/prog-hub/public/deck-images-staging
rm -rf ~/prog-hub/public/banlist-images-staging
```

---

## Summary

You now have a complete staging environment that:
- ✅ Runs alongside production without conflicts
- ✅ Has its own database and data
- ✅ Uses separate Docker containers and networks
- ✅ Accessible at https://staging.olanfans.com
- ✅ Can be deployed via GitHub Actions or manually
- ✅ Isolated from production for safe testing
- ✅ Discord notifications disabled to avoid noise

**Workflow:**
1. Make changes on local machine
2. Push to `staging` branch → Auto-deploys to staging
3. Test on https://staging.olanfans.com
4. Merge to `main` branch → Auto-deploys to production
