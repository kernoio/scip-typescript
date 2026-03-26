// < definition react-example src/`MyTSXElement.tsx`/

import React from 'react'
//     ^^^^^ reference external @types/react `index.d.ts`/React/
//                ^^^^^^^ reference external @types/react `index.d.ts`/

export interface MyProps {}
//               ^^^^^^^ definition react-example src/`MyTSXElement.tsx`/MyProps#

export const MyTSXElement: React.FunctionComponent<MyProps> = ({}) => (<p></p>)
//           ^^^^^^^^^^^^ definition react-example src/`MyTSXElement.tsx`/MyTSXElement.
//                         ^^^^^ reference @types/react `index.d.ts`/React/
//                               ^^^^^^^^^^^^^^^^^ reference @types/react `index.d.ts`/React/FunctionComponent#
//                                                 ^^^^^^^ reference react-example src/`MyTSXElement.tsx`/MyProps#
//                                                                      ^ reference @types/react `index.d.ts`/global/JSX/IntrinsicElements#p.
//                                                                          ^ reference @types/react `index.d.ts`/global/JSX/IntrinsicElements#p.
