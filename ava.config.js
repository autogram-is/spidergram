export default {
  "extensions": {
    "ts": "module"
  },
  "concurrency": 1,
  "failFast": true,
  "environmentVariables": {
    "NODE_NO_WARNINGS": "1"
  },
  "nodeArguments": [
    "--loader=ts-node/esm"
  ]
};