import * as fs from 'fs'
import * as path from 'path'
import * as ts from 'typescript'

export interface FlatProjectNode {
  name: string
  path: string
  parent: string | null
  children: string[]
  producesArtifacts: boolean
  buildFiles: string[]
  languages: string[]
  buildTool?: string
  config?: {
    type: 'typescript'
    configFile: string
    allowJs?: boolean
  }
  dependencies?: string[]
  imports?: Record<string, Record<string, Record<string, number>>>
}

export interface Workspace {
  root: string
  type: string
  projects: FlatProjectNode[]
}

export interface DetectOutput {
  tool: string
  workspaces: Workspace[]
}

interface TreeNode {
  name: string
  dir: string
  relPath: string
  buildFiles: string[]
  languages: string[]
  buildTool?: string
  config?: {
    type: 'typescript'
    configFile: string
    allowJs?: boolean
  }
  dependencyNames: string[]
  children: TreeNode[]
  pkg: Record<string, unknown> | undefined
  imports?: Record<string, Record<string, Record<string, number>>>
}

function hasProjectMarker(dir: string): boolean {
  return fs.existsSync(path.join(dir, 'package.json')) || fs.existsSync(path.join(dir, 'project.json'))
}

function readNxProjectJson(dir: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, 'project.json'), 'utf-8')) as Record<string, unknown>
  } catch {
    return undefined
  }
}

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  'out',
  '__pycache__',
  '.turbo',
  '.cache',
  '.yarn',
  'test',
  'tests',
  '__tests__',
  'testing',
  'fixtures',
  '__fixtures__',
  '__mocks__',
])

const TEST_PATTERNS = new Set([
  '__tests__',
  '__mocks__',
  '__snapshots__',
  'test',
  'tests',
  'fixtures',
])

function isTestFile(fileName: string): boolean {
  const base = path.basename(fileName)
  return base.includes('.test.') || base.includes('.spec.') || base.includes('.test-d.')
}

const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx'])

interface ModuleImport {
  module: string
  namedSpecifiers: string[]
}

function extractSpecifiersFromSourceFile(filePath: string): ModuleImport[] {
  let text: string
  try {
    text = fs.readFileSync(filePath, 'utf-8')
  } catch {
    return []
  }
  const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, false)
  const imports: ModuleImport[] = []
  for (const stmt of sourceFile.statements) {
    const moduleImport = extractModuleSpecifier(stmt)
    if (moduleImport !== undefined) {
      imports.push(moduleImport)
    }
  }
  return imports
}

function preParseAllSourceFiles(rootDir: string): Map<string, ModuleImport[]> {
  const result = new Map<string, ModuleImport[]>()

  function walkAndParse(dir: string): void {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue
        walkAndParse(path.join(dir, entry.name))
        continue
      }
      if (!entry.isFile() || !SOURCE_EXTS.has(path.extname(entry.name))) continue
      const filePath = path.join(dir, entry.name)
      if (isTestFile(filePath) || filePath.match(/\.d\.[cm]?ts$/)) continue
      const imports = extractSpecifiersFromSourceFile(filePath)
      if (imports.length > 0) {
        result.set(filePath, imports)
      }
    }
  }

  walkAndParse(rootDir)
  return result
}

