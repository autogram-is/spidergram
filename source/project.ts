import { ArangoStore } from "./model/arango-store.js";
import {
	Vertice,
	UniqueUrl,
	Resource,
	DataSet,
	LinksTo,
	RespondsWith,
	IsChildOf,
	AppearsOn,
	IsVariantOf,
} from "./model/index.js";
import { Config as ArangoConfig } from 'arangojs/connection';
import { Storage as FileStore, Configuration as FileConfiguration } from 'typefs';
import * as dotenv from 'dotenv'
import { Constructor, PartialDeep } from "type-fest";

dotenv.config();

export interface ProjectConfig {
	/**
	 * A unique name identifying the current project; used
	 * for reporting purposes and to generate an Arango database
	 * name if no explicit graph configuration options are supplied.
	 *
	 * @default 'spidergram'
	 * @type {string}
	 */
	name: string,

  /**
	 * Configuration for the project's storage buckets; by default
	 * a single file bucket in the `./storage` directory of the node.js
	 * project will be used.
	 * 
	 * @example
	 * const files = {
	 *	 default: 'downloads',
	 *   disks: {
	 *	   config: {
	 *	     driver: 'file',
	 *		   root: './storage/config',
	 *		   jail: true,
	 *	   },
	 *	   downloads: {
	 *	     driver: 'file',
	 *		   root: './storage/downloads',
	 *		   jail: true,
	 *	   }
	 *   }
	 * };
	 *
	 * @type {FileConfiguration}
	 */
	files: FileConfiguration,

  graph: {
		/**
		 * Connection details for an Arango database server. If no
		 * connection information is specified, a localhost server
		 * and 'root' user will be used.
		 *
		 * @type {ArangoConfig}
		 */
		connection: ArangoConfig,

		/**
		 * An array of Spidergram model entities to use when configuring
		 * a new Arango database.
		 *
		 * @type {Array<Constructor<Vertice>>}
		 */
		model: Constructor<Vertice>[],
	},

	google: {
		apiKey: string,
		credentialPath: string,
		tokenPath: string,
	}
}

export const projectConfigDefaults: ProjectConfig = {
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
		connection: {
			url: process.env.ARANGO_URL ?? 'http://127.0.0.1:8529',
			auth: {
				username: process.env.ARANGO_USER ?? 'root',
				password: process.env.ARANGO_PASS ?? ''
			}	
		},
		model: [
			UniqueUrl,
			Resource,
			DataSet,
			LinksTo,
			RespondsWith,
			IsChildOf,
			AppearsOn,
			IsVariantOf,
		],
	},
	google: {
		apiKey: process.env.GOOGLE_API_KEY ?? '',
		credentialPath: process.env.GOOGLE_API_KEY ?? './google-credentials.json',
		tokenPath: process.env.GOOGLE_API_KEY ?? './google-credentials.json',
	}
};

export class Project {
  private static _instance?: Project;

  graph!: ArangoStore;
	get files() {
    return FileStore.disk.bind(FileStore);
  }

  private constructor(readonly configuration: ProjectConfig) {}

	static async context(config: PartialDeep<ProjectConfig> = {}): Promise<Project> {
		if (Project._instance !== undefined) {
			return Project._instance;
		} else {
			const configWithDefaults = Project.mergeDefaults(config);
			const project = new Project(configWithDefaults);

			project.graph = await ArangoStore.open(
				configWithDefaults.graph.connection.databaseName ?? configWithDefaults.name,
				configWithDefaults.graph.connection
			);		
			FileStore.config = configWithDefaults.files;

			Project._instance = project;
			return Project._instance;
		}
	}

	private static mergeDefaults = (options: PartialDeep<ProjectConfig>): ProjectConfig => {
		return {
			name: options.name ?? projectConfigDefaults.name,
			graph: {
				...options.graph ?? {},
				...projectConfigDefaults.graph
			},
			files: {
				...options.files ?? {},
				...projectConfigDefaults.files
			},
			google: {
				...options.google ?? {},
				...projectConfigDefaults.google
			}
		};
	}
}



