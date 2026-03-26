// < definition syntax src/`property-assignment-reference.ts`/

import {
  propertyAssignment,
//^^^^^^^^^^^^^^^^^^ reference syntax src/`property-assignment.ts`/propertyAssignment().
  shorthandPropertyAssignment,
//^^^^^^^^^^^^^^^^^^^^^^^^^^^ reference syntax src/`property-assignment.ts`/shorthandPropertyAssignment().
} from './property-assignment'
//     ^^^^^^^^^^^^^^^^^^^^^^^ reference syntax src/`property-assignment.ts`/

export function run(): string {
//              ^^^ definition syntax src/`property-assignment-reference.ts`/run().
  return propertyAssignment().a + shorthandPropertyAssignment().a
//       ^^^^^^^^^^^^^^^^^^ reference syntax src/`property-assignment.ts`/propertyAssignment().
//                            ^ reference syntax src/`property-assignment.ts`/a0:
//                                ^^^^^^^^^^^^^^^^^^^^^^^^^^^ reference syntax src/`property-assignment.ts`/shorthandPropertyAssignment().
//                                                              ^ reference syntax src/`property-assignment.ts`/a1:
}

