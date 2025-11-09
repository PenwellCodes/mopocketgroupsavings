/**
 * Helper script to format Firebase service account JSON for .env file
 * 
 * Usage:
 * 1. Save your Firebase service account JSON to a file (e.g., firebase-key.json)
 * 2. Run: node scripts/format-firebase-key.js firebase-key.json
 * 3. Copy the output to your .env file as FIREBASE_SERVICE_ACCOUNT_KEY
 */

const fs = require('fs');
const path = require('path');

// Get the JSON file path from command line arguments
const jsonFilePath = process.argv[2];

if (!jsonFilePath) {
  console.error('Usage: node scripts/format-firebase-key.js <path-to-json-file>');
  process.exit(1);
}

try {
  // Read the JSON file
  const jsonContent = fs.readFileSync(path.resolve(jsonFilePath), 'utf8');
  
  // Parse to validate it's valid JSON
  const jsonObj = JSON.parse(jsonContent);
  
  // Convert back to string with proper escaping for .env file
  // This will escape quotes and handle newlines properly
  const formatted = JSON.stringify(jsonObj);
  
  console.log('\n✅ Formatted Firebase Service Account Key:\n');
  console.log('Add this to your .env file:');
  console.log('─────────────────────────────────────────────────────────────');
  console.log(`FIREBASE_SERVICE_ACCOUNT_KEY=${formatted}`);
  console.log('─────────────────────────────────────────────────────────────');
  console.log('\nAlso add:');
  console.log(`FIREBASE_PROJECT_ID=${jsonObj.project_id}`);
  console.log('\n');
  
} catch (error) {
  console.error('Error processing JSON file:', error.message);
  process.exit(1);
}