export function detect(cwd: string): DetectOutput {
  const rootDir = path.resolve(cwd)
  const allPackageJsonDirs = walkForPackageJsonDirs(rootDir)
  const parsedSourceFiles = preParseAllSourceFiles(rootDir)

  const allPackageNames = new Set<string>()
  const dirToPkg = new Map<string, Record<string, unknown>>()
  const nameToDir = new Map<string, string>()

  for (const dir of allPackageJsonDirs) {
    const pkg = readPackageJson(dir)
    if (pkg) {
      dirToPkg.set(dir, pkg)
      const name = pkg['name'] as string | undefined
      if (name) {
        allPackageNames.add(name)
        nameToDir.set(name, dir)
      }
    }
  }

  const workspaceRoots: string[] = []
  const claimedDirs = new Map<string, string>()

  for (const dir of allPackageJsonDirs) {
    const globs = extractWorkspaceGlobs(dir, dirToPkg.get(dir))
    if (globs.length > 0) {
      workspaceRoots.push(dir)
      const children = resolveWorkspaceGlobs(dir, globs)
      for (const child of children) {
        claimedDirs.set(child, dir)
      }
    }
  }

  for (const dir of claimedDirs.keys()) {
    if (!dirToPkg.has(dir)) {
      const nxProject = readNxProjectJson(dir)
      if (nxProject) {
        const syntheticPkg: Record<string, unknown> = {}
        const nxName = nxProject['name'] as string | undefined
        if (nxName) syntheticPkg['name'] = nxName
        dirToPkg.set(dir, syntheticPkg)
        const name = nxName ?? path.basename(dir)
        allPackageNames.add(name)
        nameToDir.set(name, dir)
      }
    }
  }

  const rootTreeNodes: TreeNode[] = []

  for (const dir of workspaceRoots) {
    if (!claimedDirs.has(dir)) {
      const pkg = dirToPkg.get(dir)
      const globs = extractWorkspaceGlobs(dir, pkg)
      const children = resolveWorkspaceGlobs(dir, globs)
      const node = buildTreeNode(dir, rootDir, pkg, children, dirToPkg, allPackageNames, null, parsedSourceFiles)
      rootTreeNodes.push(node)
    }
  }

  for (const dir of allPackageJsonDirs) {
    if (!claimedDirs.has(dir) && !workspaceRoots.includes(dir)) {
      const pkg = dirToPkg.get(dir)
      const node = buildTreeNode(dir, rootDir, pkg, [], dirToPkg, allPackageNames, null, parsedSourceFiles)
      rootTreeNodes.push(node)
    }
  }

  const allNodes: TreeNode[] = []
  for (const rootNode of rootTreeNodes) {
    collectAllNodes(rootNode, allNodes)
  }
  const allDirs = allNodes.map(n => n.dir)
  for (const node of allNodes) {
    const physicalDescendantDirs = new Set(
      allDirs.filter(d => d !== node.dir && d.startsWith(node.dir + path.sep))
    )
    const tsCount = { value: 0 }
    const jsCount = { value: 0 }
    countFiles(node.dir, tsCount, jsCount, physicalDescendantDirs)
    if (tsCount.value > 0) node.languages.push('typescript')
    if (jsCount.value > 0) node.languages.push('javascript')
  }

  const workspaces: Workspace[] = rootTreeNodes.map(rootNode => {
    const rootPkg = rootNode.pkg
    const workspaceType = deriveWorkspaceType(rootNode.dir, rootNode.buildTool, rootPkg)
    const flatProjects = flattenTree(rootNode, null, rootDir, nameToDir)
    return {
      root: rootNode.relPath,
      type: workspaceType,
      projects: flatProjects,
    }
  })

  return { tool: 'typescript', workspaces }
}

export function detectCommand(cwd: string): void {
  const result = detect(cwd)
  console.log(JSON.stringify(cleanOutput(result), null, 2))
}

function deriveWorkspaceType(dir: string, buildTool: string | undefined, pkg: Record<string, unknown> | undefined): string {
  if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
    return 'pnpm'
  }
  const hasWorkspacesField = pkg !== undefined && (
    Array.isArray(pkg['workspaces']) ||
    (pkg['workspaces'] !== null && typeof pkg['workspaces'] === 'object')
  )
  if (hasWorkspacesField) {
    if (buildTool === 'npm') return 'npm'
    if (buildTool === 'yarn') return 'yarn'
    if (buildTool === 'bun') return 'bun'
  }
  return 'standalone'
}

function producesArtifacts(pkg: Record<string, unknown> | undefined, hasChildren: boolean): boolean {
  if (!pkg) return true
  if (pkg['workspaces'] !== undefined && pkg['workspaces'] !== null && hasChildren) return false
  return true
}

