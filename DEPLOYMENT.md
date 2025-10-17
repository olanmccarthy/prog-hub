# Deployment Guide: EC2 + Docker + systemd

This guide covers deploying the prog-hub application to AWS EC2 with Docker Compose managed by systemd for automatic restarts and boot startup.

## Prerequisites

- AWS EC2 instance running Ubuntu 22.04 or Amazon Linux 2023
- SSH access to your EC2 instance
- Domain name pointed to your EC2 instance's public IP
- Security group allowing ports 22 (SSH), 80 (HTTP), and 443 (HTTPS)

## Step 1: Prepare Your EC2 Instance

### 1.1 Connect to EC2
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
# Or for Amazon Linux:
# ssh -i your-key.pem ec2-user@your-ec2-ip
```

### 1.2 Update System Packages
```bash
sudo apt update && sudo apt upgrade -y
# For Amazon Linux:
# sudo yum update -y
```

### 1.3 Install Docker
```bash
# For Ubuntu:
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker

# For Amazon Linux:
# sudo yum install -y docker
# sudo systemctl start docker
# sudo systemctl enable docker
# sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
# sudo chmod +x /usr/local/bin/docker-compose
```

### 1.4 Add Your User to Docker Group
```bash
sudo usermod -aG docker $USER
# Log out and back in for this to take effect
exit
# SSH back in
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### 1.5 Install Git
```bash
sudo apt install -y git
# For Amazon Linux:
# sudo yum install -y git
```

## Step 2: Deploy Your Application

### 2.1 Clone Your Repository
```bash
cd /home/ubuntu
git clone https://github.com/yourusername/prog-hub.git
# Or if using a different method, upload your files via SCP:
# scp -i your-key.pem -r /path/to/prog-hub ubuntu@your-ec2-ip:/home/ubuntu/
```

### 2.2 Navigate to Project Directory
```bash
cd prog-hub
```

### 2.3 Set Up Production Environment Variables

Create a `.env.production` file (if not already present):
```bash
nano .env.production
```

Add the following (update values as needed):
```env
# Database Configuration
DB_HOST=db
DB_PORT=3306
DB_USER=appuser
DB_PASSWORD=YOUR_SECURE_PASSWORD_HERE
DB_NAME=appdb

# Node Environment
NODE_ENV=production

# Next.js Configuration (optional)
NEXT_PUBLIC_API_URL=https://yourdomain.com
```

**Important**: Change `DB_PASSWORD` to a strong, secure password!

### 2.4 Update docker-compose.yml for Production

Ensure your `docker-compose.yml` uses the production environment file:
```bash
nano docker-compose.yml
```

Verify it looks like this:
```yaml
services:
  db:
    image: mysql:8.0
    container_name: mysql_db_prod
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./schema.sql:/docker-entrypoint-initdb.d/schema.sql
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: next_app_prod
    restart: unless-stopped
    ports:
      - "3000:3000"
    depends_on:
      db:
        condition: service_healthy
    env_file:
      - .env.production
    networks:
      - app-network

volumes:
  mysql_data:

networks:
  app-network:
    driver: bridge
```

### 2.5 Test the Build
```bash
docker compose build
docker compose up -d
```

Check if containers are running:
```bash
docker compose ps
```

Check logs:
```bash
docker compose logs -f
```

If everything works, stop the containers:
```bash
docker compose down
```

## Step 3: Set Up systemd Service

### 3.1 Create systemd Service File
```bash
sudo nano /etc/systemd/system/prog-hub.service
```

Add the following content:
```ini
[Unit]
Description=Prog-Hub Docker Compose Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ubuntu/prog-hub
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

**Note**: If you're using Amazon Linux or older Docker Compose (standalone), change:
- `/usr/bin/docker compose` to `/usr/local/bin/docker-compose`

### 3.2 Enable and Start the Service
```bash
# Reload systemd to recognize new service
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable prog-hub.service

# Start the service
sudo systemctl start prog-hub.service

