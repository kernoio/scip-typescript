#!/usr/bin/env node
import * as child_process from 'child_process'
import * as fs from 'fs'
import { EOL } from 'os'
import * as path from 'path'
import * as url from 'url'

import * as ts from 'typescript'

import packageJson from '../package.json'

import {
  GlobalCache,
  mainCommand,
  MultiProjectOptions,
  ProjectOptions,
} from './CommandLineOptions'
import { detect, detectCommand, FlatProjectNode, resolveEntryPoint } from './detectCommand'
import { inferTsconfig } from './inferTsconfig'
import { ProjectIndexer } from './ProjectIndexer'
import * as scip from './scip'

export function main(): void {
  mainCommand(
    (projects, options) => indexCommand(projects, options),
    (cwd) => detectCommand(cwd)
  ).parse(process.argv)
  return
}

export function indexCommand(
  projects: string[],
  options: MultiProjectOptions
): void {
  if (options.filter) {
    indexFiltered(options)
    return
  }
  if (options.yarnWorkspaces) {
    projects.push(...listYarnWorkspaces(options.cwd, 'tryYarn1'))
  } else if (options.yarnBerryWorkspaces) {
    projects.push(...listYarnWorkspaces(options.cwd, 'yarn2Plus'))
  } else if (options.pnpmWorkspaces) {
    projects.push(...listPnpmWorkspaces(options.cwd))
  } else if (projects.length === 0) {
    projects.push(options.cwd)
  }
  options.cwd = makeAbsolutePath(process.cwd(), options.cwd)
  options.output = makeAbsolutePath(options.cwd, options.output)
  if (!options.indexedProjects) {
    options.indexedProjects = new Set()
  }
  const output = fs.openSync(options.output, 'w')
  let documentCount = 0
  const writeIndex = (index: scip.scip.Index): void => {
    documentCount += index.documents.length
    fs.writeSync(output, index.serializeBinary())
  }

  const cache: GlobalCache = {
    sources: new Map(),
    parsedCommandLines: new Map(),
  }
  try {
    writeIndex(
      new scip.scip.Index({
        metadata: new scip.scip.Metadata({
          project_root: url.pathToFileURL(options.cwd).toString(),
          text_document_encoding: scip.scip.TextEncoding.UTF8,
          tool_info: new scip.scip.ToolInfo({
            name: 'scip-typescript',
            version: packageJson.version,
            arguments: [],
          }),
        }),
      })
    )
    // NOTE: we may want index these projects in parallel in the future.
    // We need to be careful about which order we index the projects because
    // they can have dependencies.
    for (const projectRoot of projects) {
      const projectDisplayName = projectRoot === '.' ? options.cwd : projectRoot
      indexSingleProject(
        {
          ...options,
          projectRoot,
          projectDisplayName,
          writeIndex,
        },
        cache
      )
    }
  } finally {
    fs.close(output)
    console.log(`done ${options.output}`)
  }
}

