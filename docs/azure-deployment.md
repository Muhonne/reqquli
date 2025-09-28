# Azure Deployment Guide for Reqquli

## Prerequisites
- Azure subscription
- Azure CLI installed (`az --version`)
- Node.js 22+ installed locally
- Git repository configured

## Development Setup (Free/Low Cost)

### 1. Create Development Resources

```bash
# Configuration Variables
LOCATION="northeurope"
RESOURCE_GROUP="reqquli-dev-rg"
APP_NAME="reqquli-dev"  # Must be globally unique
PLAN="reqquli-dev-plan"
DB_SERVER="reqquli-dev-db"  # Must be globally unique
DB_NAME="reqquli_db"
DB_USER="reqquli_admin"
DB_PASSWORD="" # Generate with: openssl rand -base64 16

# Create Resource Group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create FREE App Service Plan (F1 tier - $0/month)
az appservice plan create \
  --resource-group $RESOURCE_GROUP \
  --name $PLAN \
  --sku F1 \
  --is-linux

# Create Web App with Node.js runtime
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $PLAN \
  --name $APP_NAME \
  --runtime "NODE:22-lts"

# Create PostgreSQL Flexible Server (Burstable B1ms - cheapest option ~$15/month)
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER \
  --admin-user $DB_USER \
  --admin-password $DB_PASSWORD \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 15 \
  --storage-size 32 \
  --public-access 0.0.0.0

# Create Database
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER \
  --database-name $DB_NAME

# Note: Database schema and seed data will be automatically initialized
# on first application startup (see Database Initialization section below)

# Configure firewall rule for Azure services and development
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER \
  --rule-name AllowAllAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Optional: Add your local IP for direct database access
MY_IP=$(curl -s ifconfig.me)
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER \
  --rule-name AllowMyIP \
  --start-ip-address $MY_IP \
  --end-ip-address $MY_IP
```

### Important Development Limitations (F1 Free Tier)
- **60 CPU minutes/day** - App will stop after quota
- **1 GB RAM**
- **1 GB storage**
- **No custom domains**
- **No Always On** - App sleeps after 20 min of inactivity
- **No SSL certificates for custom domains**

### Alternative: Shared Tier (D1 - ~$10/month)
If you need more resources but still want low cost:

```bash
# Create Shared App Service Plan (D1 tier - ~$10/month)
az appservice plan create \
  --resource-group $RESOURCE_GROUP \
  --name $PLAN \
  --sku D1 \
  --is-linux
```

## Production Setup

### 1. Create Production Resources

```bash
# Configuration Variables
LOCATION="northeurope"
RESOURCE_GROUP="reqquli-prod-rg"
APP_NAME="reqquli-app"  # Must be globally unique
PLAN="reqquli-plan"
DB_SERVER="reqquli-dbserver"  # Must be globally unique
DB_NAME="reqquli_db"
DB_USER="reqquli_admin"
DB_PASSWORD="" # Generate secure password (letters, numbers, and underscores only)

# Create Resource Group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create App Service Plan (Linux, B1 tier - ~$55/month)
az appservice plan create \
  --resource-group $RESOURCE_GROUP \
  --name $PLAN \
  --sku B1 \
  --is-linux

# Create Web App with Node.js runtime
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $PLAN \
  --name $APP_NAME \
  --runtime "NODE:22-lts"

# Create PostgreSQL Flexible Server (General Purpose - ~$50/month)
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER \
  --admin-user $DB_USER \
  --admin-password $DB_PASSWORD \
  --sku-name Standard_D2ds_v4 \
  --tier GeneralPurpose \
  --version 15 \
  --storage-size 128 \
  --high-availability ZoneRedundant \
  --public-access 0.0.0.0

# Create Database
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER \
  --database-name $DB_NAME

# Configure firewall rule for Azure services
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### 2. Configure Application Settings

```bash
# Generate secure JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Set environment variables (adjust NODE_ENV based on setup)
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    JWT_SECRET="$JWT_SECRET" \
    DB_HOST="$DB_SERVER.postgres.database.azure.com" \
    DB_PORT=5432 \
    DB_USER="$DB_USER" \
    DB_PASSWORD="$DB_PASSWORD" \
    DB_NAME="$DB_NAME" \
    DB_ALLOW_SELF_SIGNED=true \
    CLIENT_URL="https://$APP_NAME.azurewebsites.net" \
    COOKIE_DOMAIN=".azurewebsites.net"

# Configure startup command
az webapp config set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --startup-file "node dist/server/server/server.js"

# Enable WebSockets (if needed for real-time features)
az webapp config set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --web-sockets-enabled true

# Set Node.js version
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings WEBSITE_NODE_DEFAULT_VERSION="~22"
```

### 3. Build and Deploy

```bash
# Clean previous builds
rm -rf dist node_modules
rm -f deploy.zip

# Install dependencies and build
npm install
npm run build

