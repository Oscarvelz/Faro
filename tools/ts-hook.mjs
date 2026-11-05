import { register } from "node:module";
register("data:text/javascript," + encodeURIComponent(`
export async function resolve(s, c, n) {
  if (s.startsWith("@/")) s = new URL("./src/" + s.slice(2), "file://${process.cwd()}/").href;
  try { return await n(s, c); } catch (e) { if (/^\\.|^file:/.test(s) && !/\\.[a-z]+$/.test(s)) { try { return await n(s + ".ts", c); } catch { return n(s + "/index.ts", c); } } throw e; }
}`), import.meta.url);