function flattenTree(
  node: TreeNode,
  parentPath: string | null,
  rootDir: string,
  nameToDir: Map<string, string>
): FlatProjectNode[] {
  const result: FlatProjectNode[] = []
  const childPaths = node.children.map(c => c.relPath)

  const resolvedDependencies = node.dependencyNames
    .filter(name => nameToDir.has(name))
    .sort()

  const flat: FlatProjectNode = {
    name: node.name,
    path: node.relPath,
    parent: parentPath,
    children: childPaths,
    producesArtifacts: producesArtifacts(node.pkg, node.children.length > 0),
    buildFiles: node.buildFiles,
    languages: node.languages,
  }

  if (node.buildTool) {
    flat.buildTool = node.buildTool
  }

  if (node.config) {
    flat.config = node.config
  }

  if (resolvedDependencies.length > 0) {
    flat.dependencies = resolvedDependencies
  }

  if (node.imports && Object.keys(node.imports).length > 0) {
    flat.imports = node.imports
  }

  result.push(flat)

  for (const child of node.children) {
    result.push(...flattenTree(child, node.relPath, rootDir, nameToDir))
  }

  return result
}

interface InternalNameResolution {
  internalNames: Set<string>
  pathAliases: Set<string>
  nestedProjectDirs: Set<string>
}

function readTsconfigCompilerOptions(tsconfigPath: string): { paths?: Record<string, unknown>; baseUrl?: string } | undefined {
  const readResult = ts.readConfigFile(tsconfigPath, p => ts.sys.readFile(p))
  if (readResult.error) return undefined
  const config = readResult.config as { compilerOptions?: { paths?: Record<string, unknown>; baseUrl?: string } }
  return config.compilerOptions
}

function collectPathAliases(compilerOptions: { paths?: Record<string, unknown> }): Set<string> {
  const aliases = new Set<string>()
  if (!compilerOptions.paths) return aliases
  for (const key of Object.keys(compilerOptions.paths)) {
    const prefix = key.endsWith('*') ? key.slice(0, -1) : key
    if (prefix) aliases.add(prefix)
  }
  return aliases
}

