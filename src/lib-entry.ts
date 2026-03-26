/**
 * Library entry point for embedding scip-typescript in GraalJS.
 * Exposes the core indexing functionality without CLI/workspace detection.
 */
import * as ts from 'typescript'
import { FileIndexer } from './FileIndexer'
import { Input } from './Input'
import { Packages } from './Packages'
import * as scip from './scip'
import { ScipSymbol } from './ScipSymbol'

export { ts, scip, FileIndexer, Input, Packages, ScipSymbol }

export interface IndexResult {
  documents: scip.scip.Document[]
  errors: string[]
}

/**
 * Index a single TypeScript/JavaScript project.
 *
 * @param fileNames - Array of absolute file paths to index
 * @param compilerOptions - TypeScript compiler options
 * @param projectRoot - Root directory of the project
 * @param host - CompilerHost providing filesystem access
 */
export function indexProject(
  fileNames: string[],
  compilerOptions: ts.CompilerOptions,
  projectRoot: string,
  host: ts.CompilerHost
): IndexResult {
  const result: IndexResult = {
    documents: [],
    errors: []
  }

  try {
    const program = ts.createProgram(fileNames, compilerOptions, host)
    const checker = program.getTypeChecker()
    const packages = new Packages(projectRoot)
    const symbolCache = new Map<ts.Node, ScipSymbol>()
    const constructorTable = new Map<ts.ClassDeclaration, boolean>()

    for (const sourceFile of program.getSourceFiles()) {
      if (!fileNames.includes(sourceFile.fileName)) {
        continue
      }

      const document = new scip.scip.Document({
        relative_path: sourceFile.fileName.startsWith(projectRoot)
          ? sourceFile.fileName.slice(projectRoot.length + 1)
          : sourceFile.fileName,
        occurrences: [],
      })

      const input = new Input(sourceFile.fileName, sourceFile.getText())

      const options = {
        projectRoot,
        cwd: projectRoot,
        projectDisplayName: projectRoot,
        writeIndex: () => {},
        output: '',
        globalCaches: true,
        followReferences: true,
        progressBar: false,
        yarnWorkspaces: false,
        yarnBerryWorkspaces: false,
        pnpmWorkspaces: false,
        indexedProjects: new Set<string>(),
      }

      const visitor = new FileIndexer(
        checker,
        program,
        options,
        input,
        document,
        symbolCache,
        constructorTable,
        packages,
        sourceFile,
        new Set(fileNames)
      )

      try {
        visitor.index()
        if (document.occurrences.length > 0) {
          result.documents.push(document)
        }
      } catch (error) {
        result.errors.push(`Error indexing ${sourceFile.fileName}: ${error}`)
      }
    }
  } catch (error) {
    result.errors.push(`Error creating program: ${error}`)
  }

  return result
}

/**
 * Create SCIP metadata for the index
 */
export function createMetadata(projectRoot: string, version: string): scip.scip.Metadata {
  return new scip.scip.Metadata({
    project_root: `file://${projectRoot}`,
    text_document_encoding: scip.scip.TextEncoding.UTF8,
    tool_info: new scip.scip.ToolInfo({
      name: 'scip-typescript-kt',
      version: version,
      arguments: [],
    }),
  })
}

/**
 * Serialize a SCIP index to binary format
 */
export function serializeIndex(
  metadata: scip.scip.Metadata,
  documents: scip.scip.Document[]
): Uint8Array {
  const index = new scip.scip.Index({
    metadata,
    documents,
  })
  return index.serializeBinary()
}

// Expose everything globally for easy access from GraalJS
;(globalThis as any).ScipTypeScript = {
  indexProject,
  createMetadata,
  serializeIndex,
  ts,
  scip,
}
