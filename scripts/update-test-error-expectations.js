#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Find all test files
const testsDir = path.join(process.cwd(), 'tests');
const testFiles = fs.readdirSync(testsDir)
  .filter(file => file.endsWith('.test.ts'))
  .map(file => path.join('tests', file));

console.log(`Found ${testFiles.length} test files to update`);

testFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;

  // Skip auth.test.ts as it uses different format
  if (file.includes('auth.test.ts')) {
    console.log(`Skipping ${file} (auth tests use different format)`);
    return;
  }

  // Update error assertions to use new format
  // Pattern 1: expect(error.response.data.error).toContain('something')
  content = content.replace(
    /expect\(error\.response\.data\.error\)\.toContain\(/g,
    'expect(error.response.data.error.message).toContain('
  );

  // Pattern 2: expect(error.response.data.error).toBe('something')
  content = content.replace(
    /expect\(error\.response\.data\.error\)\.toBe\(/g,
    'expect(error.response.data.error.message).toBe('
  );

  // Pattern 3: expect(response.data.error).toBe('something')
  content = content.replace(
    /expect\(response\.data\.error\)\.toBe\(/g,
    'expect(response.data.error.message).toBe('
  );

  // Pattern 4: expect(response.data.error).toContain('something')
  content = content.replace(
    /expect\(response\.data\.error\)\.toContain\(/g,
    'expect(response.data.error.message).toContain('
  );

  // Check if file was modified
  if (content !== fs.readFileSync(filePath, 'utf8')) {
    updated = true;
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Updated ${file}`);
  } else {
    console.log(`- No changes needed for ${file}`);
  }
});

console.log('\nTest update complete!');