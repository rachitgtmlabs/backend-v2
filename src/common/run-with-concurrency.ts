/**
 * Run a set of async tasks with a bounded concurrency limit.
 *
 * Tasks are pulled from the list by a fixed pool of `limit` workers; as each
 * worker finishes a task it pulls the next, so at most `limit` tasks are
 * in-flight at any moment. Tasks are expected to be self-contained (handle
 * their own errors / side effects) — this runner never rejects, it simply
 * resolves once every task has settled.
 */
export async function runWithConcurrency(
  tasks: Array<() => Promise<void>>,
  limit: number,
): Promise<void> {
  let cursor = 0;
  const runNext = async (): Promise<void> => {
    const index = cursor++;
    if (index >= tasks.length) return;
    await tasks[index]();
    return runNext();
  };
  const workers = Array.from(
    { length: Math.min(Math.max(1, limit), tasks.length) },
    () => runNext(),
  );
  await Promise.all(workers);
}

/**
 * Max concurrent Groq section extractions per analysis stream.
 *
 * Note: `operationalGuardrails` internally fans out into 2 parallel calls,
 * so the true worst-case Groq request count is roughly this value + 1.
 * Tune down if the Groq tier's RPM/TPM limits start triggering backoff.
 */
export const SECTION_CONCURRENCY = 4;
