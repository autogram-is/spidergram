import { ArangoStore } from "./model/arango-store.js";
import { Config as ArangoConfig } from 'arangojs/connection';
import { Storage as FileStore, Configuration as FileConfiguration } from 'typefs';
import * as dotenv from 'dotenv'
dotenv.config()

export interface ProjectConfig {
	name: string,
  files: FileConfiguration,
  graph: ArangoConfig
	google?: {
		apiKey?: string,
		credentialPath?: string,
		tokenPath?: string,
	}
}

const defaultConfig: ProjectConfig = {
	name: 'spidergram',
	files: {
		default: 'storage',
		disks: {
			storage: {
				driver: 'file',
				root: process.env.SPIDERGRAM_STORAGE_DIR ?? './storage',
				jail: true,
			}
		}
	},
  graph: {
		url: process.env.ARANGO_URL ?? 'http://127.0.0.1:8529',
		auth: {
			username: process.env.ARANGO_USER ?? 'root',
			password: process.env.ARANGO_PASS ?? ''
		}
	},
	google: {
		apiKey: process.env.GOOGLE_API_KEY ?? '',
		credentialPath: process.env.GOOGLE_API_KEY ?? './storage/google-credentials.json',
		tokenPath: process.env.GOOGLE_API_KEY ?? './storage/google-credentials.json',
	}
};

export class Project {
  private static _instance?: Project;

  graph!: ArangoStore;
  files!: FileStore;

  private constructor(readonly configuration: ProjectConfig) {}

	static async context(config: Partial<ProjectConfig> = {}): Promise<Project> {
		if (Project._instance !== undefined) {
			return Project._instance;
		} else {
			const configWithDefaults = {...defaultConfig, ...config};
			const project = new Project(configWithDefaults);

			project.graph = await ArangoStore.open(config.graph?.databaseName ?? config.name, config.graph);		
			FileStore.config = configWithDefaults.files;
			project.files = FileStore.getInstance();

			return project;
		}
	}
}