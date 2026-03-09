const fs = require('fs');
const path = require('path');

const indexCss = fs.readFileSync('src/index.css', 'utf8');

// Extract all class definitions from index.css  
const definedClasses = new Set();
const cssRe = /\.([a-zA-Z_][\w-]*)\s*[\{,:\s]/g;
let m;
while ((m = cssRe.exec(indexCss)) !== null) {
  definedClasses.add(m[1]);
}

// Get all JSX files
function getFiles(dir) {
  let results = [];
  for (const f of fs.readdirSync(dir)) {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) results = results.concat(getFiles(fp));
    else if (f.endsWith('.jsx')) results.push(fp);
  }
  return results;
}

const files = [...getFiles('src/components'), 'src/App.jsx'];
const globalClasses = new Set();

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  // Match className='...' and className="..."
  const re = /className=[\"']([^\"']+)[\"']/g;
  while ((m = re.exec(content)) !== null) {
    // Skip if it contains styles. or { (JSX expression)
    if (m[1].includes('{') || m[1].includes('styles.')) continue;
    m[1].split(/\s+/).forEach(c => globalClasses.add(c));
  }
  // Also match className={clsx('...', ...)} patterns
  const clsxRe = /clsx\(\s*'([^']+)'/g;
  while ((m = clsxRe.exec(content)) !== null) {
    m[1].split(/\s+/).forEach(c => globalClasses.add(c));
  }
  // Also className={clsx("...", ...)}  
  const clsxRe2 = /clsx\(\s*"([^"]+)"/g;
  while ((m = clsxRe2.exec(content)) !== null) {
    m[1].split(/\s+/).forEach(c => globalClasses.add(c));
  }
}

console.log('Global classes used in JSX:', [...globalClasses].sort().join(', '));
console.log('');
const missing = [...globalClasses].filter(c => !definedClasses.has(c));
if (missing.length > 0) {
  console.log('MISSING from index.css:', missing.join(', '));
} else {
  console.log('All global classes are defined in index.css!');
}
