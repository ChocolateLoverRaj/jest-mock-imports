# jest-mock-imports
Mock imports by changing the import path of ESModule files.

## Why?
This module is meant for mocking modules that are `import`ed by files. `jest.mock` is designed for mocking `require`, but it doesn't work for ESModules. This module is a jest transformer that changes the `import` paths of you files.

## Setup
This module is meant to be used with `jest`.

### Installing
```bash
npm i -D jest jest-mock-imports
```

### File structure
- \_\_mocks\_\_
    - fs.js
    - delete-files.js
- lib
  - \_\_mocks\_\_
    - helper.js
    - lib.js
  - index.js
  - helper.js
  - lib.js
  - dir
    - \_\_mocks\_\_
      - tool.js
    - tool.js
- [jest.config.js](#jest.config.js)
- [transformer.cjs](#transformer.cjs)

In this example file structure, there are a couple of files and modules being mocked.

### Mocks Tables
Module | Mock File
--- | ---
fs | \_\_mocks\_\_/fs.js
delete-files | \_\_mocks\_\_/delete-files.js

File | Mock File
--- | ---
lib/helper.js | lib/\_\_mocks\_\_/helper.js
lib/lib.js | lib/\_\_mocks\_\_/lib.js
lib/dir/tool.js | lib/dir/\_\_mocks\_\_/tool.js

### Import Examples
#### `lib/index.js`
Normally:
```javascript
import fs from 'fs'
import { myTool } from './dir/tool.js'
export { helper } from './helper.js'
export * as lib from './lib.js'
import sum from 'not-mocked'
import prime from './not-mocked.js'
```
When testing with jest:
```javascript
import fs from '../__mocks__/fs'
import { myTool } from './dir/__mocks__/tool.js'
export { helper } from './__mocks__/helper.js'
export * as lib from './__mocks__/lib.js'
import sum from 'not-mocked'
import prime from './not-mocked.js'
```

### jest.config.js
This tells jest to transform all files ending with `.js` files using the [transformer](#transformer.cjs).
```javascript
export default {
  transform: {
    '\\.js': './transformer.cjs'
  }
}
```

### transformer.cjs
```javascript
const { mock } = require('jest-mock-imports')

const mockFn = mock({
  modules: new Map()
    .set('fs', 'fs.js') // Uses fs.js in __mocks__
    .set('delete-files', 'delete-files.js'), // Uses delete-files.js in __mocks__
  files: new Set() // All the files in this set have mocks with the same file name in the __mocks__ folder in the same level as the files.
    .add('lib/helper.js')
    .add('lib/lib.js')
    .add('lib/dir/tool.js')
})

exports.process = mockFn // Jest uses the exports.process function
```
