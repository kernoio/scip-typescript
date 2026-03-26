// < definition syntax src/`typings.ts`/

export function process() {
//              ^^^^^^^ definition syntax src/`typings.ts`/process().
  return window.process
//       ^^^^^^ reference typescript lib/`lib.dom.d.ts`/window.
//              ^^^^^^^ reference @types/node `globals.d.ts`/global/process.
//              ^^^^^^^ reference process global/process.
}

