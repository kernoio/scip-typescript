import * as fs from 'fs'

import * as scip from './scip'

export interface MergeOptions {
  inputs: string[]
  output: string
}

export function mergeCommand(options: MergeOptions): void {
  if (options.inputs.length === 0) {
    console.error('error: no input files provided')
    process.exitCode = 1
    return
  }

  const output = fs.openSync(options.output, 'w')
  let metadataWritten = false
  let totalDocuments = 0

  try {
    for (const inputPath of options.inputs) {
      if (!fs.existsSync(inputPath)) {
        console.error(`error: input file not found: ${inputPath}`)
        process.exitCode = 1
        return
      }

      const inputBytes = fs.readFileSync(inputPath)
      const index = scip.scip.Index.deserialize(inputBytes)

      if (!metadataWritten && index.has_metadata) {
        const metadataIndex = new scip.scip.Index({
          metadata: index.metadata,
        })
        fs.writeSync(output, metadataIndex.serializeBinary())
        metadataWritten = true
      }

      if (index.documents.length > 0 || index.external_symbols.length > 0) {
        const docIndex = new scip.scip.Index({
          documents: index.documents,
          external_symbols: index.external_symbols,
        })
        fs.writeSync(output, docIndex.serializeBinary())
        totalDocuments += index.documents.length
      }
    }

    if (totalDocuments > 0) {
      console.log(`done ${options.output} (${totalDocuments} documents from ${options.inputs.length} files)`)
    } else {
      process.exitCode = 1
      fs.rmSync(options.output)
      console.error('error: no documents found in input files')
    }
  } finally {
    fs.close(output)
  }
}
