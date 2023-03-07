import { Spidergram, SpidergramConfig } from "../../../src/index.js"

export default (): SpidergramConfig => {
  return {
    finalize: async (sg: Spidergram) => Promise.resolve(sg.logger.log('Custom finalizer'))
  }
}