function collectBaseUrlDirectories(tsconfigPath: string, baseUrl: string): string[] {
  const baseDir = path.resolve(path.dirname(tsconfigPath), baseUrl)
  try {
    return fs.readdirSync(baseDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
  } catch {
    return []
  }
}

function findNestedProjectDirs(dir: string, dirToPkg: Map<string, Record<string, unknown>>): Set<string> {
  const nested = new Set<string>()
  for (const projectDir of dirToPkg.keys()) {
    if (projectDir !== dir && projectDir.startsWith(dir + path.sep)) {
      nested.add(projectDir)
    }
  }
  return nested
}

function resolveInternalNames(
  tsconfigPath: string | undefined,
  allPackageNames: Set<string>,
  dir: string,
  dirToPkg: Map<string, Record<string, unknown>>
): InternalNameResolution {
  const internalNames = new Set(allPackageNames)
  let pathAliases = new Set<string>()

  if (tsconfigPath) {
    const compilerOptions = readTsconfigCompilerOptions(tsconfigPath)
    if (compilerOptions) {
      pathAliases = collectPathAliases(compilerOptions)
      if (compilerOptions.baseUrl) {
        for (const name of collectBaseUrlDirectories(tsconfigPath, compilerOptions.baseUrl)) {
          internalNames.add(name)
        }
      }
    }
  }

  return { internalNames, pathAliases, nestedProjectDirs: findNestedProjectDirs(dir, dirToPkg) }
}

function resolveDependencies(
  pkg: Record<string, unknown> | undefined,
  dir: string,
  allPackageNames: Set<string>,
  tsconfigPath: string | undefined,
  parsedSourceFiles?: Map<string, ModuleImport[]>
): string[] {
  const ownName = pkg?.['name'] as string | undefined
  const allDeps: Record<string, string> = {
    ...(pkg?.['dependencies'] as Record<string, string> | undefined),
  }
  const declaredDeps = new Set(Object.keys(allDeps).filter(dep => dep !== ownName && allPackageNames.has(dep)))

  const undeclaredSiblings = new Set<string>()
  for (const sibName of allPackageNames) {
    if (sibName !== ownName && !declaredDeps.has(sibName)) {
      undeclaredSiblings.add(sibName)
    }
  }

  const implicitDeps = undeclaredSiblings.size > 0
    ? scanImportedSiblings(dir, undeclaredSiblings, pkg, tsconfigPath, parsedSourceFiles)
    : []
  return [...new Set([...declaredDeps, ...implicitDeps])].sort()
}

function buildImportHeatmap(
  dir: string,
  tsconfigPath: string | undefined,
  allPackageNames: Set<string>,
  dirToPkg: Map<string, Record<string, unknown>>,
  parsedSourceFiles?: Map<string, ModuleImport[]>
): Record<string, Record<string, Record<string, number>>> {
  const { internalNames, pathAliases, nestedProjectDirs } = resolveInternalNames(tsconfigPath, allPackageNames, dir, dirToPkg)
  return scanImportHeatmap(dir, tsconfigPath, internalNames, pathAliases, nestedProjectDirs, parsedSourceFiles)
}

function buildTreeNode(
  dir: string,
  rootDir: string,
  pkg: Record<string, unknown> | undefined,
  childDirs: string[],
  dirToPkg: Map<string, Record<string, unknown>>,
  allPackageNames: Set<string>,
  parentBuildTool: string | null,
  parsedSourceFiles?: Map<string, ModuleImport[]>
): TreeNode {
  const name = (pkg?.['name'] as string | undefined) ?? path.basename(dir)
  const relPath = path.relative(rootDir, dir) || '.'

  const buildTool = detectBuildTool(dir, rootDir, parentBuildTool)
  const config = detectConfig(dir)
  const buildFiles = collectBuildFiles(dir, buildTool, config)

  const tsconfigPath = config ? path.join(dir, config.configFile) : undefined
  const dependencyNames = resolveDependencies(pkg, dir, allPackageNames, tsconfigPath, parsedSourceFiles)
  const imports = buildImportHeatmap(dir, tsconfigPath, allPackageNames, dirToPkg, parsedSourceFiles)

  const children: TreeNode[] = []
  for (const childDir of childDirs) {
    const childPkg = dirToPkg.get(childDir)
    const childGlobs = extractWorkspaceGlobs(childDir, childPkg)
    const grandchildren = childGlobs.length > 0 ? resolveWorkspaceGlobs(childDir, childGlobs) : []
    const childNode = buildTreeNode(childDir, rootDir, childPkg, grandchildren, dirToPkg, allPackageNames, buildTool ?? null, parsedSourceFiles)
    children.push(childNode)
  }

  return { name, dir, relPath, buildFiles, languages: [], buildTool, config, dependencyNames, children, pkg, imports }
}

function collectAllNodes(node: TreeNode, result: TreeNode[]): void {
  result.push(node)
  for (const child of node.children) {
    collectAllNodes(child, result)
  }
}

function walkForPackageJsonDirs(rootDir: string): string[] {
  const results: string[] = []
  walkDir(rootDir, results)
  return results
}

function walkDir(dir: string, results: string[]): void {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }

  if (hasProjectMarker(dir)) {
    results.push(dir)
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) {
      continue
    }
    walkDir(path.join(dir, entry.name), results)
  }
}

function readPackageJson(dir: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8').replace(/^\uFEFF/, '')) as Record<string, unknown>
  } catch {
    return undefined
  }
}

export function extractWorkspaceGlobs(dir: string, pkg: Record<string, unknown> | undefined): string[] {
  const pnpmWorkspacePath = path.join(dir, 'pnpm-workspace.yaml')
  if (fs.existsSync(pnpmWorkspacePath)) {
    const globs: string[] = []
    const content = fs.readFileSync(pnpmWorkspacePath, 'utf-8')
    for (const line of content.split('\n')) {
      const match = line.match(/^\s+-\s+['"]?([^'"]+)['"]?\s*$/)
      if (match) {
        globs.push(match[1])
      }
    }
    if (globs.length > 0) {
      return globs
    }
  }

  if (!pkg) {
    return []
  }

  const workspaces = pkg['workspaces']
  if (Array.isArray(workspaces)) {
    return workspaces as string[]
  }
  if (workspaces && typeof workspaces === 'object') {
    const pkgs = (workspaces as Record<string, unknown>)['packages']
    if (Array.isArray(pkgs)) {
      return pkgs as string[]
    }
  }
  return []
}

