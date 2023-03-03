import { Readable } from 'node:stream';
import { fileNameFromHeaders } from '../helpers/mime.js';
import { SpiderContext } from '../context.js';
import { Project } from '../../index.js';
import { ensureDir } from "fs-extra";

export async function downloadHandler(context: SpiderContext): Promise<void> {
  const { graph, files, saveResource, sendRequest } = context;
  const resource = await saveResource();

  const buffer = await sendRequest({
    responseType: 'buffer',
    resolveBodyOnly: true,
    allowGetBody: true,
    decompress: true,
    method: 'GET',
  });

  const fileName =
    resource.key +
    '-' +
    fileNameFromHeaders(new URL(buffer.url), buffer.headers);

  const directory = [resource.parsed.hostname.replaceAll('.', '-'), resource.mime?.replaceAll('/', '-') ?? 'unknown'].join('/')
  const proj = await Project.config();
  await ensureDir([proj.root ?? '.', 'storage', 'downloads', directory].join('/'));
  await files('downloads').writeStream([directory, fileName].join('/'), Readable.from(buffer.rawBody));

  resource.payload = { bucket: 'downloads', path: fileName };
  await graph.push(resource);
}
