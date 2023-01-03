import { writeFile } from 'node:fs/promises';
import { SgCommand, CLI } from '../../index.js';
import {
  Project,
  ProjectConfig,
  projectConfigDefaults,
} from '../../../index.js';

type ConfigPromptValues = {
  name: string;
  root: string;
  description?: string;
  databaseName: string;
  databaseUrl: string;
  databaseUser: string;
  databasePass: string;
  filename: string;
};

export default class Init extends SgCommand {
  static description = 'Generate a project configuration file';

  async run() {
    const { project } = await this.getProjectContext(true);
    const path =
      project.configuration._configFilePath ?? Project.defaultConfigPath;

    this.ux.styledHeader('Project options:');

    const values = await CLI.prompt<ConfigPromptValues>([
      {
        type: 'input',
        name: 'name',
        message: 'Project name:',
        default: projectConfigDefaults.name,
        required: true,
      },
      {
        type: 'input',
        name: 'description',
        message: 'Project description:',
        required: false,
      },
      {
        type: 'input',
        name: 'root',
        message: 'Project root directory:',
        default: projectConfigDefaults.root,
      },
      {
        type: 'input',
        name: 'databaseUrl',
        message: 'Arango URL:',
        default: projectConfigDefaults.graph.connection.url,
      },
      {
        type: 'input',
        name: 'databaseName',
        message: 'Arango database name:',
        required: false,
      },
      {
        type: 'input',
        name: 'databaseUser',
        message: 'Arango username:',
        default: 'root',
      },
      {
        type: 'invisible',
        name: 'databasePass',
        message: 'Arango password:',
        default: '',
      },
      {
        type: 'input',
        name: 'filename',
        message: 'Output filename:',
        default: 'spidergram.json',
      },
    ]);

    const options: Partial<ProjectConfig> = {
      name: values.name,
      description: values.description,
      root: values.root,
      graph: {
        connection: {
          url: values.databaseUrl,
          databaseName: values.databaseName,
          auth: {
            username: values.databaseUser,
            password: values.databasePass,
          },
        },
      },
    };

    const config = (await Project.config(options)).configuration;

    await writeFile(path, JSON.stringify(config, undefined, 2))
      .then(() => {
        this.log(`Config file written to ${CLI.chalk.bold(values.filename)}`);
      })
      .catch((error: unknown) => {
        if (error instanceof Error) {
          this.error(error, { exit: false });
        } else {
          throw new Error('w t f bro');
        }
      });
  }
}
