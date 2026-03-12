import * as fs from 'fs'
import * as path from 'path'
import * as ts from 'typescript'

export interface ProjectNode {
  name: string
  path: string
  buildFiles: string[]
  language?: string
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

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts', '.cjs', '.cts'])

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
  const hasFiles = tsCount.value > 0 || jsCount.value > 0
  let language: 'ts' | 'js' | 'mixed' | undefined
  if (hasFiles) {
    if (tsCount.value > 0 && jsCount.value > 0) {
      language = 'mixed'
    } else if (tsCount.value > 0) {
      language = 'ts'
    } else {
      language = 'js'
    }
  }

  const buildTool = detectBuildTool(dir, rootDir, parentBuildTool)
  const config = detectConfig(dir)
  const buildFiles = collectBuildFiles(config)

  const allDeps: Record<string, string> = {
    ...(pkg?.['dependencies'] as Record<string, string> | undefined),
    ...(pkg?.['devDependencies'] as Record<string, string> | undefined),
  }
  const ownName = pkg?.['name'] as string | undefined
  const declaredDeps = new Set(Object.keys(allDeps).filter(dep => dep !== ownName && allPackageNames.has(dep)))

  const undeclaredSiblings = new Set<string>()
  for (const name of allPackageNames) {
    if (name !== ownName && !declaredDeps.has(name)) {
      undeclaredSiblings.add(name)
    }
  }

  const implicitDeps = undeclaredSiblings.size > 0 ? scanImportedSiblings(dir, undeclaredSiblings) : []
  const dependencies = [...new Set([...declaredDeps, ...implicitDeps])].sort()

  const subProjects: ProjectNode[] = []
  for (const childDir of childDirs) {
    const childPkg = dirToPkg.get(childDir)
    const childGlobs = extractWorkspaceGlobs(childDir, childPkg)
    const grandchildren = childGlobs.length > 0 ? resolveWorkspaceGlobs(childDir, childGlobs) : []
    const childNode = buildNode(childDir, rootDir, childPkg, grandchildren, dirToPkg, allPackageNames, buildTool ?? null)
    subProjects.push(childNode)
  }

  const node: ProjectNode = { name, path: relPath, buildFiles }

  if (language !== undefined) {
    node.language = language
  }

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
  if (fs.existsSync(path.join(dir, 'pnpm-lock.yaml'))) {
    return 'pnpm'
  }
  if (fs.existsSync(path.join(dir, 'yarn.lock'))) {
    return 'yarn'
  }
  if (fs.existsSync(path.join(dir, 'package-lock.json'))) {
    return 'npm'
  }
  return undefined
}

function collectBuildFiles(config: { configFile: string } | undefined): string[] {
  const files = ['package.json']
  if (config) {
    files.push(config.configFile)
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

function scanImportedSiblings(dir: string, siblingNames: Set<string>): string[] {
  const discovered = new Set<string>()
  walkSourceFiles(dir, (filePath) => {
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
  })
  return [...discovered]
}

function walkSourceFiles(dir: string, callback: (filePath: string) => void): void {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || TEST_PATTERNS.has(entry.name)) continue
      walkSourceFiles(path.join(dir, entry.name), callback)
    } else if (entry.isFile()) {
      const ext = getExtension(entry.name)
      if (!SOURCE_EXTENSIONS.has(ext)) continue
      if (entry.name.match(/\.d\.[cm]?ts$/)) continue
      if (isTestFile(entry.name)) continue
      callback(path.join(dir, entry.name))
    }
  }
}

function getExtension(fileName: string): string {
  const dtsMatch = fileName.match(/\.d\.[cm]?ts$/)
  if (dtsMatch) return dtsMatch[0]
  const match = fileName.match(/\.[^.]+$/)
  return match ? match[0] : ''
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
      if (Array.isArray(value) && value.length === 0) {
        continue
      }
      cleaned[key] = cleanOutput(value)
    }
    return cleaned
  }
  return obj
}