function detectBuildTool(dir: string, rootDir: string, parentBuildTool: string | null): string | undefined {
  const tool = detectBuildToolInDir(dir)
  if (tool) {
    return tool
  }

  let current = path.dirname(dir)
  while (current !== rootDir && current !== path.dirname(current)) {
    const found = detectBuildToolInDir(current)
    if (found) {
      return found
    }
    current = path.dirname(current)
  }

  const rootTool = detectBuildToolInDir(rootDir)
  if (rootTool) {
    return rootTool
  }

  return parentBuildTool ?? undefined
}

function detectBuildToolInDir(dir: string): string | undefined {
  if (fs.existsSync(path.join(dir, 'bun.lock')) || fs.existsSync(path.join(dir, 'bun.lockb'))) {
    return 'bun'
  }
  if (fs.existsSync(path.join(dir, 'pnpm-lock.yaml'))) {
    return 'pnpm'
  }
  if (fs.existsSync(path.join(dir, 'yarn.lock'))) {
    return 'yarn'
  }
  if (fs.existsSync(path.join(dir, 'package-lock.json'))) {
    return 'npm'
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8').replace(/^\uFEFF/, '')) as Record<string, unknown>
    const packageManager = pkg['packageManager']
    if (typeof packageManager === 'string') {
      const toolName = packageManager.split('@')[0]
      if (toolName === 'bun' || toolName === 'yarn' || toolName === 'pnpm' || toolName === 'npm') {
        return toolName
      }
    }
  } catch {
  }

  if (fs.existsSync(path.join(dir, 'bunfig.toml'))) {
    return 'bun'
  }
  if (fs.existsSync(path.join(dir, '.yarnrc')) || fs.existsSync(path.join(dir, '.yarnrc.yml'))) {
    return 'yarn'
  }
  if (fs.existsSync(path.join(dir, '.pnpmfile.cjs'))) {
    return 'pnpm'
  }
  if (fs.existsSync(path.join(dir, '.npmrc'))) {
    return 'npm'
  }

  return undefined
}

function collectBuildFiles(
  dir: string,
  buildTool: string | undefined,
  config: { configFile: string } | undefined
): string[] {
  const files: string[] = []

  if (fs.existsSync(path.join(dir, 'package.json'))) {
    files.push('package.json')
  }

  if (fs.existsSync(path.join(dir, 'project.json'))) {
    files.push('project.json')
  }

  if (config) {
    files.push(config.configFile)
  }

  if (buildTool === 'bun' && fs.existsSync(path.join(dir, 'bun.lock'))) {
    files.push('bun.lock')
  } else if (buildTool === 'bun' && fs.existsSync(path.join(dir, 'bun.lockb'))) {
    files.push('bun.lockb')
  } else if (buildTool === 'yarn' && fs.existsSync(path.join(dir, 'yarn.lock'))) {
    files.push('yarn.lock')
  } else if (buildTool === 'pnpm' && fs.existsSync(path.join(dir, 'pnpm-lock.yaml'))) {
    files.push('pnpm-lock.yaml')
  } else if (buildTool === 'npm' && fs.existsSync(path.join(dir, 'package-lock.json'))) {
    files.push('package-lock.json')
  }

  if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
    files.push('pnpm-workspace.yaml')
  }

  for (const configFile of ['bunfig.toml', '.yarnrc', '.yarnrc.yml', '.npmrc', '.pnpmfile.cjs']) {
    if (fs.existsSync(path.join(dir, configFile))) {
      files.push(configFile)
    }
  }

  return files
}

function parseTsconfigForDetect(tsconfigPath: string): { type: 'typescript'; configFile: string; allowJs?: boolean } {
  const readResult = ts.readConfigFile(tsconfigPath, p => ts.sys.readFile(p))
  if (readResult.error) return { type: 'typescript', configFile: 'tsconfig.json' }
  const config = readResult.config as { compilerOptions?: { allowJs?: boolean } }
  if (config.compilerOptions?.allowJs) {
    return { type: 'typescript', configFile: 'tsconfig.json', allowJs: true }
  }
  return { type: 'typescript', configFile: 'tsconfig.json' }
}

function detectConfig(dir: string): { type: 'typescript'; configFile: string; allowJs?: boolean } | undefined {
  const tsconfigPath = path.join(dir, 'tsconfig.json')
  if (fs.existsSync(tsconfigPath)) {
    return parseTsconfigForDetect(tsconfigPath)
  }
  if (fs.existsSync(path.join(dir, 'jsconfig.json'))) {
    return { type: 'typescript', configFile: 'jsconfig.json' }
  }
  return undefined
}

