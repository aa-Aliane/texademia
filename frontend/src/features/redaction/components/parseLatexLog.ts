// Minimal LaTeX log parser: extracts `! message` errors and the line number
// from the following `l.<n>` marker. File attribution is unreliable in TeX
// logs, so errors are attributed to the main file — good enough for jump-to-line.

export interface LatexError {
  message: string;
  line: number | null;
}

export function parseLatexLog(log: string): LatexError[] {
  const lines = log.split("\n");
  const errors: LatexError[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith("! ")) continue;

    const message = lines[i].slice(2).trim();
    let line: number | null = null;

    for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
      if (lines[j].startsWith("! ")) break;
      const m = /^l\.(\d+)/.exec(lines[j]);
      if (m) {
        line = parseInt(m[1], 10);
        break;
      }
    }

    errors.push({ message, line });
  }

  return errors;
}
