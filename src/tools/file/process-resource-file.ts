import { ClassConstructor } from "class-transformer";
import { GenericFile, GenericFileData } from "./generic-file.js";
import { Resource, Spidergram } from "../../index.js";
import minimatch from "minimatch";

export type MimeTypeMap = Record<string, ClassConstructor<GenericFile>>;

export async function processResourceFile(resource: Resource, customMap: MimeTypeMap = {}): Promise<GenericFileData> {
  const { mime, payload } = resource;
  const map = {
    ...customMap,
    ...await Spidergram.load().then(sg => sg.mimeHandlers)
  }

  if (mime && payload) {
    for (const [type, handler] of Object.entries(map)) {
      if (type === mime) return new handler(payload.path).getAll();
    }

    for (const [pattern, handler] of Object.entries(map)) {
      if (minimatch(mime, pattern)) return new handler(payload.path).getAll();
    }
  }
  return Promise.resolve({});
}