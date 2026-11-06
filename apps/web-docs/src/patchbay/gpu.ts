/// <reference types="@webgpu/types" />
import { initGPU, install } from 'insomni';
import { paths } from 'insomni/paths';
import type { GPUHandle } from 'insomni';

install(paths);

let gpu: Promise<GPUHandle | null> | null = null;

/** One GPU device per page, shared by every canvas on it; null without WebGPU. */
export const sharedGpu = () =>
  (gpu ??=
    'gpu' in navigator ? initGPU().catch(() => null) : Promise.resolve(null));
