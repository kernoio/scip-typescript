import * as fs from 'fs'
import * as path from 'path'
import * as ts from 'typescript'

export interface ProjectNode {
  name: string
  path: string
  buildFiles: string[]
  languages: string[]
  buildTool?: string
  config?: {
    type: 'typescript'
    configFile: string
    allowJs?: boolean
  }
  dependencies?: string[]
  subProjects?: ProjectNode[]
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

export function detect(cwd: string): { tool: string; projects: ProjectNode[] } {
  const rootDir = path.resolve(cwd)
  const allPackageJsonDirs = walkForPackageJsonDirs(rootDir)

  const allPackageNames = new Set<string>()
  const dirToPkg = new Map<string, Record<string, unknown>>()

  for (const dir of allPackageJsonDirs) {
    const pkg = readPackageJson(dir)
    if (pkg) {
      dirToPkg.set(dir, pkg)
      const name = pkg['name'] as string | undefined
      if (name) {
        allPackageNames.add(name)
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

  const rootNodes: ProjectNode[] = []

  for (const dir of workspaceRoots) {
    if (!claimedDirs.has(dir)) {
      const pkg = dirToPkg.get(dir)
      const globs = extractWorkspaceGlobs(dir, pkg)
      const children = resolveWorkspaceGlobs(dir, globs)
      const node = buildNode(dir, rootDir, pkg, children, dirToPkg, allPackageNames, null)
      rootNodes.push(node)
    }
  }

  for (const dir of allPackageJsonDirs) {
    if (!claimedDirs.has(dir) && !workspaceRoots.includes(dir)) {
      const pkg = dirToPkg.get(dir)
      const node = buildNode(dir, rootDir, pkg, [], dirToPkg, allPackageNames, null)
      rootNodes.push(node)
    }
  }

  return { tool: 'typescript', projects: rootNodes }
}

export function detectCommand(cwd: string): void {
  const result = detect(cwd)
  console.log(JSON.stringify(cleanOutput(result), null, 2))
}

function buildNode(
  dir: string,
  rootDir: string,
  pkg: Record<string, unknown> | undefined,
  childDirs: string[],
  dirToPkg: Map<string, Record<string, unknown>>,
  allPackageNames: Set<string>,
  parentBuildTool: string | null
): ProjectNode {
  const name = (pkg?.['name'] as string | undefined) ?? path.basename(dir)
  const relPath = path.relative(rootDir, dir) || '.'

  const tsCount = { value: 0 }
  const jsCount = { value: 0 }
  countFiles(dir, tsCount, jsCount)
  const languages: string[] = []
  if (tsCount.value > 0) {
    languages.push('typescript')
  }
  if (jsCount.value > 0) {
    languages.push('javascript')
  }

  const buildTool = detectBuildTool(dir, rootDir, parentBuildTool)
  const config = detectConfig(dir)
  const buildFiles = collectBuildFiles(dir, buildTool, config)

  const allDeps: Record<string, string> = {
    ...(pkg?.['dependencies'] as Record<string, string> | undefined),
  }
  const ownName = pkg?.['name'] as string | undefined
  const declaredDeps = new Set(Object.keys(allDeps).filter(dep => dep !== ownName && allPackageNames.has(dep)))

  const undeclaredSiblings = new Set<string>()
  for (const name of allPackageNames) {
    if (name !== ownName && !declaredDeps.has(name)) {
      undeclaredSiblings.add(name)
    }
  }

  const tsconfigPath = config ? path.join(dir, config.configFile) : undefined
  const implicitDeps = undeclaredSiblings.size > 0 ? scanImportedSiblings(dir, undeclaredSiblings, pkg, tsconfigPath) : []
  const dependencies = [...new Set([...declaredDeps, ...implicitDeps])].sort()

  const subProjects: ProjectNode[] = []
  for (const childDir of childDirs) {
    const childPkg = dirToPkg.get(childDir)
    const childGlobs = extractWorkspaceGlobs(childDir, childPkg)
    const grandchildren = childGlobs.length > 0 ? resolveWorkspaceGlobs(childDir, childGlobs) : []
    const childNode = buildNode(childDir, rootDir, childPkg, grandchildren, dirToPkg, allPackageNames, buildTool ?? null)
    subProjects.push(childNode)
  }

  const node: ProjectNode = { name, path: relPath, buildFiles, languages }

  if (buildTool) {
    node.buildTool = buildTool
  }

  if (config) {
    node.config = config
  }

  if (dependencies.length > 0) {
    node.dependencies = dependencies
  }

  if (subProjects.length > 0) {
    node.subProjects = subProjects
  }

  return node
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

  if (fs.existsSync(path.join(dir, 'package.json'))) {
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
    return JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8')) as Record<string, unknown>
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
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8')) as Record<string, unknown>
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
  const files = ['package.json']

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

  for (const configFile of ['bunfig.toml', '.yarnrc', '.yarnrc.yml', '.npmrc', '.pnpmfile.cjs']) {
    if (fs.existsSync(path.join(dir, configFile))) {
      files.push(configFile)
    }
  }

  return files
}

function detectConfig(dir: string): { type: 'typescript'; configFile: string; allowJs?: boolean } | undefined {
  const tsconfigPath = path.join(dir, 'tsconfig.json')
  if (fs.existsSync(tsconfigPath)) {
    const readResult = ts.readConfigFile(tsconfigPath, p => ts.sys.readFile(p))
    if (!readResult.error) {
      const config = readResult.config as { compilerOptions?: { allowJs?: boolean } }
      const allowJs = config.compilerOptions?.allowJs === true
      const entry: { type: 'typescript'; configFile: string; allowJs?: boolean } = { type: 'typescript', configFile: 'tsconfig.json' }
      if (allowJs) {
        entry.allowJs = true
      }
      return entry
    }
    return { type: 'typescript', configFile: 'tsconfig.json' }
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
      if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'package.json'))) {
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
    if (fs.existsSync(path.join(candidate, 'package.json'))) {
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
    if (fs.existsSync(path.join(candidate, 'package.json'))) {
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
  tsconfigPath?: string
): string[] {
  const discovered = new Set<string>()

  const entryPoint = resolveEntryPoint(dir, pkg)
  if (entryPoint) {
    const visited = new Set<string>()
    walkFromFile(entryPoint, siblingNames, discovered, visited)
    return [...discovered]
  }

  const scanFile = (filePath: string) => {
    const text = fs.readFileSync(filePath, 'utf-8')
    const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, false)
    for (const stmt of sourceFile.statements) {
      const specifier = extractModuleSpecifier(stmt)
      if (specifier === undefined) continue
      const packageName = extractPackageName(specifier)
      if (packageName && siblingNames.has(packageName)) {
        discovered.add(packageName)
      }
    }
  }

  if (tsconfigPath) {
    const readResult = ts.readConfigFile(tsconfigPath, p => ts.sys.readFile(p))
    if (!readResult.error) {
      const basePath = path.dirname(tsconfigPath)
      const parsed = ts.parseJsonConfigFileContent(readResult.config, ts.sys, basePath)
      for (const filePath of parsed.fileNames) {
        if (isTestFile(filePath) || filePath.match(/\.d\.[cm]?ts$/)) continue
        scanFile(filePath)
      }
      return [...discovered]
    }
  }

  return []
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
    const specifier = extractModuleSpecifier(stmt)
    if (specifier === undefined) continue

    if (specifier.startsWith('.') || specifier.startsWith('/')) {
      const resolved = ts.resolveModuleName(specifier, filePath, ENTRY_POINT_RESOLUTION_OPTIONS, ts.sys)
      const resolvedPath = resolved.resolvedModule?.resolvedFileName
      if (resolvedPath) {
        walkFromFile(resolvedPath, siblingNames, discovered, visited)
      }
    } else {
      const packageName = extractPackageName(specifier)
      if (packageName && siblingNames.has(packageName)) {
        discovered.add(packageName)
      }
    }
  }
}


function extractModuleSpecifier(stmt: ts.Statement): string | undefined {
  if (ts.isImportDeclaration(stmt) && ts.isStringLiteral(stmt.moduleSpecifier)) {
    return stmt.moduleSpecifier.text
  }
  if (ts.isExportDeclaration(stmt) && stmt.moduleSpecifier && ts.isStringLiteral(stmt.moduleSpecifier)) {
    return stmt.moduleSpecifier.text
  }
  if (ts.isExpressionStatement(stmt)) {
    const expr = stmt.expression
    if (ts.isCallExpression(expr) && expr.arguments.length > 0) {
      const callee = expr.expression
      if (ts.isIdentifier(callee) && callee.text === 'require') {
        const arg = expr.arguments[0]
        if (ts.isStringLiteral(arg)) return arg.text
      }
    }
  }
  if (ts.isVariableStatement(stmt)) {
    for (const decl of stmt.declarationList.declarations) {
      if (decl.initializer && ts.isCallExpression(decl.initializer)) {
        const callee = decl.initializer.expression
        if (ts.isIdentifier(callee) && callee.text === 'require' && decl.initializer.arguments.length > 0) {
          const arg = decl.initializer.arguments[0]
          if (ts.isStringLiteral(arg)) return arg.text
        }
      }
    }
  }
  return undefined
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
  jsCount: { value: number }
): void {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name) && !TEST_PATTERNS.has(entry.name)) {
        countFiles(path.join(dir, entry.name), tsCount, jsCount)
      }
    } else if (entry.isFile()) {
      const name = entry.name
      if (isTestFile(name)) continue
      if (name.endsWith('.d.ts')) {
        continue
      }
      if (name.endsWith('.ts') || name.endsWith('.tsx')) {
        tsCount.value++
      } else if (name.endsWith('.js') || name.endsWith('.jsx')) {
        jsCount.value++
      }
    }
  }
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
