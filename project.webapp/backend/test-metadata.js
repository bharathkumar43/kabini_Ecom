const { extractPublishDate, generateMetadata } = require('./metadataExtractor');

// Test with a real HTML that should have publish dates
const testHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta property="article:published_time" content="2024-01-15T10:30:00Z">
    <meta name="publish_date" content="2024-01-15">
    <title>Test Article</title>
</head>
<body>
    <article>
        <h1>Test Article</h1>
        <p>Published on January 15, 2024</p>
        <p>This is a test article to check publish date extraction.</p>
    </article>
</body>
</html>
`;

const testContent = `
Test Article

Published on January 15, 2024

This is a test article to check publish date extraction.
`;

console.log('=== Testing Publish Date Extraction ===');
console.log('1. Testing extractPublishDate:');
const extractedDate = extractPublishDate(testHtml, testContent);
console.log('   - Extracted Date:', extractedDate);
console.log('   - Expected: 2024-01-15');
console.log('   - Match:', extractedDate === '2024-01-15' ? '✅ PASS' : '❌ FAIL');

console.log('\n2. Testing generateMetadata:');
const metadata = generateMetadata(testHtml, testContent, 'Test Article', 'Test description');
console.log('   - Publish Date:', metadata.publishDate);
console.log('   - Expected: 2024-01-15');
console.log('   - Match:', metadata.publishDate === '2024-01-15' ? '✅ PASS' : '❌ FAIL');

console.log('\n3. Testing with HTML that has no dates:');
const noDateHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>No Date Article</title>
</head>
<body>
    <h1>No Date Article</h1>
    <p>This article has no publish date information.</p>
</body>
</html>
`;

const noDateContent = `
No Date Article

This article has no publish date information.
`;

const noDateMetadata = generateMetadata(noDateHtml, noDateContent, 'No Date Article', 'No date description');
console.log('   - Publish Date (should be current date):', noDateMetadata.publishDate);
console.log('   - Current date:', new Date().toISOString().split('T')[0]);
console.log('   - Match:', noDateMetadata.publishDate === new Date().toISOString().split('T')[0] ? '✅ PASS' : '❌ FAIL');

console.log('\n=== Test Complete ===');
