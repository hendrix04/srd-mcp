import { marked } from "marked";

const content = await Deno.readTextFile("srd_reference/normalized/DND5eSRD_019-035.md");
const tokens = marked.lexer(content);

for (let i = 0; i < tokens.length; i++) {
  const token = tokens[i];
  if (token.type === "heading" && token.text === "Ability Score Point Costs") {
    // Find next table
    for (let j = i + 1; j < tokens.length; j++) {
      const t = tokens[j];
      if (t.type === "table") {
        console.log("Headers:", t.header.map(h => h.text));
        console.log("\nAll rows:");
        for (let k = 0; k < t.rows.length; k++) {
          console.log(t.rows[k].map(cell => cell.text));
        }
        Deno.exit(0);
      }
    }
  }
}
