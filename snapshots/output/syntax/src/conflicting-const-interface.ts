// < definition syntax src/`conflicting-const-interface.ts`/

export const ConflictingConst = 42
//           ^^^^^^^^^^^^^^^^ definition syntax src/`conflicting-const-interface.ts`/ConflictingConst.
export interface ConflictingConst {}
//               ^^^^^^^^^^^^^^^^ definition syntax src/`conflicting-const-interface.ts`/ConflictingConst#
export class ImplementsConflictingConst implements ConflictingConst {}
//           ^^^^^^^^^^^^^^^^^^^^^^^^^^ definition syntax src/`conflicting-const-interface.ts`/ImplementsConflictingConst#
//           relationship implementation syntax src/`conflicting-const-interface.ts`/ConflictingConst#
//                                                 ^^^^^^^^^^^^^^^^ reference syntax src/`conflicting-const-interface.ts`/ConflictingConst.
//                                                 ^^^^^^^^^^^^^^^^ reference syntax src/`conflicting-const-interface.ts`/ConflictingConst#

