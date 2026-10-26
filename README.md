# scip-typescript

[SCIP](https://github.com/sourcegraph/scip) indexer for TypeScript and JavaScript.

## Kerno additions

This is Kerno's fork (`kernoio/scip-typescript`) of Sourcegraph's scip-typescript. It exists so that Kerno can run the indexer over arbitrary customer and benchmark repositories: it needs to discover a repository's project and workspace layout before indexing, index a single workspace package with workspace-aware type resolution, and keep going on messy repositories (no tsconfig, stub packages, unusual package managers). The upstream text below describes the original tool; the `index` command here behaves differently (see `--filter` below).

Commands are shown as `scip-typescript`; from a source checkout use `npm install && npm run build` and `node dist/src/main.js`. Option definitions are in `src/CommandLineOptions.ts`.

### `detect`: project topology and import heatmap

```
scip-typescript detect [path]
```

Discovers the project structure of `path` (default: current directory) without indexing and prints JSON to stdout. Implementation: `src/detectCommand.ts`; the output contract is `detect.schema.json`.

Output is `{ "tool": "typescript", "workspaces": [...] }`. Each workspace has `root`, `type` (`pnpm`, `npm`, `yarn`, `bun` or `standalone`) and a flat `projects` list with the workspace root first. Each project has `name`, `path`, `parent`, `children`, `producesArtifacts`, `buildFiles` (`package.json`, `tsconfig.json` or `jsconfig.json`, lock files and package-manager config found), `languages`, `buildTool`, `dependencies` (workspace-sibling package names, including siblings imported without being declared), and `config`. Package managers are detected from lock files, the `packageManager` field and config files, including Bun (`bun.lock`, `bun.lockb`, `bunfig.toml`). Nx projects are detected through `project.json`.

Each project may also carry an import heatmap, counted per directory and per imported name:

- `packageImports`: imports of third-party packages, as `directory -> package -> imported name -> count`.
- `moduleImports`: imports of project-internal modules, same shape. Imports of child modules are filtered out of the parent module's heatmap, and test files and directories are ignored.

Example, for a package `app` whose `src/a.ts` contains `import { map, filter } from 'lodash'`:

```
$ scip-typescript detect ./app
{
  "tool": "typescript",
  "workspaces": [
    {
      "root": ".",
      "type": "standalone",
      "projects": [
        {
          "name": "app",
          "path": ".",
          "children": [],
          "producesArtifacts": true,
          "buildFiles": ["package.json", "tsconfig.json"],
          "languages": ["typescript"],
          "config": { "type": "typescript", "configFile": "tsconfig.json" },
          "packageImports": { "src": { "lodash": { "map": 1, "filter": 1 } } }
        }
      ]
    }
  ]
}
```

Fields that are null or empty (such as `parent` for a workspace root, or an empty `dependencies`) are omitted from the output.

### `index <path> --filter <package>`: one workspace package

```
scip-typescript index ./monorepo --filter @acme/backend --output backend.scip
```

In this fork `index` indexes exactly one package, named by `--filter`, and fails with `package 'undefined' not found in workspace` if `--filter` is omitted. Use the package names reported by `detect`; an unknown name fails and lists the available packages. The directory to index is a positional argument (the upstream `--cwd` option was removed). The output is a SCIP index at `--output` (default `index.scip`, relative to the indexed directory). On success the command prints `+ <package>` and `done <output path>`.

Behaviour specific to this mode (`src/main.ts`):

- Workspace-sibling dependencies of the target package are symlinked into its `node_modules` for the duration of the run so that cross-package imports resolve to source, and tsconfig path aliases are preserved.
- A package without a `tsconfig.json` or `jsconfig.json` uses the nearest ancestor config, or a synthetic config that includes JavaScript.
- Test files (`*.test.*`, `*.spec.*`, `*.test-d.*`, and anything under `__tests__`, `test`, `tests` or `fixtures`) are not indexed.
- `--extra-types-path <path>` adds a directory (and its `@types` subdirectory) to `typeRoots`, for example to supply DefinitelyTyped stubs.
- `require()` calls are treated like ESM imports, and symbols defined outside the target package are marked with `SymbolRole.External`.
- A package with no indexable files is not an error: a warning is printed and a metadata-only index is written, so batch indexing of a monorepo with a stub package does not fail.
- `--max-file-byte-size` (default `1mb`) and the other upstream options are unchanged.

### Build and release

- Workflow: `.github/workflows/release.yml`. It runs on every push to `main`; it is the only workflow in this fork (the upstream `ci.yml`, `scip.yml`, `labeler.yml` and `pr-auditor.yml` were removed in commit `26ac2bc`).
- Version: a CalVer tag `YYYY.M.D` (for example `2026.4.28`), with `.N` appended for further releases on the same day. The tag is created and pushed by the workflow.
- Steps (Node 22): `npm install`, `npm run build`, `npm run bundle` (esbuild, single file), then `dist/scip-typescript.cjs` and `dist/lib/` (TypeScript's built-in `lib.*.d.ts` files, needed for built-in type resolution) are zipped.
- Output: a GitHub release on this repository with the assets `scip-typescript.cjs` and `scip-typescript.zip`. Run the bundle with `node scip-typescript.cjs <command>`; keep `lib/` next to it.
- This workflow does not publish to npm and no workflow here uses `NPM_TOKEN`. `package.json` still declares the upstream name `@sourcegraph/scip-typescript` at version 0.4.0, which the release workflow does not bump. Whether and where Kerno publishes this package, and which npm account or token would own it, has to be confirmed by the team; do not publish under Sourcegraph's package name without that.
- Because the workflow triggers on every push to `main`, merging any change to `main`, including documentation, cuts a release.
- `dev/bump-version` is the upstream version-bump helper; it requires the branch `main`.

## Quick start

### Installation

```sh
npm install -g @sourcegraph/scip-typescript
```

Currently, Node v18, Node v20 are supported. <!-- Source of truth: .github/workflows/ci.yml -->

### Indexing a TypeScript project

Navigate to the project root, containing `tsconfig.json`.

```sh
npm install # or yarn install
scip-typescript index
```

### Indexing a JavaScript project

Navigate to the project root, containing `package.json`.

```sh
npm install # or yarn install
scip-typescript index --infer-tsconfig
```

To improve the quality of indexing results for JavaScript,
consider adding `@types/*` packages as `devDependencies` in `package.json`.

### Index a TypeScript project using Yarn workspaces

Navigate to the project root, containing `package.json`.

```sh
yarn install

scip-typescript index --yarn-workspaces
```

### Index a TypeScript project using pnpm workspaces

Navigate to the project root, containing `package.json`.

```sh
pnpm install

scip-typescript index --pnpm-workspaces
```

### Indexing in CI

Add the following run steps to your CI pipeline:

```sh
npm install -g @sourcegraph/scip-typescript @sourcegraph/src
npm install # or yarn install
scip-typescript index
# Upload index with any necessary tokens (shown here using GitHub workflow syntax)
src lsif upload -github-token='${{ secrets.GITHUB_TOKEN }}' -no-progress
```

For more examples, see the
[Sourcegraph docs](https://docs.sourcegraph.com/code_intelligence/how-to/index_a_typescript_and_javascript_repository).

### Troubleshooting stalled progress

If `scip-typescript index` is not showing progress, try running it again with
the `--progress-bar` flag. The progress bar prints out the current file being
indexed that could reveal details why progress is stalling. The progress bar
is disabled by default because it prints out a lot of noise in CI logs, and
the most common environment to run scip-typescript is in CI.

### Dealing with out of memory issues (OOM)

You may experience OOM issues when indexing large codebases

```
<--- JS stacktrace --->

FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
 1: 0xb7b150 node::Abort() [node]
 2: 0xa8c89a  [node]
 3: 0xd62ea0 v8::Utils::ReportOOMFailure(v8::internal::Isolate*, char const*, bool) [node]
 4: 0xd63247 v8::internal::V8::FatalProcessOutOfMemory(v8::internal::Isolate*, char const*, bool) [node]
 5: 0xf40945  [node]
 6: 0xf52e2d v8::internal::Heap::CollectGarbage(v8::internal::AllocationSpace, v8::internal::GarbageCollectionReason, v8::GCCallbackFlags) [node]
 ...
```

To fix this problem, try one of the following steps:

- Add `--no-global-caches` to the index command like this `scip-typescript
index --no-global-caches REST_OF_THE_COMMAND`. By default, scip-typescript
  caches symbol indexing across TypeScript projects to speed up indexing. This
  cache increases the memory footprint, which can cause OOM. Disabling this cache
  slows down indexing but reduces the memory footprint.
- Increase memory to the Node.js process by running scip-typescript like this
  `node --max-old-space-size=16000 "$(which scip-typescript)" index REST_OF_COMMAND`.
  Replace 16000 with an even larger number if your computer has bigger RAM.

## Migrating from lsif-node

Before creating scip-typescript, we used another TypeScript indexer called
[lsif-node](https://github.com/sourcegraph/lsif-node). We recommend migrating
to scip-typescript if you are using lsif-node.

Follow the steps below to migrate from lsif-node to scip-typescript:

- Replace usages of the `lsif-tsc -p ARGUMENTS` command with `scip-typescript index ARGUMENTS`.
- Upgrade to the latest version of the `src` command-line interface, which you
  can install via `yarn global add @sourcegraph/src`. It’s okay if the version
  of your `src` command-line interface does not match the version of your
  Sourcegraph instance.

## Contributing

See [Development.md](./Development.md) for docs on how to work on this project.

Contributors should follow the [Sourcegraph Community Code of Conduct](https://sourcegraph.notion.site/Sourcegraph-Community-Code-of-Conduct-c7cef6b270c84fb2882808d4d82995dd).
