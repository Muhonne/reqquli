#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files to update
const routeFiles = [
  'src/server/routes/systemRequirements.ts',
  'src/server/routes/testCases.ts',
  'src/server/routes/testRuns.ts',
  'src/server/routes/traces.ts',
  'src/server/routes/audit.ts'
];

// Ensure responses utility is imported
const addImport = (content) => {
  if (content.includes("from '../utils/responses'")) {
    return content;
  }

  // Find the last import statement
  const importRegex = /^import .* from .*$/gm;
  let lastImportIndex = 0;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    lastImportIndex = match.index + match[0].length;
  }

  const importStatement = `\nimport {
  badRequest,
  unauthorized,
  notFound,
  conflict,
  internalServerError,
  successResponse
} from '../utils/responses';`;

  return content.slice(0, lastImportIndex) + importStatement + content.slice(lastImportIndex);
};

// Replace error responses
const replaceErrorResponses = (content) => {
  // Replace 401 errors
  content = content.replace(
    /return res\.status\(401\)\.json\(\{[\s]*(?:success:\s*false,?\s*)?(?:error|message):\s*["'`]([^"'`]+)["'`][\s]*\}\)/g,
    'return unauthorized(res, "$1")'
  );

  // Replace 400 errors
  content = content.replace(
    /return res\.status\(400\)\.json\(\{[\s]*(?:success:\s*false,?\s*)?(?:error|message):\s*["'`]([^"'`]+)["'`][\s]*\}\)/g,
    'return badRequest(res, "$1")'
  );

  // Replace 404 errors
  content = content.replace(
    /return res\.status\(404\)\.json\(\{[\s]*(?:success:\s*false,?\s*)?(?:error|message):\s*["'`]([^"'`]+)["'`][\s]*\}\)/g,
    'return notFound(res, "$1")'
  );

  // Replace 409 errors
  content = content.replace(
    /return res\.status\(409\)\.json\(\{[\s]*(?:success:\s*false,?\s*)?(?:error|message):\s*["'`]([^"'`]+)["'`][\s]*\}\)/g,
    'return conflict(res, "$1")'
  );

  // Replace 500 errors
  content = content.replace(
    /(?:return )?res\.status\(500\)\.json\(\{[\s]*(?:success:\s*false,?\s*)?(?:error|message):\s*["'`]([^"'`]+)["'`][\s]*\}\)/g,
    'return internalServerError(res, "$1")'
  );

  // Replace multi-line error responses
  content = content.replace(
    /return res\s*\n?\s*\.status\((\d+)\)\s*\n?\s*\.json\(\{[\s\n]*(?:success:\s*false,?\s*\n?\s*)?(?:error|message):\s*["'`]([^"'`]+)["'`][\s\n]*\}\)/g,
    (match, status, message) => {
      switch(status) {
        case '400': return `return badRequest(res, "${message}")`;
        case '401': return `return unauthorized(res, "${message}")`;
        case '404': return `return notFound(res, "${message}")`;
        case '409': return `return conflict(res, "${message}")`;
        case '500': return `return internalServerError(res, "${message}")`;
        default: return match;
      }
    }
  );

  return content;
};

// Replace success responses
const replaceSuccessResponses = (content) => {
  // Simple success with data
  content = content.replace(
    /(?:return )?res\.json\(\{[\s]*success:\s*true,[\s]*data:\s*([^}]+)[\s]*\}\)/g,
    'return successResponse(res, $1)'
  );

  // Success with pagination
  content = content.replace(
    /(?:return )?res\.json\(\{[\s\n]*success:\s*true,[\s\n]*data:\s*([^,]+),[\s\n]*pagination:\s*(\{[^}]+\})[\s\n]*\}\)/g,
    'return successResponse(res, $1, { pagination: $2 })'
  );

  return content;
};

// Process each file
routeFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);

  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file} - file not found`);
    return;
  }

  console.log(`Processing ${file}...`);

  let content = fs.readFileSync(filePath, 'utf8');

  // Add import if needed
  content = addImport(content);

  // Replace error responses
  content = replaceErrorResponses(content);

  // Replace success responses
  content = replaceSuccessResponses(content);

  // Write back
  fs.writeFileSync(filePath, content, 'utf8');

  console.log(`✓ Updated ${file}`);
});

console.log('\nMigration complete! Please review the changes and run tests.');