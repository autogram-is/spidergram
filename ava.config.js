export default {
  "files": [
    "tests/**/*",
    "!tests/**/fixtures/*",
    "!tests/**/*.md"
  ],
  "extensions": {
    "ts": "module"
  },
  "concurrency": 2,
  "failFast": false,
  "environmentVariables": {
    "NODE_NO_WARNINGS": "1"
  },
  "nodeArguments": [
    "--loader=ts-node/esm"
  ]
};