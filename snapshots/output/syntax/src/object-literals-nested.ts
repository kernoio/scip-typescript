// < definition syntax src/`object-literals-nested.ts`/

import { Option } from './reusable-types'
//       ^^^^^^ reference syntax src/`reusable-types.ts`/Option#
//                     ^^^^^^^^^^^^^^^^^^ reference syntax src/`reusable-types.ts`/

interface Address {
//        ^^^^^^^ definition syntax src/`object-literals-nested.ts`/Address#
  street: string
//^^^^^^ definition syntax src/`object-literals-nested.ts`/Address#street.
  people: Person[]
//^^^^^^ definition syntax src/`object-literals-nested.ts`/Address#people.
//        ^^^^^^ reference syntax src/`object-literals-nested.ts`/Person#
}
interface Person {
//        ^^^^^^ definition syntax src/`object-literals-nested.ts`/Person#
  name: string
//^^^^ definition syntax src/`object-literals-nested.ts`/Person#name.
  address?: Address
//^^^^^^^ definition syntax src/`object-literals-nested.ts`/Person#address.
//          ^^^^^^^ reference syntax src/`object-literals-nested.ts`/Address#
}

export function handleNestedObjectLiterals(): Person {
//              ^^^^^^^^^^^^^^^^^^^^^^^^^^ definition syntax src/`object-literals-nested.ts`/handleNestedObjectLiterals().
//                                            ^^^^^^ reference syntax src/`object-literals-nested.ts`/Person#
  return {
    name: 'John',
//  ^^^^ reference syntax src/`object-literals-nested.ts`/Person#name.
    address: {
//  ^^^^^^^ reference syntax src/`object-literals-nested.ts`/Person#address.
      street: 'Oxford Street',
//    ^^^^^^ reference syntax src/`object-literals-nested.ts`/Address#street.
      people: [
//    ^^^^^^ reference syntax src/`object-literals-nested.ts`/Address#people.
        {
          name: 'Susan',
//        ^^^^ reference syntax src/`object-literals-nested.ts`/Person#name.
        },
      ],
    },
  }
}

export function handleNestedTypeVariables(): Option<Person> {
//              ^^^^^^^^^^^^^^^^^^^^^^^^^ definition syntax src/`object-literals-nested.ts`/handleNestedTypeVariables().
//                                           ^^^^^^ reference syntax src/`reusable-types.ts`/Option#
//                                                  ^^^^^^ reference syntax src/`object-literals-nested.ts`/Person#
  return {
    value: {
//  ^^^^^ reference syntax src/`reusable-types.ts`/Option#value.
      name: 'John',
//    ^^^^ reference syntax src/`object-literals-nested.ts`/Person#name.
      address: {
//    ^^^^^^^ reference syntax src/`object-literals-nested.ts`/Person#address.
        street: 'Oxford Street',
//      ^^^^^^ reference syntax src/`object-literals-nested.ts`/Address#street.
        people: [
//      ^^^^^^ reference syntax src/`object-literals-nested.ts`/Address#people.
          {
            name: 'Susan',
//          ^^^^ reference syntax src/`object-literals-nested.ts`/Person#name.
          },
        ],
      },
    },
  }
}

