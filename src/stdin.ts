/**
 * Read piped stdin as a single string (non-interactive). Returns undefined if TTY.
 */
export async function readPipedStdin(): Promise<string | undefined> {
  if (process.stdin.isTTY) return undefined;
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  const s = Buffer.concat(chunks).toString("utf8").trim();
  return s || undefined;
}
