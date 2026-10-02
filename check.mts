import { SYSTEM_PROMPT } from "./constants/system-prompt";
const literalEsc = (SYSTEM_PROMPT.match(/\\u[0-9a-fA-F]{4}/g) || []);
console.log("literal \\uXXXX sequences in runtime prompt:", literalEsc.length, literalEsc.slice(0,5));
console.log("real em-dashes:", (SYSTEM_PROMPT.match(/\u2014/g)||[]).length);
console.log("real curly quotes:", (SYSTEM_PROMPT.match(/[\u201c\u201d]/g)||[]).length);
console.log("sample:", JSON.stringify(SYSTEM_PROMPT.slice(0, 120)));
