/* eslint-env mocha */
import { mock, Options } from '../lib/index'
import { strictEqual } from 'assert'

interface TestOptions {
  modules?: Map<string, string>
  files?: Set<string>
}

function testPath (options: TestOptions, path: string, expect: string, file?: string): void
function testPath (path: string, expect: string, file?: string): void
function testPath (arg1: TestOptions | string, arg2: string, arg3: string, arg4?: string): void {
  let options: Options = {
    modules: new Map<string, string>(),
    files: new Set<string>(),
    rootDir: '.'
  }
  let path: string
  let expect: string
  let file: string
  if (typeof arg1 === 'object') {
    options = {
      ...options,
      ...arg1
    }
    path = arg2
    expect = arg3
    file = arg4
  } else {
    path = arg1
    expect = arg2
    file = arg3
  }
  file = file ?? 'index.js'
  const mocker = mock(options)
  const transforms: Array<(path: string) => string> = [
    path => `import '${path}';`,
    path => `export { default } from '${path}';`,
    path => `export * as lib from '${path}';`,
    path => `export * from '${path}';`
  ]
  for (const transform of transforms) {
    strictEqual(mocker(transform(path), file).replace(/\\/g, '/'), transform(expect.replace(/\\/g, '/')))
  }
}

describe('no mock', () => {
  it('module', () => {
    testPath('chalk', 'chalk')
  })

  it('file', () => {
    testPath('./lib.js', './lib.js')
  })
})

it('mock module', () => {
  const options: TestOptions = {
    modules: new Map<string, string>()
      .set('fs', 'fs.js')
      .set('fs/promises', 'fs-promises.js')
  }
  testPath(options, 'fs', './__mocks__/fs.js')
  testPath(options, 'fs/promises', './__mocks__/fs-promises.js')
})

it('mock file', () => {
  const options: TestOptions = {
    files: new Set<string>()
      .add('lib/util.js')
      .add('lib/dir/util.js')
  }
  testPath(options, './util.js', './__mocks__/util.js', 'lib/index.js')
  testPath(options, './dir/util.js', './dir/__mocks__/util.js', 'lib/index.js')
  testPath(options, '../util.js', '../__mocks__/util.js', 'lib/dir/util.js')
})

it('ignore export named', () => {
  const mocker = mock({
    modules: new Map<string, string>(),
    files: new Set<string>()
  })
  strictEqual(mocker('export const name = \'Bob\';', 'lib.js'), 'export const name = \'Bob\';')
})

it('mock accesses real module', () => {
  const options: TestOptions = {
    modules: new Map<string, string>()
      .set('chalk', 'chalk.js')
  }
  testPath(options, 'chalk', 'chalk', '__mocks__/chalk.js')
})
