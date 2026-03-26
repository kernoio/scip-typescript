// < definition syntax src/`inheritance.ts`/

import { Superinterface } from './reusable-types'
//       ^^^^^^^^^^^^^^ reference syntax src/`reusable-types.ts`/Superinterface#
//                             ^^^^^^^^^^^^^^^^^^ reference syntax src/`reusable-types.ts`/
import { Overloader } from './overload'
//       ^^^^^^^^^^ reference syntax src/`overload.d.ts`/Overloader#
//                         ^^^^^^^^^^^^ reference syntax src/`overload.d.ts`/

export interface IntermediateSuperinterface extends Superinterface {
//               ^^^^^^^^^^^^^^^^^^^^^^^^^^ definition syntax src/`inheritance.ts`/IntermediateSuperinterface#
//                                                  ^^^^^^^^^^^^^^ reference syntax src/`reusable-types.ts`/Superinterface#
  intermediateInterfaceMethod(): string
//^^^^^^^^^^^^^^^^^^^^^^^^^^^ definition syntax src/`inheritance.ts`/IntermediateSuperinterface#intermediateInterfaceMethod().
}
export abstract class Superclass {
//                    ^^^^^^^^^^ definition syntax src/`inheritance.ts`/Superclass#
  public abstract overrideMethod(): string
//                ^^^^^^^^^^^^^^ definition syntax src/`inheritance.ts`/Superclass#overrideMethod().
}
export abstract class IntermediateSuperclass extends Superclass {
//                    ^^^^^^^^^^^^^^^^^^^^^^ definition syntax src/`inheritance.ts`/IntermediateSuperclass#
//                    relationship implementation syntax src/`inheritance.ts`/Superclass#
//                                                   ^^^^^^^^^^ reference syntax src/`inheritance.ts`/Superclass#
  public override overrideMethod(): string {
//                ^^^^^^^^^^^^^^ definition syntax src/`inheritance.ts`/IntermediateSuperclass#overrideMethod().
//                relationship implementation reference syntax src/`inheritance.ts`/Superclass#overrideMethod().
    return 'this will get overridden'
  }
  public abstract intermediateOverrideMethod(): string
//                ^^^^^^^^^^^^^^^^^^^^^^^^^^ definition syntax src/`inheritance.ts`/IntermediateSuperclass#intermediateOverrideMethod().
}
export class Subclass
//           ^^^^^^^^ definition syntax src/`inheritance.ts`/Subclass#
//           relationship implementation syntax src/`inheritance.ts`/IntermediateSuperclass#
//           relationship implementation syntax src/`inheritance.ts`/IntermediateSuperinterface#
//           relationship implementation syntax src/`inheritance.ts`/Superclass#
//           relationship implementation syntax src/`overload.d.ts`/Overloader#
//           relationship implementation syntax src/`reusable-types.ts`/Superinterface#
  extends IntermediateSuperclass
//        ^^^^^^^^^^^^^^^^^^^^^^ reference syntax src/`inheritance.ts`/IntermediateSuperclass#
  implements IntermediateSuperinterface, Overloader
//           ^^^^^^^^^^^^^^^^^^^^^^^^^^ reference syntax src/`inheritance.ts`/IntermediateSuperinterface#
//                                       ^^^^^^^^^^ reference syntax src/`overload.d.ts`/Overloader#
{
  public onLiteral(param: any): void {
//       ^^^^^^^^^ definition syntax src/`inheritance.ts`/Subclass#onLiteral().
//       relationship implementation reference syntax src/`overload.d.ts`/Overloader#onLiteral().
//                 ^^^^^ definition syntax src/`inheritance.ts`/Subclass#onLiteral().(param)
    throw new Error('Method not implemented.' + param)
//            ^^^^^ reference typescript lib/`lib.es5.d.ts`/Error#
//            ^^^^^ reference typescript lib/`lib.es5.d.ts`/Error.
//                                              ^^^^^ reference syntax src/`inheritance.ts`/Subclass#onLiteral().(param)
  }
  property = 'property'
//^^^^^^^^ definition syntax src/`inheritance.ts`/Subclass#property.
//relationship implementation reference syntax src/`reusable-types.ts`/Superinterface#property.
  public overrideMethod(): string {
//       ^^^^^^^^^^^^^^ definition syntax src/`inheritance.ts`/Subclass#overrideMethod().
//       relationship implementation reference syntax src/`inheritance.ts`/IntermediateSuperclass#overrideMethod().
//       relationship implementation reference syntax src/`inheritance.ts`/Superclass#overrideMethod().
    throw new Error('Method not implemented.')
//            ^^^^^ reference typescript lib/`lib.es5.d.ts`/Error#
//            ^^^^^ reference typescript lib/`lib.es5.d.ts`/Error.
  }
  public intermediateOverrideMethod(): string {
//       ^^^^^^^^^^^^^^^^^^^^^^^^^^ definition syntax src/`inheritance.ts`/Subclass#intermediateOverrideMethod().
//       relationship implementation reference syntax src/`inheritance.ts`/IntermediateSuperclass#intermediateOverrideMethod().
    throw new Error('Method not implemented.')
//            ^^^^^ reference typescript lib/`lib.es5.d.ts`/Error#
//            ^^^^^ reference typescript lib/`lib.es5.d.ts`/Error.
  }
  public interfaceMethod(): string {
//       ^^^^^^^^^^^^^^^ definition syntax src/`inheritance.ts`/Subclass#interfaceMethod().
//       relationship implementation reference syntax src/`reusable-types.ts`/Superinterface#interfaceMethod().
    throw new Error('Method not implemented.')
//            ^^^^^ reference typescript lib/`lib.es5.d.ts`/Error#
//            ^^^^^ reference typescript lib/`lib.es5.d.ts`/Error.
  }
  public intermediateInterfaceMethod(): string {
//       ^^^^^^^^^^^^^^^^^^^^^^^^^^^ definition syntax src/`inheritance.ts`/Subclass#intermediateInterfaceMethod().
//       relationship implementation reference syntax src/`inheritance.ts`/IntermediateSuperinterface#intermediateInterfaceMethod().
    throw new Error('Method not implemented.')
//            ^^^^^ reference typescript lib/`lib.es5.d.ts`/Error#
//            ^^^^^ reference typescript lib/`lib.es5.d.ts`/Error.
  }
}
export const objectLiteralImplementation: Superinterface = {
//           ^^^^^^^^^^^^^^^^^^^^^^^^^^^ definition syntax src/`inheritance.ts`/objectLiteralImplementation.
//                                        ^^^^^^^^^^^^^^ reference syntax src/`reusable-types.ts`/Superinterface#
  property: 'property',
//^^^^^^^^ reference syntax src/`reusable-types.ts`/Superinterface#property.
  interfaceMethod: (): string => {
//^^^^^^^^^^^^^^^ reference syntax src/`reusable-types.ts`/Superinterface#interfaceMethod().
    throw new Error('Function not implemented.')
//            ^^^^^ reference typescript lib/`lib.es5.d.ts`/Error#
//            ^^^^^ reference typescript lib/`lib.es5.d.ts`/Error.
  },
}

