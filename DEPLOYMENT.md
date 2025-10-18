# Deployment Guide

This guide explains how to set up automatic deployment to EC2 using GitHub Actions.

## Prerequisites

### EC2 Instance Setup

Your EC2 instance should have:
1. **Docker and Docker Compose** installed
2. **Node.js 20+** installed (for npm scripts)
3. **Git** installed
4. The project cloned at `~/prog-hub`
5. A `.env.production` file with proper credentials

### EC2 Setup Commands

```bash
# Install Docker
sudo yum update -y
sudo yum install -y docker
sudo service docker start
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js 20
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Clone the repository
cd ~
git clone https://github.com/YOUR_USERNAME/prog-hub.git
cd prog-hub

# Create .env.production file
nano .env.production
# Add your production environment variables

# Install dependencies
npm install

# Initial deployment
npm run docker:build
npm run docker:up -d
```

## GitHub Secrets Configuration

To enable automatic deployment, configure these secrets in your GitHub repository:

### 1. Navigate to Repository Settings
- Go to your GitHub repository
- Click **Settings** → **Secrets and variables** → **Actions**
- Click **New repository secret**

### 2. Add Required Secrets

#### `EC2_SSH_PRIVATE_KEY`
- **Description**: Private SSH key to access your EC2 instance
- **How to get it**:
  ```bash
  # On your local machine, display your private key
  cat ~/.ssh/your-ec2-key.pem
  ```
- Copy the entire content (including BEGIN/END markers)
- Paste it as the secret value

#### `EC2_HOST`
- **Description**: Public IP or hostname of your EC2 instance
- **Example**: `ec2-12-34-56-78.compute-1.amazonaws.com` or `12.34.56.78`

#### `EC2_USER`
- **Description**: SSH username for your EC2 instance
- **Common values**: `ec2-user` (Amazon Linux), `ubuntu` (Ubuntu), `admin` (Debian)

## How Deployment Works

### Automatic Deployment Flow

1. **Trigger**: Push to `main` branch
2. **GitHub Actions**: Connects to EC2 via SSH and runs deployment
3. **Deployment Steps**:
   - Pull latest code from main
   - Stop running containers
   - Rebuild Docker images
   - Start containers with new code

### Manual Deployment

If you need to deploy manually:

```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@your-ec2-host

# Navigate to project
cd ~/prog-hub

# Pull latest changes
git pull origin main

# Rebuild and restart
npm run docker:down
npm run docker:build
npm run docker:up -d
```

## Monitoring Deployment

### Check GitHub Actions
- Go to your repository → **Actions** tab
- View the latest workflow run

### Check EC2 Status
```bash
# Check running containers
docker ps

# Check logs
docker logs next_app_prod
docker logs mysql_db_prod

# Follow logs
docker logs -f next_app_prod
```

## Troubleshooting

### Deployment Fails: Permission Denied
- Ensure SSH key has correct permissions (600)
- Verify key is added to GitHub secrets correctly

### Deployment Fails: Cannot Connect
- Check EC2 security group allows SSH (port 22)
- Verify EC2 instance is running
- Confirm `EC2_HOST` secret is correct

### Application Not Starting
```bash
# Check container logs
docker logs next_app_prod
docker logs mysql_db_prod

# Verify environment variables
cat .env.production

# Manually restart
npm run docker:down
npm run docker:up -d
```

## Security Best Practices

1. Never commit `.env.production` to Git
2. Rotate SSH keys periodically
3. Use security groups to restrict SSH access
4. Enable CloudWatch logging
5. Set up database backups
6. Use HTTPS with SSL/TLS certificates

## Required Environment Variables

In `.env.production` on EC2:

```bash
NODE_ENV=production
DB_HOST=db
DB_PORT=3306
DB_USER=appuser
DB_PASSWORD=YOUR_SECURE_PASSWORD
DB_NAME=appdb
DATABASE_URL="mysql://appuser:YOUR_SECURE_PASSWORD@db:3306/appdb"
NEXT_PUBLIC_API_URL=http://YOUR_EC2_HOST:3000
```

## Rollback Procedure

If deployment introduces issues:

```bash
# SSH into EC2
cd ~/prog-hub

# Revert to previous commit
git log --oneline
git reset --hard COMMIT_HASH

# Rebuild and restart
npm run docker:down
npm run docker:build
npm run docker:up -d
```
