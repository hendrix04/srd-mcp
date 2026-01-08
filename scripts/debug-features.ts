import { marked } from "marked";

const content = await Deno.readTextFile('srd_reference/normalized/DND5eSRD_047-063.md');
const tokens = marked.lexer(content);

console.log("Looking for Fighter features...\n");

let count = 0;
let inFighter = false;

for (const token of tokens) {
  if (token.type === 'heading' && token.depth === 2) {
    if (token.text === 'Fighter') {
      inFighter = true;
      console.log("Found Fighter section");
    } else if (inFighter) {
      console.log(`\nLeft Fighter section at: ${token.text}`);
      break;
    }
  }

  if (inFighter && token.type === 'heading' && token.depth === 3) {
    if (token.text.includes('Level')) {
      count++;
      console.log(`${count}. ${token.text}`);
    }
  }
}

console.log(`\nTotal Fighter h3 Level headings: ${count}`);
