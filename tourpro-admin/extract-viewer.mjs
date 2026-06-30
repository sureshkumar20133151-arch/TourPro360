import { html, css, js } from '@playcanvas/supersplat-viewer';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');

// Make sure public directory exists
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

// Write CSS and JS
fs.writeFileSync(path.join(publicDir, 'playcanvas-viewer.css'), css);
fs.writeFileSync(path.join(publicDir, 'playcanvas-viewer.js'), js);

// Replace default index references in HTML with playcanvas-viewer names
let modifiedHtml = html
    .replace('index.css', 'playcanvas-viewer.css')
    .replace('index.js', 'playcanvas-viewer.js');

fs.writeFileSync(path.join(publicDir, 'playcanvas-viewer.html'), modifiedHtml);

console.log("PlayCanvas SuperSplat Viewer assets extracted successfully for Admin!");
console.log("playcanvas-viewer.html generated with size:", modifiedHtml.length);
console.log("playcanvas-viewer.css generated with size:", css.length);
console.log("playcanvas-viewer.js generated with size:", js.length);
