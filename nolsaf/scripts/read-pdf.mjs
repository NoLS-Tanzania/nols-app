import { PDFParse } from 'pdf-parse';
import { resolve } from 'path';
import { pathToFileURL } from 'url';

const filePath = resolve(process.argv[2] || 'scripts/pembaKaskazini.pdf');
const parser = new PDFParse({ url: pathToFileURL(filePath).href });
const result = await parser.getText();
const lines = result.text.split('\n').filter(l => l.trim());
console.log(lines.join('\n'));
