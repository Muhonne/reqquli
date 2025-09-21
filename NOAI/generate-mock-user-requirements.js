const http = require('http');

// Configuration
const API_BASE_URL = 'http://localhost:3000';
const LOGIN_CREDENTIALS = {
  email: 'test@example.com', // Using newly registered test user
  password: 'Password123!' // Test user password
};

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`Request failed: ${res.statusCode} - ${parsed.message || body}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Login function
async function login() {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  try {
    const response = await makeRequest(options, LOGIN_CREDENTIALS);
    console.log('✓ Login successful');
    return response.token;
  } catch (error) {
    console.error('✗ Login failed:', error.message);
    throw error;
  }
}

// Generate mock requirement data
function generateMockRequirement(index) {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
  
  const loremWords = ['Lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do', 
                      'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua'];
  
  // Random selection helper
  const randomWord = () => loremWords[Math.floor(Math.random() * loremWords.length)];
  const randomSentence = (length = 8) => {
    let sentence = [];
    for (let i = 0; i < length; i++) {
      sentence.push(randomWord());
    }
    return sentence.join(' ') + '.';
  };
  
  return {
    title: `Title ipsum ${dateStr} ${timeStr} - Requirement #${index}`,
    description: `Description lorem ipsum dolor sit amet ${index}, ${timeStr}.\n\n${randomSentence(12)}\n\nCreated at: ${dateStr} ${timeStr}\nIndex: ${index}\n\n${randomSentence(15)}`
  };
}

// Create a single user requirement
async function createUserRequirement(token, requirementData) {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/user-requirements',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };

  return makeRequest(options, requirementData);
}

// Approve a user requirement
async function approveUserRequirement(token, requirementId) {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/user-requirements/${requirementId}/approve`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };

  return makeRequest(options, {
    password: 'Password123!',
    approvalNotes: 'Bulk approved for testing'
  });
}

// Main function
async function main() {
  console.log('Starting mock data generation...\n');
  
  try {
    // Step 1: Login
    console.log('Step 1: Logging in...');
    const token = await login();
    
    // Step 2: Create requirements
    console.log('\nStep 2: Creating 300 mock user requirements...');
    console.log('This may take a few minutes...\n');
    
    const totalRequirements = 300;
    const batchSize = 10; // Create in batches to avoid overwhelming the server
    let created = 0;
    let approved = 0;
    let failed = 0;
    
    for (let i = 1; i <= totalRequirements; i++) {
      try {
        const mockData = generateMockRequirement(i);
        const response = await createUserRequirement(token, mockData);
        const newRequirement = response.requirement; // API returns { success: true, requirement: {...} }
        created++;
        
        // Approve every other requirement (50%)
        if (i % 2 === 0 && newRequirement) {
          try {
            await approveUserRequirement(token, newRequirement.id);
            approved++;
          } catch (approveError) {
            console.error(`\n✗ Failed to approve ${newRequirement.id}:`, approveError.message);
          }
        }
        
        // Progress indicator
        if (i % batchSize === 0) {
          const percentage = Math.round((i / totalRequirements) * 100);
          process.stdout.write(`\rProgress: ${i}/${totalRequirements} (${percentage}%) - Created: ${created}, Approved: ${approved}, Failed: ${failed}`);
        }
        
        // Small delay to avoid rate limiting
        if (i % batchSize === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        failed++;
        console.error(`\n✗ Failed to create requirement ${i}:`, error.message);
      }
    }
    
    console.log('\n\n✓ Mock data generation complete!');
    console.log(`  - Successfully created: ${created} requirements`);
    console.log(`  - Successfully approved: ${approved} requirements`);
    console.log(`  - Failed: ${failed} requirements`);
    
  } catch (error) {
    console.error('\n✗ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();