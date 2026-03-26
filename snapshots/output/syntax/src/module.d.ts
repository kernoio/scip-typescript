// < definition syntax src/`module.d.ts`/

declare module 'a:b' {
//             ^^^^^ definition a:b 
  function hello(): string
//         ^^^^^ definition a:b hello().
}

