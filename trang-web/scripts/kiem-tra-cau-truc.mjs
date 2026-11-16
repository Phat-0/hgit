import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const src=fileURLToPath(new URL('../src/',import.meta.url));
async function walk(dir) {
  const result=[];
  for(const entry of await readdir(dir,{withFileTypes:true})) {
    const p=path.join(dir,entry.name);
    if(entry.isDirectory())result.push(...await walk(p)); else result.push(p);
  }
  return result;
}
const exists=async p=>stat(p).then(s=>s.isFile()).catch(()=>false);
const errors=[]; let imports=0;
for(const file of await walk(src)) {
  if(!/\.(tsx?|css)$/.test(file))continue;
  const rel=path.relative(src,file).replaceAll(path.sep,'/');
  const text=await readFile(file,'utf8');
  const pattern=/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*|@import\s*)(['"])(\.[^'"\n]+)\1/g;
  for(const match of text.matchAll(pattern)) {
    imports++;
    const target=path.resolve(path.dirname(file),match[2]);
    const candidates=[target,target.replace(/\.js$/,'.ts'),target.replace(/\.js$/,'.tsx'),target+'.ts',target+'.tsx'];
    const found=(await Promise.all(candidates.map(exists))).findIndex(Boolean);
    if(found<0) { errors.push(`${rel}: không tìm thấy ${match[2]}`);continue; }
    const to=path.relative(src,candidates[found]).replaceAll(path.sep,'/');
    if(rel.startsWith('khach/')&&to.startsWith('quan-tri/'))errors.push(`${rel}: trang khách phụ thuộc quản trị ${to}`);
    if(rel.startsWith('quan-tri/')&&to.startsWith('khach/'))errors.push(`${rel}: quản trị phụ thuộc trang khách ${to}`);
    if(rel.startsWith('dung-chung/')&&/^(khach|quan-tri)\//.test(to))errors.push(`${rel}: phần dùng chung phụ thuộc trang ${to}`);
  }
}
for(const file of await readdir(src,{withFileTypes:true})) {
  if(file.isFile()&&!['main.tsx','vite-env.d.ts','README.md'].includes(file.name))errors.push(`Tệp nghiệp vụ còn ở gốc src: ${file.name}`);
}
if(errors.length) { console.error(errors.join('\n')); process.exitCode=1; }
else console.log(`PASS cấu trúc: ${imports} import nội bộ hợp lệ; quản trị, khách và dùng chung không phụ thuộc ngược`);
