import { test } from 'uvu'

import { allowJsConfig, inferTsconfig } from './inferTsconfig'

test('inferTsconfig returns allowJs config', () => {
  const obtained = inferTsconfig()
  if (obtained !== allowJsConfig) {
    throw new Error(`expected ('${allowJsConfig}') != obtained ('${obtained}')`)
  }
})

test.run()
