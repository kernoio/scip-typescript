// < definition react-example src/`UseMyTSXElement.tsx`/

import React from "react";
//     ^^^^^ reference external @types/react `index.d.ts`/React/
//                ^^^^^^^ reference external @types/react `index.d.ts`/

import { MyProps, MyTSXElement } from "./MyTSXElement";
//       ^^^^^^^ reference react-example src/`MyTSXElement.tsx`/MyProps#
//                ^^^^^^^^^^^^ reference react-example src/`MyTSXElement.tsx`/MyTSXElement.
//                                    ^^^^^^^^^^^^^^^^ reference react-example src/`MyTSXElement.tsx`/

export const _: React.FunctionComponent<MyProps> =
//           ^ definition react-example src/`UseMyTSXElement.tsx`/_.
//              ^^^^^ reference @types/react `index.d.ts`/React/
//                    ^^^^^^^^^^^^^^^^^ reference @types/react `index.d.ts`/React/FunctionComponent#
//                                      ^^^^^^^ reference react-example src/`MyTSXElement.tsx`/MyProps#
    ({}) => (<MyTSXElement></MyTSXElement>)
//            ^^^^^^^^^^^^ reference react-example src/`MyTSXElement.tsx`/MyTSXElement.
//                           ^^^^^^^^^^^^ reference react-example src/`MyTSXElement.tsx`/MyTSXElement.