# Check status
sudo systemctl status prog-hub.service
```

### 3.3 Verify Deployment
```bash
# Check if containers are running
docker compose ps

# Check application logs
docker compose logs -f app

# Test the application
curl http://localhost:3000
```

## Step 4: Set Up Nginx Reverse Proxy (Recommended)

### 4.1 Install Nginx
```bash
sudo apt install -y nginx
# For Amazon Linux:
# sudo yum install -y nginx
```

### 4.2 Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/prog-hub
```

Add the following:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

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

### 4.3 Enable the Site
```bash
# For Ubuntu:
sudo ln -s /etc/nginx/sites-available/prog-hub /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remove default site

# For Amazon Linux (no sites-enabled directory):
# Edit /etc/nginx/nginx.conf and add the server block directly

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## Step 5: Set Up SSL with Let's Encrypt (Optional but Recommended)

### 5.1 Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
# For Amazon Linux:
# sudo yum install -y certbot python3-certbot-nginx
```

### 5.2 Obtain SSL Certificate
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts. Certbot will automatically update your Nginx configuration.

### 5.3 Test Auto-Renewal
```bash
sudo certbot renew --dry-run
```

## Step 6: Maintenance Commands

### Managing the Service
```bash
# Start service
sudo systemctl start prog-hub.service

# Stop service
sudo systemctl stop prog-hub.service

# Restart service
sudo systemctl restart prog-hub.service

# Check status
sudo systemctl status prog-hub.service

# View logs
sudo journalctl -u prog-hub.service -f
```

### Managing Docker Containers
```bash
cd /home/ubuntu/prog-hub

# View container status
docker compose ps

# View logs
docker compose logs -f

# Rebuild and restart
docker compose down
docker compose build
docker compose up -d
```

### Updating Your Application
```bash
cd /home/ubuntu/prog-hub

# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose down
docker compose build --no-cache
docker compose up -d

# Or use systemd:
# sudo systemctl restart prog-hub.service
```

### Database Backup
```bash
# Create backup
docker exec mysql_db_prod mysqldump -u appuser -p appdb > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker exec -i mysql_db_prod mysql -u appuser -p appdb < backup_file.sql
```

## Troubleshooting

### Service Won't Start
```bash
# Check service status
sudo systemctl status prog-hub.service

# Check journal logs
sudo journalctl -u prog-hub.service -n 50

# Check Docker logs
cd /home/ubuntu/prog-hub
docker compose logs
```

### Application Not Accessible
```bash
# Check if containers are running
docker compose ps

# Check if port 3000 is listening
sudo netstat -tlnp | grep 3000

# Check Nginx status
sudo systemctl status nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Database Connection Issues
```bash
# Check if MySQL is healthy
docker compose ps

# Check database logs
docker compose logs db

# Test database connection
docker exec -it mysql_db_prod mysql -u appuser -p
```

### Out of Disk Space
```bash
# Check disk usage
df -h

# Clean up Docker resources
docker system prune -a --volumes

# Remove old images
docker image prune -a
```

## Security Recommendations

1. **Change default passwords**: Update `DB_PASSWORD` in `.env.production`
2. **Set up firewall**: Use `ufw` (Ubuntu) or Security Groups to restrict access
   ```bash
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```
3. **Keep system updated**: Run `sudo apt update && sudo apt upgrade` regularly
4. **Use SSH keys only**: Disable password authentication in `/etc/ssh/sshd_config`
5. **Set up automated backups**: Use cron jobs for database backups
6. **Monitor logs**: Set up log rotation and monitoring

## Performance Tips

1. **Increase EC2 instance size** if needed (t3.small or t3.medium for better performance)
2. **Enable swap** if running on a small instance:
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```
3. **Use Docker BuildKit** for faster builds (already enabled in modern Docker)
4. **Consider RDS** for the database if scaling beyond one instance

## Support

If you encounter issues:
1. Check logs: `docker compose logs -f`
2. Check systemd status: `sudo systemctl status prog-hub.service`
3. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
4. Verify environment variables in `.env.production`
