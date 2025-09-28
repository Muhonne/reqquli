# Azure Deployment Guide

## Prerequisites
- Azure subscription
- Azure CLI installed
- Node.js 22+

## 1. Create Azure Resources

```bash
# Configuration
LOCATION="northeurope"
RESOURCE_GROUP="reqquli-rg"
APP_NAME="reqquli-app"  # Must be globally unique
DB_SERVER="reqquli-db"  # Must be globally unique
DB_NAME="reqquli_db"
DB_USER="reqquli_admin"
DB_PASSWORD="$(openssl rand -base64 16)"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create App Service Plan (B1 tier)
az appservice plan create \
  --resource-group $RESOURCE_GROUP \
  --name reqquli-plan \
  --sku B1 \
  --is-linux

# Create Web App
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan reqquli-plan \
  --name $APP_NAME \
  --runtime "NODE:22-lts"

# Create PostgreSQL server
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

# Create database
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER \
  --database-name $DB_NAME

# Enable uuid-ossp extension (required for our schema)
az postgres flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER \
  --name azure.extensions \
  --value uuid-ossp

# Allow Azure services to connect
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

## 2. Configure App Settings

```bash
# Set environment variables
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    JWT_SECRET="$(openssl rand -base64 32)" \
    DB_HOST="$DB_SERVER.postgres.database.azure.com" \
    DB_PORT=5432 \
    DB_USER="$DB_USER" \
    DB_PASSWORD="$DB_PASSWORD" \
    DB_NAME="$DB_NAME" \
    DB_ALLOW_SELF_SIGNED=true \
    CLIENT_URL="https://$APP_NAME.azurewebsites.net" \
    SCM_DO_BUILD_DURING_DEPLOYMENT=false

# Configure startup command
az webapp config set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --startup-file "node dist/server/server/server.js"

# Enable logging
az webapp log config \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --application-logging filesystem \
  --level information \
  --web-server-logging filesystem
```

## 3. Build & Deploy

```bash
# Build
rm -rf dist node_modules && rm deploy.zip && npm install && npm run build

# Package
zip -r deploy.zip \
  dist \
  node_modules \
  package*.json \
  scripts/*.sql \
  .deployment

# Deploy
az webapp deploy \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --src-path deploy.zip \
  --type zip

# Check logs
az webapp log tail \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP
```

## Debugging

```bash
# Enable SSH for debugging
az webapp config set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --remote-debugging-enabled true

# View current app settings (hides values)
az webapp config appsettings list \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --output table

# SSH into the container
az webapp ssh \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP

# Once in SSH, check:
# - node --version
# - ls -la
# - cat .deployment
# - npm start (to see startup errors)
```

## Notes
- Database auto-initializes on first startup
- Default admin: `admin@reqquli.com` / `reqquli_admin`
- App URL: `https://$APP_NAME.azurewebsites.net`
- Costs: ~$70/month (App Service B1 + PostgreSQL B1ms)

## Cleanup

```bash
az group delete --name $RESOURCE_GROUP --yes
```