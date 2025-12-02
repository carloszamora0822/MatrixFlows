const fs = require('fs');
const path = require('path');

const environments = {
  development: {
    MONGODB_URI: 'mongodb://localhost:27017/vbt-vestaboard-dev',
    JWT_SECRET: 'dev-jwt-secret-change-in-production',
    NODE_ENV: 'development',
    FRONTEND_URL: 'http://localhost:3000',
    OPENWEATHER_API_KEY: 'your-dev-api-key',
    OPENWEATHER_LOCATION: 'Bentonville,US',
    VESTABOARD_API_KEY: 'your-test-key',
    CRON_SECRET: 'dev-cron-secret',
    ORG_ID: 'VBT',
    ORG_NAME: 'VBT'
  },
  production: {
    MONGODB_URI: 'mongodb+srv://username:password@cluster.mongodb.net/vbt-vestaboard-prod',
    JWT_SECRET: 'CHANGE-THIS-IN-PRODUCTION',
    NODE_ENV: 'production',
    FRONTEND_URL: 'https://your-domain.vercel.app',
    OPENWEATHER_API_KEY: 'your-prod-api-key',
    OPENWEATHER_LOCATION: 'Bentonville,US',
    VESTABOARD_API_KEY: 'your-prod-key',
    CRON_SECRET: 'CHANGE-THIS-IN-PRODUCTION',
    ORG_ID: 'VBT',
    ORG_NAME: 'VBT'
  }
};

const createEnvFile = (env) => {
  const config = environments[env];
  if (!config) {
    console.error(`❌ Unknown environment: ${env}`);
    console.log('Available environments: development, production');
    process.exit(1);
  }

  const envContent = Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const filename = env === 'development' ? '.env.local' : `.env.${env}`;
  const filepath = path.join(process.cwd(), filename);
  
  fs.writeFileSync(filepath, envContent);
  console.log(`✅ Created ${filename}`);
  
  if (env === 'development') {
    console.log('\n📝 Next steps:');
    console.log('1. Edit .env.local with your actual API keys');
    console.log('2. Set up your MongoDB database');
    console.log('3. Run: npm run install:all');
    console.log('4. Run: npm run dev');
  }
};

const env = process.argv[2] || 'development';
createEnvFile(env);
