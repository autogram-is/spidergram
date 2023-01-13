# Code Style Guide

## Helper Functions

Spidergram includes quite a few standalone helper functions that can be used in multiple contexts; using them together effectively is easier when they follow similar standards and conventions.

### Handling flags and options

- Define but don't export an Options type, with all properties optional
  - If the Options are complex enough that users will likely create them, rather than defining them inline, defined and export the options as an interface whose name matches the helper function's name (e.g., getData and GetDataOptions).
- Define but don't export a defaults const
- Accept a customOptions param that defaults to {}
- Use lodash to populate the defaults, and proceed.

### Making return data explicit

- define an export an interface, not a type, for the return value whenever possible
- create a 'results' object at the top of the function, populated with any fallback values
- include an optional 'success' flag, and leave it unset if something went wrong but no error was thrown. (Optional: Offering a 'silent' mode in the options that returns errors in the Response rather than throwing them.)
- return the modified results object

### Dealing with Async/Promises

TODO - mostly the same guidelines but with some notes around promise wrapping, then vs await, and so on.

``` typescript
export interface MyFunctionResults {
  myData?: string,
  success?: boolean,
  errors?: Error[]
}

type Options = {
  flagOne?: boolean,
  flagTwo?: boolean,
  silent?: boolean,
}

const defaults: Options {
  flagOne: false,
  flagTwo: true,
  silent: false,
}

export function myFunction(param: string, customOptions: Options = {}) {
  const options = _.defaultsDeep(customOptions, defaults);
  const results: MyFunctionResults = {};
  
  try {
    if (options.flagOne) {
      // Do stuff here
      myData = 'We did things!';
      results.success = true;
    }
  } catch(err: unknown) {
    if (err instanceof Error) {
      results.errors.push(err);
    }
    if (!silent) throw(err);
  }
  
  return results;
}
```
