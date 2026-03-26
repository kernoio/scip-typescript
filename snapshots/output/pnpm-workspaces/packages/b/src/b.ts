// < definition @example/b src/`b.ts`/

import { a } from '@example/a'
//       ^ reference external @example/a a.

export function b() {
//              ^ definition @example/b src/`b.ts`/b().
  return a()
//       ^ reference @example/a a.
}

