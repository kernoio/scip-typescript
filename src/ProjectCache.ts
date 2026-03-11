import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

import * as ts from 'typescript'

import * as scip from './scip'

export interface ProjectCache {
  cacheDir: string
}

export function computeProjectHash(
  config: ts.ParsedCommandLine,
  projectRoot: string
): string {
  const hash = crypto.createHash('sha256')

  hash.update(projectRoot)

  const sortedFiles = [...config.fileNames].sort()
  for (const fileName of sortedFiles) {
    try {
      const stat = fs.statSync(fileName)
      hash.update(fileName)
      hash.update(stat.mtimeMs.toString())
      hash.update(stat.size.toString())
    } catch {
      hash.update(fileName)
      hash.update('missing')
    }
  }

  const configStr = JSON.stringify(config.options)
  hash.update(configStr)

  return hash.digest('hex').slice(0, 16)
}

function getCachePath(cacheDir: string, projectRoot: string): string {
  const projectHash = crypto
    .createHash('sha256')
    .update(projectRoot)
    .digest('hex')
    .slice(0, 16)
  return path.join(cacheDir, `${projectHash}`)
}

function getHashPath(cachePath: string): string {
  return `${cachePath}.hash`
}

function getScipPath(cachePath: string): string {
  return `${cachePath}.scip`
}

export function loadCachedDocuments(
  cacheDir: string,
  projectRoot: string,
  currentHash: string
): scip.scip.Document[] | undefined {
  const cachePath = getCachePath(cacheDir, projectRoot)
  const hashPath = getHashPath(cachePath)
  const scipPath = getScipPath(cachePath)

  try {
    if (!fs.existsSync(hashPath) || !fs.existsSync(scipPath)) {
      return undefined
    }

    const cachedHash = fs.readFileSync(hashPath, 'utf-8').trim()
    if (cachedHash !== currentHash) {
      return undefined
    }

    const scipBytes = fs.readFileSync(scipPath)
    const index = scip.scip.Index.deserialize(scipBytes)
    return index.documents
  } catch {
    return undefined
  }
}

export function saveCachedDocuments(
  cacheDir: string,
  projectRoot: string,
  hash: string,
  documents: scip.scip.Document[]
): void {
  try {
    fs.mkdirSync(cacheDir, { recursive: true })

    const cachePath = getCachePath(cacheDir, projectRoot)
    const hashPath = getHashPath(cachePath)
    const scipPath = getScipPath(cachePath)

    fs.writeFileSync(hashPath, hash)

    const index = new scip.scip.Index({ documents })
    fs.writeFileSync(scipPath, index.serializeBinary())
  } catch (error) {
    console.error(`warning: failed to write cache for ${projectRoot}: ${error}`)
  }
}
