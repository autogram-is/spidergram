import { Configuration, ConfigurationOptions } from 'crawlee';

interface SpiderConfigurationOptions extends ConfigurationOptions {

}

export class SpiderConfiguration extends Configuration {
  constructor (options: SpiderConfigurationOptions) {
    super(options);
  }
}
