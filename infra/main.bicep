// Skinny Bicep for the storefront. Wires Container App + managed Postgres.
// Real environment variables come from Key Vault references — never inline secrets.

@description('Resource location')
param location string = resourceGroup().location

@description('Environment name (e.g., dev, staging, prod)')
@allowed([ 'dev', 'staging', 'prod' ])
param env string = 'dev'

@description('Container image (built by CI)')
param image string

var prefix = 'zava-storefront-${env}'

resource law 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${prefix}-law'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

resource caEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${prefix}-env'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: law.properties.customerId
        sharedKey: law.listKeys().primarySharedKey
      }
    }
  }
}

resource app 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${prefix}-app'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    managedEnvironmentId: caEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
        allowInsecure: false
      }
    }
    template: {
      containers: [
        {
          name: 'storefront'
          image: image
          resources: { cpu: json('0.5'), memory: '1Gi' }
          env: [
            { name: 'NODE_ENV', value: 'production' }
            // DATABASE_URL injected via Key Vault reference at deploy time
          ]
        }
      ]
      scale: { minReplicas: 1, maxReplicas: 5 }
    }
  }
}

output appUrl string = 'https://${app.properties.configuration.ingress.fqdn}'
