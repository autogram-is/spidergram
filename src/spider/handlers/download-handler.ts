import { Duplex } from 'node:stream';
import { fileNameFromHeaders } from '../helpers/mime.js';
import { SpiderContext } from '../context.js';
import { Spidergram } from '../../index.js';
import { ensureDir } from 'fs-extra';
import path from 'node:path';

export async function downloadHandler(context: SpiderContext): Promise<void> {
  const { graph, files, saveResource } = context;
  const resource = await saveResource();

  const response = await fetch(resource.parsed).then(r => {
    if (r.status !== 200) throw new Error('Could not download');
    return r;
  });

  if (response.body) {
    const fileName =
      resource.key +
      '-' +
      fileNameFromHeaders(new URL(resource.url), resource.headers);

    const proj = await Spidergram.load();
    const directory = path.join(
      'downloads',
      resource.parsed.hostname.replaceAll('.', '-'),
      resource.mime?.replaceAll('/', '-') ?? 'unknown',
    );
    await ensureDir(
      path.join(proj.config.storageDirectory ?? './storage', directory),
    );
    const fullPath = path.join(directory, fileName);
    await files().writeStream(fullPath, Duplex.from(response.body));

    resource.payload = { bucket: 'downloads', path: fullPath };
    await graph.push(resource);
  }
  return Promise.resolve();
}