function indexFiltered(options: MultiProjectOptions): void {
  options.cwd = makeAbsolutePath(process.cwd(), options.cwd)
  options.output = makeAbsolutePath(options.cwd, options.output)

  const topology = detect(options.cwd)

  const allPackages: Array<{ name: string; absPath: string }> = []
  let targetPackage: { name: string; absPath: string } | undefined

  function collectPackages(nodes: FlatProjectNode[]): void {
    for (const node of nodes) {
      const absPath = path.resolve(options.cwd, node.path)
      allPackages.push({ name: node.name, absPath })
      if (node.name === options.filter) {
        targetPackage = { name: node.name, absPath }
      }
    }
  }
  for (const workspace of topology.workspaces) {
    collectPackages(workspace.projects)
  }

  if (!targetPackage) {
    console.error(
      `error: package '${options.filter}' not found in workspace. Available packages: ${allPackages.map(p => p.name).join(', ')}`
    )
    process.exitCode = 1
    return
  }

  const pathsMapping: Record<string, string[]> = {}
  for (const pkg of allPackages) {
    if (pkg.name === options.filter) {
      continue
    }
    const relPath = './' + path.relative(targetPackage.absPath, pkg.absPath)
    const pkgJsonPath = path.join(pkg.absPath, 'package.json')
    const pkgJson = fs.existsSync(pkgJsonPath)
      ? JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8').replace(/^\uFEFF/, ''))
      : undefined
    const entryPoint = resolveEntryPoint(pkg.absPath, pkgJson)
    if (entryPoint) {
      pathsMapping[pkg.name] = ['./' + path.relative(targetPackage.absPath, entryPoint)]
    } else {
      pathsMapping[pkg.name] = [relPath]
    }
    pathsMapping[pkg.name + '/*'] = [relPath + '/*']
  }

  const packageTsconfigPath = path.join(targetPackage.absPath, 'tsconfig.json')
  const packageJsconfigPath = path.join(targetPackage.absPath, 'jsconfig.json')
  let configFile: string | undefined
  if (ts.sys.fileExists(packageTsconfigPath)) {
    configFile = packageTsconfigPath
  } else if (ts.sys.fileExists(packageJsconfigPath)) {
    configFile = packageJsconfigPath
  }

  if (!configFile) {
    const parentDir = path.dirname(targetPackage.absPath)
    const ancestorTsconfig = ts.findConfigFile(parentDir, ts.sys.fileExists, 'tsconfig.json')
    const ancestorJsconfig = ancestorTsconfig
      ? undefined
      : ts.findConfigFile(parentDir, ts.sys.fileExists, 'jsconfig.json')
    const ancestorConfig = ancestorTsconfig || ancestorJsconfig

    if (ancestorConfig) {
      const relativePath = path.relative(targetPackage.absPath, ancestorConfig)
      fs.writeFileSync(packageTsconfigPath, JSON.stringify({ extends: relativePath }))
    } else {
      fs.writeFileSync(packageTsconfigPath, inferTsconfig())
    }
    configFile = packageTsconfigPath
  }

  const config = loadConfigFile(configFile, {
    transformCompilerOptions: (compilerOptions) => {
      const existingPaths = (compilerOptions.paths ?? {}) as Record<string, string[]>
      return {
        ...compilerOptions,
        baseUrl: '.',
        paths: { ...existingPaths, ...pathsMapping },
        noEmit: true,
        skipLibCheck: true,
      }
    },
    include: ['./**/*'],
  })

  if (!config || config.fileNames.length === 0) {
    console.error(
      `error: no files found in package '${options.filter}' at ${targetPackage.absPath}`
    )
    process.exitCode = 1
    return
  }

  const output = fs.openSync(options.output, 'w')
  let documentCount = 0
  const writeIndex = (index: scip.scip.Index): void => {
    documentCount += index.documents.length
    fs.writeSync(output, index.serializeBinary())
  }

  const cache: GlobalCache = {
    sources: new Map(),
    parsedCommandLines: new Map(),
  }

  try {
    writeIndex(
      new scip.scip.Index({
        metadata: new scip.scip.Metadata({
          project_root: url.pathToFileURL(options.cwd).toString(),
          text_document_encoding: scip.scip.TextEncoding.UTF8,
          tool_info: new scip.scip.ToolInfo({
            name: 'scip-typescript',
            version: packageJson.version,
            arguments: [],
          }),
        }),
      })
    )

    if (!options.indexedProjects) {
      options.indexedProjects = new Set()
    }

    new ProjectIndexer(
      config,
      {
        ...options,
        projectRoot: targetPackage.absPath,
        projectDisplayName: options.filter!,
        writeIndex,
      } as ProjectOptions,
      cache
    ).index()
  } finally {
    fs.close(output)
    if (documentCount > 0) {
      console.log(`done ${options.output}`)
    } else {
      process.exitCode = 1
      fs.rmSync(options.output)
      console.log(`error: no files got indexed for package '${options.filter}'`)
    }
  }
}

function makeAbsolutePath(cwd: string, relativeOrAbsolutePath: string): string {
  if (path.isAbsolute(relativeOrAbsolutePath)) {
    return relativeOrAbsolutePath
  }
  return path.resolve(cwd, relativeOrAbsolutePath)
}

function indexSingleProject(options: ProjectOptions, cache: GlobalCache): void {
  if (options.indexedProjects.has(options.projectRoot)) {
    return
  }

  options.indexedProjects.add(options.projectRoot)
  let config = ts.parseCommandLine(
    ['-p', options.projectRoot],
    (relativePath: string) => path.resolve(options.projectRoot, relativePath)
  )
  let tsconfigFileName: string | undefined
  if (config.options.project) {
    const projectPath = path.resolve(config.options.project)
    if (ts.sys.directoryExists(projectPath)) {
      tsconfigFileName = path.join(projectPath, 'tsconfig.json')
    } else {
      tsconfigFileName = projectPath
    }
    if (!ts.sys.fileExists(tsconfigFileName)) {
      fs.writeFileSync(tsconfigFileName, inferTsconfig())
    }
    const loadedConfig = loadConfigFile(tsconfigFileName)
    if (loadedConfig !== undefined) {
      config = loadedConfig
    }
  }

  for (const projectReference of config.projectReferences || []) {
    indexSingleProject(
      {
        ...options,
        projectRoot: projectReference.path,
        projectDisplayName: projectReference.path,
      },
      cache
    )
  }

  if (config.fileNames.length > 0) {
    new ProjectIndexer(config, options, cache).index()
  }
}

