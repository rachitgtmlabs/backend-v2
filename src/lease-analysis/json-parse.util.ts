/** Strip optional ```json fences and parse JSON (LLM output). */
export function parseJsonFromLlm(text: string): unknown {
  let s = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(s);
  if (fenced) {
    s = fenced[1].trim();
  }
  return JSON.parse(s);
}
