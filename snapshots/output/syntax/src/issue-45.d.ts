// < definition syntax src/`issue-45.d.ts`/

export namespace example {
//               ^^^^^^^ definition syntax src/`issue-45.d.ts`/example/
  class Server {
//      ^^^^^^ definition syntax src/`issue-45.d.ts`/example/Server#
    // This overloaded method reproduces the following issue https://github.com/sourcegraph/scip-typescript/issues/45
    addListener(name: 'a'): void
//  ^^^^^^^^^^^ definition syntax src/`issue-45.d.ts`/example/Server#addListener().
//              ^^^^ definition syntax src/`issue-45.d.ts`/example/Server#addListener().(name)
    addListener(name: 'b'): void
//  ^^^^^^^^^^^ definition syntax src/`issue-45.d.ts`/example/Server#addListener().
//              ^^^^ definition syntax src/`issue-45.d.ts`/example/Server#addListener().(name)
  }
}