if (require.main === module) {
  main()
}

interface LoadConfigOptions {
  transformCompilerOptions?: (options: Record<string, unknown>) => Record<string, unknown>
  include?: string[]
}

function loadConfigFile(
  file: string,
  loadOptions?: LoadConfigOptions
): ts.ParsedCommandLine | undefined {
  const absolute = path.resolve(file)

  const readResult = ts.readConfigFile(absolute, p => ts.sys.readFile(p))

  if (readResult.error) {
    throw new Error(
      ts.formatDiagnostics([readResult.error], ts.createCompilerHost({}))
    )
  }
  const config = readResult.config as {
    extends?: string
    compilerOptions?: Record<string, unknown>
    include?: string[]
    exclude?: string[]
  }
  if (config.extends) {
    const extendsPath = path.resolve(path.dirname(absolute), config.extends)
    if (!ts.sys.fileExists(extendsPath)) {
      console.warn(`Warning: Cannot resolve extends "${config.extends}", continuing without inherited settings`)
      delete config.extends
    }
  }

  const baseOptions: Record<string, unknown> = { ...(config.compilerOptions ?? {}) }
  delete baseOptions.outDir
  delete baseOptions.outFile

  config.compilerOptions = {
    ...baseOptions,
    ...defaultCompilerOptions(file),
  }

  if (loadOptions?.transformCompilerOptions) {
    config.compilerOptions = loadOptions.transformCompilerOptions(config.compilerOptions)
  }

  if (loadOptions?.include) {
    config.include = loadOptions.include
    delete config.exclude
  }

  const basePath = path.dirname(absolute)
  const result = ts.parseJsonConfigFileContent(config, ts.sys, basePath)
  const errors: ts.Diagnostic[] = []
  for (const error of result.errors) {
    if (error.code === 18003) {
      continue
    }
    errors.push(error)
  }
  if (errors.length > 0) {
    console.log(ts.formatDiagnostics(errors, ts.createCompilerHost({})))
    return undefined
  }
  return result
}

function defaultCompilerOptions(configFileName?: string): ts.CompilerOptions {
  const options: ts.CompilerOptions =
    // Not a typo, jsconfig.json is a thing https://sourcegraph.com/search?q=context:global+file:jsconfig.json&patternType=literal
    configFileName && path.basename(configFileName) === 'jsconfig.json'
      ? {
          allowJs: true,
          maxNodeModuleJsDepth: 2,
          allowSyntheticDefaultImports: true,
          skipLibCheck: true,
          noEmit: true,
        }
      : {}
  return options
}

function listPnpmWorkspaces(directory: string): string[] {
  /**
   * Returns the list of projects formatted as:
   * '/Users/user/sourcegraph/client/web:@sourcegraph/web@1.10.1:PRIVATE',
   *
   * See https://pnpm.io/id/cli/list#--depth-number
   */
  const output = child_process.execSync(
    'pnpm ls -r --depth -1 --long --parseable',
    {
      cwd: directory,
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024 * 5, // 5MB
    }
  )

  return output
    .split(EOL)
    .filter(project => project.includes(':'))
    .map(project => project.split(':')[0])
}

function listYarnWorkspaces(
  directory: string,
  yarnVersion: 'tryYarn1' | 'yarn2Plus'
): string[] {
  const runYarn = (cmd: string): string =>
    child_process.execSync(cmd, {
      cwd: directory,
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024 * 5, // 5MB
    })
  const result: string[] = []
  const yarn1WorkspaceInfo = (): void => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const json = JSON.parse(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      JSON.parse(runYarn('yarn --silent --json workspaces info')).data
    )
    for (const key of Object.keys(json)) {
      const location = 'location'
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (json[key][location] !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        result.push(path.join(directory, json[key][location]))
      }
    }
  }
  const yarn2PlusWorkspaceInfo = (): void => {
    const jsonLines = runYarn('yarn --json workspaces list').split(
      /\r?\n|\r|\n/g
    )
    for (let line of jsonLines) {
      line = line.trim()
      if (line.length === 0) {
        continue
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const json = JSON.parse(line)
      if ('location' in json) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        result.push(path.join(directory, json.location))
      }
    }
  }
  if (yarnVersion === 'tryYarn1') {
    try {
      yarn2PlusWorkspaceInfo()
    } catch {
      yarn1WorkspaceInfo()
    }
  } else {
    yarn2PlusWorkspaceInfo()
  }
  return result
}
