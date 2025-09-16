const fs = require('fs');
const path = require('path');

console.log('🔐 Kabini.ai Authentication Setup Test');
console.log('=====================================');
console.log('');

// Test 1: Check if .env files exist
console.log('1. Environment File Check');
console.log('-------------------------');

const frontendEnvPath = path.join(__dirname, '.env');
const backendEnvPath = path.join(__dirname, 'backend', '.env');

if (fs.existsSync(frontendEnvPath)) {
    console.log('✅ Frontend .env file exists');
    
    // Check if it has placeholder values
    const frontendEnv = fs.readFileSync(frontendEnvPath, 'utf8');
    if (frontendEnv.includes('your_google_client_id_here') || 
        frontendEnv.includes('your_azure_client_id_here')) {
        console.log('⚠️  Frontend .env contains placeholder values - needs configuration');
    } else {
        console.log('✅ Frontend .env appears to be configured');
    }
} else {
    console.log('❌ Frontend .env file missing - run setup-auth.bat or setup-auth.ps1');
}

if (fs.existsSync(backendEnvPath)) {
    console.log('✅ Backend .env file exists');
    
    // Check if it has placeholder values
    const backendEnv = fs.readFileSync(backendEnvPath, 'utf8');
    if (backendEnv.includes('your-super-secret-jwt-key-change-this-in-production') ||
        backendEnv.includes('your_google_client_id_here') ||
        backendEnv.includes('your_azure_client_id_here')) {
        console.log('⚠️  Backend .env contains placeholder values - needs configuration');
    } else {
        console.log('✅ Backend .env appears to be configured');
    }
} else {
    console.log('❌ Backend .env file missing - run setup-auth.bat or setup-auth.ps1');
}

console.log('');

// Test 2: Check required environment variables
console.log('2. Required Environment Variables');
console.log('--------------------------------');

const requiredFrontendVars = [
    'VITE_REACT_APP_API_URL',
    'VITE_REACT_APP_GOOGLE_CLIENT_ID',
    'VITE_REACT_APP_AZURE_CLIENT_ID',
    'VITE_REACT_APP_AZURE_TENANT_ID'
];

const requiredBackendVars = [
    'JWT_SECRET',
    'DB_HOST',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD'
];

console.log('Frontend variables:');
requiredFrontendVars.forEach(varName => {
    if (process.env[varName]) {
        console.log(`  ✅ ${varName} is set`);
    } else {
        console.log(`  ❌ ${varName} is not set`);
    }
});

console.log('');
console.log('Backend variables:');
requiredBackendVars.forEach(varName => {
    if (process.env[varName]) {
        console.log(`  ✅ ${varName} is set`);
    } else {
        console.log(`  ❌ ${varName} is not set`);
    }
});

console.log('');

// Test 3: Check if database is accessible
console.log('3. Database Connection Test');
console.log('----------------------------');

// This would require actual database connection
console.log('ℹ️  Database connection test requires running backend');
console.log('   Run: cd backend && npm start');
console.log('   Then check logs for database connection status');

console.log('');

// Test 4: Check if ports are available
console.log('4. Port Availability Check');
console.log('---------------------------');

const net = require('net');

function testPort(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.listen(port, () => {
            server.close();
            resolve(true);
        });
        server.on('error', () => {
            resolve(false);
        });
    });
}

async function checkPorts() {
    const ports = [
        { port: 5000, service: 'Backend API' },
        { port: 5173, service: 'Frontend Dev Server' }
    ];

    for (const { port, service } of ports) {
        const isAvailable = await testPort(port);
        if (isAvailable) {
            console.log(`✅ Port ${port} (${service}) is available`);
        } else {
            console.log(`❌ Port ${port} (${service}) is in use`);
        }
    }
}

checkPorts().then(() => {
    console.log('');
    console.log('5. Next Steps');
    console.log('--------------');
    console.log('');
    
    if (!fs.existsSync(frontendEnvPath) || !fs.existsSync(backendEnvPath)) {
        console.log('1. Run the setup script:');
        console.log('   Windows: setup-auth.bat');
        console.log('   PowerShell: .\\setup-auth.ps1');
        console.log('');
    }
    
    console.log('2. Configure your environment variables:');
    console.log('   - Google OAuth Client ID');
    console.log('   - Azure AD Client ID and Tenant ID');
    console.log('   - JWT Secret (generate a secure random string)');
    console.log('');
    
    console.log('3. Set up your database:');
    console.log('   - Ensure PostgreSQL is running');
    console.log('   - Create database: kabini_ai');
    console.log('   - Run: backend\\setup-postgresql.bat');
    console.log('');
    
    console.log('4. Start the application:');
    console.log('   Frontend: npm run dev');
    console.log('   Backend: cd backend && npm start');
    console.log('');
    
    console.log('5. Test authentication:');
    console.log('   - Try local login first');
    console.log('   - Then test OAuth providers');
    console.log('');
    
    console.log('📖 For detailed troubleshooting, see: AUTHENTICATION_TROUBLESHOOTING.md');
    console.log('');
    console.log('=====================================');
});