export function resolveWorkspaceGlobs(rootDir: string, globs: string[]): string[] {
  const results: string[] = []
  for (const glob of globs) {
    if (glob.endsWith('/**')) {
      const parent = path.join(rootDir, glob.slice(0, -3))
      if (fs.existsSync(parent)) {
        collectPackageDirsRecursive(parent, results)
      }
    } else if (glob.endsWith('/*')) {
      const parent = path.join(rootDir, glob.slice(0, -2))
      if (fs.existsSync(parent)) {
        collectPackageDirsShallow(parent, results)
      }
    } else {
      const candidate = path.join(rootDir, glob)
      if (fs.existsSync(candidate) && hasProjectMarker(candidate)) {
        results.push(candidate)
      }
    }
  }
  return [...new Set(results)]
}

function collectPackageDirsShallow(parent: string, results: string[]): void {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(parent, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }
    const candidate = path.join(parent, entry.name)
    if (hasProjectMarker(candidate)) {
      results.push(candidate)
    }
  }
}

function collectPackageDirsRecursive(parent: string, results: string[]): void {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(parent, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }
    const candidate = path.join(parent, entry.name)
    if (hasProjectMarker(candidate)) {
      results.push(candidate)
    }
    collectPackageDirsRecursive(candidate, results)
  }
}

export function resolveEntryPoint(dir: string, pkg: Record<string, unknown> | undefined): string | undefined {
  if (!pkg) return undefined

  const candidates: unknown[] = [pkg['module'], pkg['main'], pkg['exports'], pkg['bin']]

  for (const candidate of candidates) {
    const resolved = extractFirstStringValue(candidate)
    if (resolved) {
      const fullPath = path.resolve(dir, resolved)
      if (fs.existsSync(fullPath)) return fullPath
    }
  }

  return undefined
}

function extractFirstStringValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (value !== null && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) {
      const found = extractFirstStringValue(v)
      if (found) return found
    }
  }
  return undefined
}

const ENTRY_POINT_RESOLUTION_OPTIONS: ts.CompilerOptions = {
  moduleResolution: ts.ModuleResolutionKind.Node10,
  allowJs: true,
}

function scanImportedSiblings(
  dir: string,
  siblingNames: Set<string>,
  pkg: Record<string, unknown> | undefined,
  tsconfigPath?: string,
  parsedSourceFiles?: Map<string, ModuleImport[]>
): string[] {
  const discovered = new Set<string>()

  const entryPoint = resolveEntryPoint(dir, pkg)
  if (entryPoint) {
    const visited = new Set<string>()
    walkFromFile(entryPoint, siblingNames, discovered, visited)
    return [...discovered]
  }

  if (!tsconfigPath) return []

  const tsconfigFiles = getFilesFromTsconfig(tsconfigPath)
  if (!tsconfigFiles) return []

  for (const filePath of tsconfigFiles) {
    if (isTestFile(filePath) || filePath.match(/\.d\.[cm]?ts$/)) continue
    const moduleImports = getSpecifiersForFile(filePath, parsedSourceFiles)
    for (const moduleImport of moduleImports) {
      const packageName = extractPackageName(moduleImport.module)
      if (packageName && siblingNames.has(packageName)) {
        discovered.add(packageName)
      }
    }
  }

  return [...discovered]
}

function walkFromFile(
  filePath: string,
  siblingNames: Set<string>,
  discovered: Set<string>,
  visited: Set<string>
): void {
  if (visited.has(filePath)) return
  visited.add(filePath)

  let text: string
  try {
    text = fs.readFileSync(filePath, 'utf-8')
  } catch {
    return
  }

  const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, false)

  for (const stmt of sourceFile.statements) {
    const moduleImport = extractModuleSpecifier(stmt)
    if (moduleImport === undefined) continue

    if (moduleImport.module.startsWith('.') || moduleImport.module.startsWith('/')) {
      const resolved = ts.resolveModuleName(moduleImport.module, filePath, ENTRY_POINT_RESOLUTION_OPTIONS, ts.sys)
      const resolvedPath = resolved.resolvedModule?.resolvedFileName
      if (resolvedPath) {
        walkFromFile(resolvedPath, siblingNames, discovered, visited)
      }
    } else {
      const packageName = extractPackageName(moduleImport.module)
      if (packageName && siblingNames.has(packageName)) {
        discovered.add(packageName)
      }
    }
  }
}


