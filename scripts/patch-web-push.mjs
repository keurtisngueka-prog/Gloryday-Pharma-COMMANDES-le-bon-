import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const target = new URL('../node_modules/web-push/src/web-push-lib.js', import.meta.url);
const filePath = fileURLToPath(target);
let source;

try {
  source = await readFile(filePath, 'utf8');
} catch (error) {
  if (error?.code === 'ENOENT') {
    console.log('web-push is not installed; skipping its URL compatibility patch.');
    process.exit(0);
  }
  throw error;
}

function replaceExactlyOnce(legacy, replacement) {
  const occurrences = source.split(legacy).length - 1;
  if (occurrences === 1) {
    source = source.replace(legacy, replacement);
    return;
  }
  if (occurrences === 0 && source.includes(replacement)) return;
  throw new Error(`Unexpected web-push source: expected one occurrence of ${legacy}`);
}

replaceExactlyOnce("const url = require('url');\n", '');
replaceExactlyOnce('url.parse(subscription.endpoint)', 'new URL(subscription.endpoint)');
replaceExactlyOnce('url.parse(requestDetails.endpoint)', 'new URL(requestDetails.endpoint)');
replaceExactlyOnce('httpsOptions.port = urlParts.port;', 'httpsOptions.port = urlParts.port || undefined;');
replaceExactlyOnce('httpsOptions.path = urlParts.path;', 'httpsOptions.path = urlParts.pathname + urlParts.search;');

await writeFile(filePath, source);
console.log('Applied the web-push WHATWG URL compatibility patch.');
