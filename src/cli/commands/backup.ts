import { SgCommand } from '../index.js';
import { Spidergram } from '../../index.js';

import fse from 'fs-extra';
import { aql, Database } from 'arangojs';
const { ensureDirSync, createWriteStream } = fse;

export default class Backup extends SgCommand {
  static description = '';

  async run() {
    const sg = await Spidergram.load();
    const db = sg.arango.db;

    const path = `./storage/backup/${new Date(Date.now()).toISOString().split('T')[0]}/`;
    ensureDirSync(path);

    const collections = await db.listCollections();
    for (const c of collections) {
      if (!c.isSystem) {
        const count = await this.writeCollection(db, c.name, path);
        this.log(`Backed up ${count} ${c.name} records`);
      }
    }
    this.log('Complete!');
  }

  async writeCollection(db: Database, collection: string, path: string) {
    const output = createWriteStream(path + collection + '.ndjson', { autoClose: true });
    const query = aql`FOR document IN ${db.collection(collection)} RETURN document`
    const cursor = await db.query(query);
    let count = 0;
    for await (const value of cursor) {
      if (value !== undefined) {
        output.write(JSON.stringify(value, undefined, 0) + '\n');
        count++;
      }
    }
    output.close();
    return count;
  }
}