function extractRequireCall(expr: ts.Expression): string | undefined {
  if (!ts.isCallExpression(expr)) return undefined
  if (!ts.isIdentifier(expr.expression) || expr.expression.text !== 'require') return undefined
  if (expr.arguments.length === 0) return undefined
  const arg = expr.arguments[0]
  if (ts.isStringLiteral(arg)) return arg.text
  return undefined
}

function extractRequireSpecifier(stmt: ts.Statement): ModuleImport | undefined {
  if (ts.isExpressionStatement(stmt)) {
    const module = extractRequireCall(stmt.expression)
    if (module) return { module, namedSpecifiers: ['*'] }
    return undefined
  }
  if (!ts.isVariableStatement(stmt)) return undefined
  for (const decl of stmt.declarationList.declarations) {
    if (!decl.initializer) continue
    const module = extractRequireCall(decl.initializer)
    if (!module) continue
    if (ts.isObjectBindingPattern(decl.name)) {
      const namedSpecifiers = decl.name.elements
        .map(el => (ts.isIdentifier(el.propertyName ?? el.name) ? (el.propertyName ?? el.name) as ts.Identifier : undefined))
        .filter((id): id is ts.Identifier => id !== undefined)
        .map(id => id.text)
      return { module, namedSpecifiers: namedSpecifiers.length > 0 ? namedSpecifiers : ['default'] }
    }
    return { module, namedSpecifiers: ['default'] }
  }
  return undefined
}

function extractNamedImportSpecifiers(importClause: ts.ImportClause | undefined): string[] {
  if (!importClause) return ['*']
  const specifiers: string[] = []
  if (importClause.name) {
    specifiers.push('default')
  }
  if (importClause.namedBindings) {
    if (ts.isNamespaceImport(importClause.namedBindings)) {
      specifiers.push('*')
    } else {
      for (const el of importClause.namedBindings.elements) {
        specifiers.push(el.propertyName ? el.propertyName.text : el.name.text)
      }
    }
  }
  return specifiers.length > 0 ? specifiers : ['*']
}

function extractModuleSpecifier(stmt: ts.Statement): ModuleImport | undefined {
  if (ts.isImportDeclaration(stmt) && ts.isStringLiteral(stmt.moduleSpecifier)) {
    const module = stmt.moduleSpecifier.text
    const namedSpecifiers = extractNamedImportSpecifiers(stmt.importClause)
    return { module, namedSpecifiers }
  }
  if (ts.isExportDeclaration(stmt) && stmt.moduleSpecifier && ts.isStringLiteral(stmt.moduleSpecifier)) {
    const module = stmt.moduleSpecifier.text
    if (stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
      const namedSpecifiers = stmt.exportClause.elements.map(el => el.propertyName ? el.propertyName.text : el.name.text)
      return { module, namedSpecifiers: namedSpecifiers.length > 0 ? namedSpecifiers : ['*'] }
    }
    return { module, namedSpecifiers: ['*'] }
  }
  return extractRequireSpecifier(stmt)
}

function extractPackageName(specifier: string): string | undefined {
  if (specifier.startsWith('.') || specifier.startsWith('/')) return undefined
  if (specifier.startsWith('@')) {
    const parts = specifier.split('/')
    if (parts.length >= 2) return parts[0] + '/' + parts[1]
    return undefined
  }
  return specifier.split('/')[0]
}

function countFiles(
  dir: string,
  tsCount: { value: number },
  jsCount: { value: number },
  excludeDirs?: Set<string>
): void {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const childDir = path.join(dir, entry.name)
      if (SKIP_DIRS.has(entry.name) || TEST_PATTERNS.has(entry.name) || excludeDirs?.has(childDir)) continue
      countFiles(childDir, tsCount, jsCount, excludeDirs)
      continue
    }
    if (!entry.isFile()) continue
    const name = entry.name
    if (isTestFile(name) || name.endsWith('.d.ts')) continue
    if (name.endsWith('.ts') || name.endsWith('.tsx')) {
      tsCount.value++
    } else if (name.endsWith('.js') || name.endsWith('.jsx')) {
      jsCount.value++
    }
  }
}

