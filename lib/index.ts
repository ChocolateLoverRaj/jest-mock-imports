import { dirname, basename, join, relative } from 'path'
import { transformSync, PluginObj } from '@babel/core'
import { StringLiteral, Identifier, isStringLiteral } from '@babel/types'

type Transformer = (path: string) => string

// Transform import paths, giving a transformer
function transformPlugin (transformer: Transformer): PluginObj {
  // Changes the string literal, preserving quote style
  function transform (source: StringLiteral): void {
    const value = transformer(source.value)
    const double = (source.extra.raw as string).startsWith('"')
    const quote = double ? '"' : '\''
    source.extra.raw = `${quote}${value}${quote}`
  }
  return {
    visitor: {
      ImportDeclaration (path) {
        transform(path.node.source)
      },
      ExportNamedDeclaration (path) {
        if (path.node.source as StringLiteral | unknown !== null) {
          transform(path.node.source)
        }
      },
      ExportAllDeclaration (path) {
        transform(path.node.source)
      },
      CallExpression (path) {
        if (
          path.node.arguments.length === 1 &&
          (path.node.callee as Identifier).name === 'require' &&
          path.scope.getBindingIdentifier('require') === undefined) {
          const [arg] = path.node.arguments
          if (!isStringLiteral(arg)) return
          transform(arg)
        }
      }
    }
  }
}

export interface Options {
  modules: Map<string, string>
  files: Set<string>
  rootDir?: string
}

// path.relative does not always match the javascript import path syntax. It doesn't use ./
// For example, relative('dir', 'dir/lib.js') => 'lib.js', but we want './lib.js'
// Also changes backslashes to forward slashes
function fixRelative (path: string): string {
  path = path.replace(/\\/g, '/')
  return path.startsWith('.')
    ? path
    : './' + path
}

// Mock modules and change import paths
export function mock (options: Options): (src: string, file: string) => string {
  // The root dir
  const rootDir = options.rootDir ?? process.env.INIT_CWD ?? process.cwd()
  // Convert / normalize all the files into absolute paths
  const mockFiles = new Set([...options.files].map(file => join(rootDir, file)))
  // Return a jest compatible transformer function
  return (src, file) => {
    // Do not change import paths for test files or mock files, because those are only written for a testing environment and can explicitly import mock files.
    if (file.endsWith('.test.js') || basename(dirname(file)) === '__mocks__') {
      return src
    }
    // This is where the actual mocking logic works
    const transformer: Transformer = (path) => {
      // The dirname of the file. Used for relative imports
      const fileDir = dirname(file)
      // Check for module mocks
      if (options.modules.has(path)) {
        const mockPath = join(rootDir, '__mocks__', options.modules.get(path))
        return fixRelative(relative(fileDir, mockPath))
      }
      // Do not change anything if a non mocked module is being imported
      if (!path.startsWith('.')) {
        return path
      }
      // The absolute path of the file being imported
      // Use .js extension by default
      if (!path.endsWith('.js')) path += '.js'
      const importFile = join(fileDir, path)
      // Check if that file is being mocked
      if (mockFiles.has(importFile)) {
        // Path to mocked file
        const mockPath = join(dirname(importFile), '__mocks__', basename(importFile))
        // The relative path
        return fixRelative(relative(fileDir, mockPath))
      }
      // If the file isn't being mocked, do not modify path
      return path
    }
    // Use babel with the transform plugin
    return transformSync(src, {
      plugins: [transformPlugin(transformer)]
    }).code
  }
}
