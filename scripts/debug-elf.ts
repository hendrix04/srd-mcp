import { marked } from "marked";
import type { Token } from "marked";

const content = await Deno.readTextFile('srd_reference/normalized/DND5eSRD_077-086.md');
const tokens = marked.lexer(content);

let inElf = false;
let count = 0;

for (let i = 0; i < tokens.length && count < 25; i++) {
  const token = tokens[i];

  if (token.type === 'heading' && (token as any).text === 'Elf') {
    inElf = true;
    console.log('=== ELF SECTION ===');
    continue;
  }

  if (inElf) {
    console.log(`Token ${count}: ${token.type}`);
    if (token.type === 'paragraph') {
      const text = (token as any).text.substring(0, 100);
      console.log(`  Text: ${text}...`);
    } else if (token.type === 'heading') {
      console.log(`  Heading (depth ${(token as any).depth}): ${(token as any).text}`);
      if ((token as any).depth === 4) break;
    } else if (token.type === 'table') {
      console.log(`  Table: ${(token as any).header.length} cols, ${(token as any).rows.length} rows`);
    } else if (token.type === 'html') {
      console.log(`  HTML: ${(token as any).text.substring(0, 60)}`);
    }
    count++;
  }
}
