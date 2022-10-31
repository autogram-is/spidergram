import { PartialDeep } from "type-fest";
import { ArangoStore } from "./arango-store.js";
import { Config as ArangoConfig } from 'arangojs/connection';
import { Storage as FileStore, Configuration as FileConfiguration } from 'typefs';
import * as dotenv from 'dotenv'

dotenv.config()

/*
const defaultConfig: ProjectConfig = {
	textEditor: {
		fontSize: 14;
		fontColor: '#000000';
		fontWeight: 400;
	}
	autocomplete: false;
	autosave: true;
};

const applyDefaults = (customConfig: PartialDeep<ProjectConfig>) => {
	return {...defaultConfig, ...customConfig};
}

const settings = applyDefaults({});


export interface ProjectConfig {
  files: FileConfiguration,
  graph: ArangoConfig
}

export class Context {
  private instance?: Context;
  graph: ArangoStore;
  files: FileStore;
  private constructor(config: ProjectConfig) {}
}

*/