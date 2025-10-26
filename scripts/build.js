const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '..');
const out = path.resolve(__dirname, '..', 'dist');

function copyRecursive(srcDir, destDir){
  if(!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for(const e of entries){
    const name = e.name;
    if(['node_modules', 'scripts', '.git', 'dist'].includes(name)) continue;
    const s = path.join(srcDir, name);
    const d = path.join(destDir, name);
    if(e.isDirectory()) copyRecursive(s,d); else fs.copyFileSync(s,d);
  }
}

if(fs.existsSync(out)) fs.rmSync(out, { recursive: true, force: true });
copyRecursive(src, out);
console.log('Built site to', out);
