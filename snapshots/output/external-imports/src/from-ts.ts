// < definition external-imports src/`from-ts.ts`/

import { useState } from 'react'
//       ^^^^^^^^ reference external @types/react `index.d.ts`/React/useState().
//                       ^^^^^^^ reference external @types/react `index.d.ts`/
import { localFn } from './local-module'
//       ^^^^^^^ reference external-imports src/`local-module.ts`/localFn().
//                      ^^^^^^^^^^^^^^^^ reference external-imports src/`local-module.ts`/

export const state = useState(localFn())
//           ^^^^^ definition external-imports src/`from-ts.ts`/state.
//                   ^^^^^^^^ reference @types/react `index.d.ts`/React/useState().
//                            ^^^^^^^ reference external-imports src/`local-module.ts`/localFn().