function isExternalSpecifier(specifier: string, internalNames: Set<string>, pathAliases: Set<string>): boolean {
  if (specifier.startsWith('.') || specifier.startsWith('#')) return false
  const packageName = extractPackageName(specifier)
  if (!packageName) return false
  if (internalNames.has(packageName)) return false
  if ([...pathAliases].some(alias => specifier === alias || specifier.startsWith(alias))) return false
  return true
}

function getSpecifiersForFile(filePath: string, parsedSourceFiles: Map<string, ModuleImport[]> | undefined): ModuleImport[] {
  return parsedSourceFiles?.get(filePath) ?? extractSpecifiersFromSourceFile(filePath)
}

function getFilesFromTsconfig(tsconfigPath: string): string[] | undefined {
  const readResult = ts.readConfigFile(tsconfigPath, p => ts.sys.readFile(p))
  if (readResult.error) return undefined
  const basePath = path.dirname(tsconfigPath)
  const parsed = ts.parseJsonConfigFileContent(readResult.config, ts.sys, basePath)
  return parsed.fileNames.length > 0 ? parsed.fileNames : undefined
}

function walkDirForSourceFiles(dir: string, excludeDirs: Set<string>): string[] {
  const files: string[] = []
  const recurse = (d: string) => {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(d, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const childPath = path.join(d, entry.name)
        if (SKIP_DIRS.has(entry.name) || excludeDirs.has(childPath)) continue
        recurse(childPath)
        continue
      }
      if (!entry.isFile() || !SOURCE_EXTS.has(path.extname(entry.name))) continue
      files.push(path.join(d, entry.name))
    }
  }
  recurse(dir)
  return files
}

function recordExternalImports(
  filePath: string,
  projectDir: string,
  internalNames: Set<string>,
  pathAliases: Set<string>,
  result: Record<string, Record<string, Record<string, number>>>,
  parsedSourceFiles?: Map<string, ModuleImport[]>
): void {
  if (isTestFile(filePath) || filePath.match(/\.d\.[cm]?ts$/)) return
  const relativeDir = path.relative(projectDir, path.dirname(filePath)) || '.'
  const moduleImports = getSpecifiersForFile(filePath, parsedSourceFiles)
  for (const moduleImport of moduleImports) {
    if (!isExternalSpecifier(moduleImport.module, internalNames, pathAliases)) continue
    const packageName = extractPackageName(moduleImport.module)!
    if (!result[relativeDir]) result[relativeDir] = Object.create(null)
    if (!result[relativeDir][packageName]) result[relativeDir][packageName] = Object.create(null)
    for (const namedSpecifier of moduleImport.namedSpecifiers) {
      result[relativeDir][packageName][namedSpecifier] = (result[relativeDir][packageName][namedSpecifier] ?? 0) + 1
    }
  }
}

function scanImportHeatmap(
  dir: string,
  tsconfigPath: string | undefined,
  internalNames: Set<string>,
  pathAliases: Set<string>,
  excludeDirs: Set<string> = new Set(),
  parsedSourceFiles?: Map<string, ModuleImport[]>
): Record<string, Record<string, Record<string, number>>> {
  const result: Record<string, Record<string, Record<string, number>>> = Object.create(null)

  const filesToScan = tsconfigPath
    ? (getFilesFromTsconfig(tsconfigPath) ?? walkDirForSourceFiles(dir, excludeDirs))
    : walkDirForSourceFiles(dir, excludeDirs)

  for (const filePath of filesToScan) {
    recordExternalImports(filePath, dir, internalNames, pathAliases, result, parsedSourceFiles)
  }

  return result
}

function cleanOutput(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(cleanOutput)
  }
  if (obj !== null && typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value === undefined || value === null) {
        continue
      }
      cleaned[key] = cleanOutput(value)
    }
    return cleaned
  }
  return obj
}
