// < definition syntax src/`overload.d.ts`/

export interface Overloader {
//               ^^^^^^^^^^ definition syntax src/`overload.d.ts`/Overloader#
  onLiteral(param: 'a'): void
//^^^^^^^^^ definition syntax src/`overload.d.ts`/Overloader#onLiteral().
//          ^^^^^ definition syntax src/`overload.d.ts`/Overloader#onLiteral().(param)
  onLiteral(param: 'b'): void
//^^^^^^^^^ definition syntax src/`overload.d.ts`/Overloader#onLiteral().
//          ^^^^^ definition syntax src/`overload.d.ts`/Overloader#onLiteral().(param)
}

