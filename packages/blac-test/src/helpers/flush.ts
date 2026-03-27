export async function flushBlocUpdates(): Promise<void> {
  // Flush microtasks (Promise callbacks, queueMicrotask)
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}
