# Code Style Guide

## Helper Functions

Spidergram includes quite a few utility functions that can be used in multiple contexts; using them together effectively is easier when they follow similar standards and conventions.

### Naming and organizing

Helper function names should be camel-cased and follow the pattern: Verb - Optional Context - Object. Examples include `getPageData`, `parseMetaTags`, `findLinks`, and so on. Some verb examples:

- `has` implies a predicate function that returns true if the object meets certain criteria, or contains certain information (e.g. `hasPlaintext`, `hasCategories`, `hasSubdomain`).
- `find` implies searching for one or more objects that *might* be present in the context (e.g. `findLinks`, `findSitemapLinks`, `findPageParent`).
- `get` implies gathering gathering a known set of objects from a given context (e.g. `getPageData`, `getPlaintext`).
- `fetch` implies retrieving the object from a remote location (e.g. `fetchPage`, `fetchResourcePayload`).

Stateless helper functions large enough to be reused should live in their own files, along with any relevant type and interface definitions, TSDoc blocks, etc. Slight variations and convenience wrappers/aliases (`findLinks` and `findWebLinks`, for example) can be placed the same file. File names should be kebab-cased versions of the primary helper function's name (e.g., `get-page-data.ts` would contain the function `getPageData()`).

### Handling flags and options

- Define but don't export an Options type, with all properties optional
  - If the Options are complex enough that users will pre-build them before calling the function, define and export the options as an interface whose name matches the helper function's name (e.g., getData and GetDataOptions).
- Define but don't export a defaults const
- Accept a customOptions param that defaults to {}
- Use lodash to populate the defaults, and proceed.

### Making complex return data explicit

Functions that return primitives, existing object types, or arrays of existing object types, don't need to do anything special. If they build and return complex data structures, or have different execution paths that can result in different *types* of result data, being explicit is good.

- Define an export an interface, not a type, for the return object whenever possible.
- Create a 'results' object at the top of the function, populated with any fallback values.
- Return the modified results object.

### Dealing with Async/Promises

TODO - mostly the same guidelines but with some notes around promise wrapping, then vs await, and so on.

``` typescript
export interface MyFunctionResults {
  myData?: string,
  datums?: number
}

type Options = {
  flagOne?: boolean,
  flagTwo?: boolean,
}

const defaults: Options {
  flagOne: false,
  flagTwo: true,
}

export function myFunction(param: string, customOptions: Options = {}) {
  const options = _.defaultsDeep(customOptions, defaults);
  const results: MyFunctionResults = {};
  
  // Do stuff here…

  if (options.flagOne) {
    // Do other here…
  }

  if (options.flagTwo) {
    // Do more things here…
  }

  return results;
}
```

### Batch-processing functions

If the helper function performs operations on a large input set, validating results and troubleshooting errors that only affect a hendful of the items can be frustrating. Whenever possible, use approaches that allow graceful recovery from errors by the calling function. Consider some of the following approaches:

- If an explicit set of items will always be passed in, make it the function's first parameter.
- If a set of items *or* criteria to assemble a set are both possible, move them both to the options object for clarity.
- Use an optional 'silent' flag in the functions' options, and an 'errors' array in the results object.
  - If the silent flag is set, accumulate errors in the array and return them alongside successful results rather than halting processing.
  - Be sure each error message includes enough information to identify *which* record failed; 1000 'Could Not Save' messages are unhelpful.
- Include summary statistics in the result object about how many items were examined, successfully processed, etc.
- Don't use `console.log()` for status messages or updates; if ongoing status matters, consider making Worker object that emits status events, instead.

``` typescript
export interface BatchProcessorResults {
  output: string[];
  errors: Error[]
}

export interface BatchProcessorOptions {
  silent?: boolean;
}

export const defaults: BatchProcessorOptions {
  silent: false,
}

export function myBatchProcessor(input: string[], customOptions: Partial<BatchProcessorOptions> = {}) {
  const options = _.defaultsDeep(customOptions, defaults);
  const results: BatchProcessorResults = { output: [], errors: [] };

  for (const value of input) {
    try() {
      // Do some stuff!
      results.output.push(value);
    } catch (err: unkonwn) {
      if (silent && err instanceof Error) results.errors.push(err);
      else throw new Error('WTF bro', e);
    }
  }
  return results;
}
```
