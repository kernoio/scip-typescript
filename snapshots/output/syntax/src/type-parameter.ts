// < definition syntax src/`type-parameter.ts`/

export function typeParameter<A, B>(parameter: A, parameter2: B): [A, B] {
//              ^^^^^^^^^^^^^ definition syntax src/`type-parameter.ts`/typeParameter().
//                            ^ definition syntax src/`type-parameter.ts`/typeParameter().[A]
//                               ^ definition syntax src/`type-parameter.ts`/typeParameter().[B]
//                                  ^^^^^^^^^ definition syntax src/`type-parameter.ts`/typeParameter().(parameter)
//                                             ^ reference syntax src/`type-parameter.ts`/typeParameter().[A]
//                                                ^^^^^^^^^^ definition syntax src/`type-parameter.ts`/typeParameter().(parameter2)
//                                                            ^ reference syntax src/`type-parameter.ts`/typeParameter().[B]
//                                                                 ^ reference syntax src/`type-parameter.ts`/typeParameter().[A]
//                                                                    ^ reference syntax src/`type-parameter.ts`/typeParameter().[B]
  return [parameter, parameter2]
//        ^^^^^^^^^ reference syntax src/`type-parameter.ts`/typeParameter().(parameter)
//                   ^^^^^^^^^^ reference syntax src/`type-parameter.ts`/typeParameter().(parameter2)
}

