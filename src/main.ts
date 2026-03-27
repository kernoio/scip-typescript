#!/usr/bin/env node
import * as fs from 'fs'
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
import { detect, detectCommand, FlatProjectNode } from './detectCommand'
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
  _projects: string[],
  options: MultiProjectOptions
): void {
  indexFiltered(options)
}

function indexFiltered(options: MultiProjectOptions): void {
  options.cwd = makeAbsolutePath(process.cwd(), options.cwd)
  options.output = makeAbsolutePath(options.cwd, options.output)

  const topology = detect(options.cwd)

  const allPackages: Array<{ name: string; absPath: string; dependencies?: string[] }> = []
  let targetPackage: { name: string; absPath: string; dependencies?: string[] } | undefined

  function collectPackages(nodes: FlatProjectNode[]): void {
    for (const node of nodes) {
      const absPath = path.resolve(options.cwd, node.path)
      allPackages.push({ name: node.name, absPath, dependencies: node.dependencies })
      if (node.name === options.filter) {
        targetPackage = { name: node.name, absPath, dependencies: node.dependencies }
      }
    }
  }
  for (const workspace of topology.workspaces) {
    collectPackages(workspace.projects)
  }

  const workspacePackageNames = new Set(allPackages.map(p => p.name))

  if (!targetPackage) {
    console.error(
      `error: package '${options.filter}' not found in workspace. Available packages: ${allPackages.map(p => p.name).join(', ')}`
    )
    process.exitCode = 1
    return
  }

  const descendantPaths = allPackages
    .filter(p => p.absPath !== targetPackage!.absPath &&
                 p.absPath.startsWith(targetPackage!.absPath + path.sep))
    .map(p => './' + path.relative(targetPackage!.absPath, p.absPath))

  const allPackagesByName = new Map(allPackages.map(p => [p.name, p]))

  const workspaceDepsToLink = new Set<string>()
  const queue = [...(targetPackage.dependencies ?? [])]
  while (queue.length > 0) {
    const depName = queue.pop()!
    if (workspaceDepsToLink.has(depName)) continue
    const dep = allPackagesByName.get(depName)
    if (!dep) continue
    workspaceDepsToLink.add(depName)
    for (const transitive of dep.dependencies ?? []) {
      queue.push(transitive)
    }
  }

  const createdSymlinks: string[] = []
  for (const depName of workspaceDepsToLink) {
    const dep = allPackagesByName.get(depName)!
    const linkPath = path.join(targetPackage.absPath, 'node_modules', ...depName.split('/'))
    const linkDir = path.dirname(linkPath)
    if (!fs.existsSync(linkDir)) {
      fs.mkdirSync(linkDir, { recursive: true })
    }
    if (!fs.existsSync(linkPath)) {
      fs.symlinkSync(dep.absPath, linkPath, 'dir')
      createdSymlinks.push(linkPath)
    }
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
      configFile = packageTsconfigPath
    }
  }

  const transformCompilerOptions = (compilerOptions: Record<string, unknown>): Record<string, unknown> => {
    return {
      ...compilerOptions,
      noEmit: true,
      skipLibCheck: true,
    }
  }

  let config: ts.ParsedCommandLine | undefined
  if (configFile) {
    config = loadConfigFile(configFile, {
      transformCompilerOptions,
      include: ['./**/*'],
    })
  } else {
    const syntheticCompilerOptions = transformCompilerOptions({
      allowJs: true,
      ...defaultCompilerOptions(),
    })
    const syntheticConfig = {
      compilerOptions: syntheticCompilerOptions,
      include: ['./**/*'],
      exclude: descendantPaths,
    }
    const basePath = targetPackage.absPath
    const parseResult = ts.parseJsonConfigFileContent(syntheticConfig, ts.sys, basePath)
    const errors: ts.Diagnostic[] = []
    for (const error of parseResult.errors) {
      if (error.code === 18003) {
        continue
      }
      errors.push(error)
    }
    if (errors.length > 0) {
      console.log(ts.formatDiagnostics(errors, ts.createCompilerHost({})))
    } else {
      config = parseResult
    }
  }

  if (config) {
    config.fileNames = config.fileNames.filter(f => !isIndexTestFile(f))
  }

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
        workspacePackageNames,
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
    for (const link of createdSymlinks) {
      try { fs.unlinkSync(link) } catch {}
    }
  }
}

function makeAbsolutePath(cwd: string, relativeOrAbsolutePath: string): string {
  if (path.isAbsolute(relativeOrAbsolutePath)) {
    return relativeOrAbsolutePath
  }
  return path.resolve(cwd, relativeOrAbsolutePath)
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

function isIndexTestFile(filePath: string): boolean {
  const base = path.basename(filePath)
  if (base.includes('.test.') || base.includes('.spec.') || base.includes('.test-d.')) {
    return true
  }
  const parts = filePath.split(path.sep)
  return parts.some(p => p === '__tests__' || p === 'test' || p === 'tests' || p === 'fixtures')
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