# Create deployment package (include scripts for auto-initialization)
zip -r deploy.zip \
  dist \
  node_modules \
  package*.json \
  scripts/*.sql \
  .env.example

# Deploy to Azure
az webapp deploy \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --src-path deploy.zip \
  --type zip \
  --async false

# Restart the app
az webapp restart \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP
```

### 4. Verify Deployment

```bash
# Check application logs
az webapp log tail \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP

# Test health endpoint
curl https://$APP_NAME.azurewebsites.net/api/health

# Check deployment status
az webapp show \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query state -o tsv
```

## GitHub Actions CI/CD Setup

### 1. Download Publish Profile
```bash
# Download publish profile
az webapp deployment list-publishing-profiles \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --xml > publish-profile.xml
```

### 2. Add GitHub Secrets
Add the following secrets to your GitHub repository:
- `AZURE_WEBAPP_PUBLISH_PROFILE`: Content of publish-profile.xml
- `AZURE_WEBAPP_NAME`: Your app name (e.g., reqquli-app)

### 3. Create GitHub Actions Workflow

Create `.github/workflows/azure-deploy.yml`:

```yaml
name: Deploy to Azure

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Create deployment package
        run: |
          zip -r deploy.zip dist node_modules package*.json .env.example

      - name: Deploy to Azure
        uses: azure/webapps-deploy@v2
        with:
          app-name: ${{ secrets.AZURE_WEBAPP_NAME }}
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: deploy.zip
```

## Database Initialization

### Automatic Initialization (Recommended)

The application now includes automatic database initialization. On first startup:
1. Checks if database schema exists
2. If missing, automatically runs:
   - `scripts/database-setup.sql` - Creates all tables, indexes, and triggers
   - `scripts/seed-data.sql` - Loads demo data including admin user
3. Verifies initialization succeeded

This happens automatically when the application starts, no manual steps required.

### Manual Initialization (Optional)

If you prefer to initialize manually or need to reset the database:

```bash
# Connect to database and run scripts manually
psql -h $DB_SERVER.postgres.database.azure.com \
  -U $DB_USER \
  -d $DB_NAME \
  -f scripts/database-setup.sql

psql -h $DB_SERVER.postgres.database.azure.com \
  -U $DB_USER \
  -d $DB_NAME \
  -f scripts/seed-data.sql
```

### Verify Initialization

```bash
# Check application logs for initialization status
az webapp log tail \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --filter "Database"

# Look for messages like:
# "✅ Database schema already exists" (if previously initialized)
# "🎉 Database initialization completed successfully!" (if newly initialized)
```

## SSL/TLS Configuration

Azure App Service provides automatic SSL/TLS certificates for `*.azurewebsites.net` domains.

For custom domains:
```bash
# Add custom domain
az webapp config hostname add \
  --webapp-name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --hostname www.yourdomain.com

# Create managed certificate
az webapp config ssl create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --hostname www.yourdomain.com

# Bind SSL certificate
az webapp config ssl bind \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --certificate-thumbprint <thumbprint> \
  --ssl-type SNI
```

## Monitoring and Diagnostics

```bash
# Enable application logging
az webapp log config \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --application-logging filesystem \
  --level information

# Stream logs in real-time
az webapp log tail \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP

# Download logs
az webapp log download \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --log-file logs.zip
```

## Cost Optimization

### Estimated Monthly Costs

#### Development Setup
- App Service (F1): **$0/month**
- PostgreSQL (B1ms): ~$15/month
- **Total**: ~$15/month

#### Production Setup
- App Service (B1): ~$55/month
- PostgreSQL (D2ds_v4): ~$50/month
- **Total**: ~$105/month

### Cost-Saving Tips for Development
1. **Use F1 Free tier** for the App Service (limited to 60 CPU minutes/day)
2. **Stop the database** when not in use:
```bash
# Stop database to save costs
az postgres flexible-server stop \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER

# Start database when needed
az postgres flexible-server start \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER
```

3. **Delete resources** when not needed:
```bash
# Delete the entire resource group when done developing
az group delete \
  --name $RESOURCE_GROUP \
  --yes
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
```bash
# Verify connection string
az webapp config appsettings list \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "[?name=='DB_HOST' || name=='DB_PORT' || name=='DB_NAME'].{name:name, value:value}" -o table

# Check firewall rules
az postgres flexible-server firewall-rule list \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER -o table
```

2. **Application Won't Start**
```bash
# Check startup logs
az webapp log tail \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --filter Error

# Verify Node.js version
az webapp config appsettings list \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "[?name=='WEBSITE_NODE_DEFAULT_VERSION'].value" -o tsv
```

3. **JWT Secret Not Set**
```bash
# Regenerate and set JWT secret
JWT_SECRET=$(openssl rand -base64 32)
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings JWT_SECRET="$JWT_SECRET"
```

## Security Best Practices

1. **Enable Azure AD Authentication** (optional)
```bash
az webapp auth update \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --enabled true \
  --action LoginWithAzureActiveDirectory
```

2. **Restrict Database Access**
```bash
# Remove public access after setup
az postgres flexible-server firewall-rule delete \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER \
  --rule-name AllowAll --yes

# Use Private Endpoints for production
az network private-endpoint create \
  --name $DB_SERVER-pe \
  --resource-group $RESOURCE_GROUP \
  --vnet-name reqquli-vnet \
  --subnet database-subnet \
  --connection-name $DB_SERVER-connection \
  --private-connection-resource-id $(az postgres flexible-server show -g $RESOURCE_GROUP -n $DB_SERVER --query id -o tsv)
```

3. **Enable Backup**
```bash
# Configure automated backups (included by default)
az postgres flexible-server show \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER \
  --query backup -o table
```

## Clean Up Resources

```bash
# Delete entire resource group (WARNING: This deletes everything!)
az group delete \
  --name $RESOURCE_GROUP \
  --yes \
  --no-wait
```

## Support and Documentation

- [Azure App Service Documentation](https://docs.microsoft.com/azure/app-service/)
- [Azure Database for PostgreSQL](https://docs.microsoft.com/azure/postgresql/)
- [Azure CLI Reference](https://docs.microsoft.com/cli/azure/)
- [Reqquli Repository](https://github.com/your-org/reqquli)

## Notes

- Database schema and demo data are auto-initialized on first application start
- Default admin credentials after initialization: `admin@reqquli.com` / `reqquli_admin`
- SSL/TLS is required for Azure PostgreSQL connections
- Application logs are stored in `/home/LogFiles/` on the App Service
- Default timeout for App Service is 230 seconds
- WebSockets support is enabled for real-time features
- Scripts folder must be included in deployment package for auto-initialization to work