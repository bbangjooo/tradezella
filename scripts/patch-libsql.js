// Patch @libsql/core to use a try/catch around new URL() in encodeBaseUrl
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'node_modules', '@libsql', 'core', 'lib-esm', 'uri.js');

if (!fs.existsSync(filePath)) {
  console.log('[patch-libsql] File not found, skipping:', filePath);
  process.exit(0);
}

let content = fs.readFileSync(filePath, 'utf8');

// Already patched?
if (content.includes('PATCHED_ENCODE_BASE_URL')) {
  console.log('[patch-libsql] Already patched, skipping');
  process.exit(0);
}

// Replace encodeBaseUrl to use URL constructor with error handling
const original = `return new URL(\`\${schemeText}\${authorityText}\${pathText}\`);`;
const patched = `// PATCHED_ENCODE_BASE_URL
    const urlStr = \`\${schemeText}\${authorityText}\${pathText}\`;
    try { return new URL(urlStr); } catch(e) {
      // Fallback: construct URL object manually
      try { return new URL(urlStr.replace(/^[a-z]+:/, 'https:')); } catch(e2) {
        return { href: urlStr, origin: \`\${schemeText}//\${authorityText}\`, protocol: schemeText, host: authorityText.replace('//', ''), pathname: pathText || '/', toString() { return urlStr; } };
      }
    }`;

if (content.includes(original)) {
  content = content.replace(original, patched);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[patch-libsql] Successfully patched encodeBaseUrl');
} else {
  console.log('[patch-libsql] Could not find target code to patch');
}
