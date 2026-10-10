import fs from 'fs';
import path from 'path';

// Pure JS PNG reader/writer to make outer background transparent
// PNG parsing using basic node Buffer
const logoPath = 'd:/Manpower management/public/logo.png';
const buf = fs.readFileSync(logoPath);
console.log('Logo file size:', buf.length, 'bytes');
