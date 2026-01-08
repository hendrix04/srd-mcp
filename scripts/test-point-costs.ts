import { marked } from "marked";
import type { Token, Tokens } from "marked";

const content = await Deno.readTextFile("srd_reference/normalized/DND5eSRD_019-035.md");
const tokens = marked.lexer(content);

let i = 0;
while (i < tokens.length) {
  const token = tokens[i];

  if (token.type === "heading") {
    const heading = token as Tokens.Heading;

    // Ability score generation methods
    if (heading.depth === 3 && heading.text === "Generate Your Scores") {
      console.log("Found 'Generate Your Scores' at index", i);
      
      // Look for table
      let j = i + 1;
      while (j < tokens.length) {
        const t = tokens[j];
        if (t.type === "heading") {
          console.log("Next heading:", (t as Tokens.Heading).text);
          break;
        }
        if (t.type === "table") {
          const table = t as Tokens.Table;
          console.log("\nFound table at index", j);
          console.log("Headers:", table.header.map(h => h.text));
          
          if (table.header[0]?.text === "Score") {
            console.log("This is the point cost table!");
            const pointCosts: Record<number, number> = {};
            
            for (const row of table.rows) {
              if (row[0] && row[1]) {
                const score = parseInt(row[0].text, 10);
                const cost = parseInt(row[1].text, 10);
                if (!isNaN(score) && !isNaN(cost)) {
                  pointCosts[score] = cost;
                }
              }
              if (row[2] && row[3]) {
                const score = parseInt(row[2].text, 10);
                const cost = parseInt(row[3].text, 10);
                if (!isNaN(score) && !isNaN(cost)) {
                  pointCosts[score] = cost;
                }
              }
            }
            
            console.log("Point costs:", pointCosts);
          }
        }
        j++;
      }
      
      break;
    }
  }

  i++;
}
