import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const entrada = "src/styles/globals.css";
const saida = "public/estilos.css";

const css = readFileSync(entrada, "utf8");
const resultado = await postcss([tailwindcss()]).process(css, { from: entrada, to: saida });
mkdirSync("public", { recursive: true });
writeFileSync(saida, resultado.css);
console.log(`CSS gerado: ${saida} (${resultado.css.length} bytes)`);
