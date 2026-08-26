import { rm } from 'node:fs/promises';

for (const path of ['.m1-proof', 'dist']) {
  await rm(new URL(`../${path}`, import.meta.url), { recursive: true, force: true });
}
