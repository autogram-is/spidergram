import { ClassConstructor } from "class-transformer";
import { GenericFile, GenericFileData } from "./generic-file.js";
import { Resource, Spidergram } from "../../index.js";

export type MimeTypeMap = Record<string, ClassConstructor<GenericFile>>;

export async function processResourceFile(resource: Resource): Promise<GenericFileData> {
  const sg = await Spidergram.load();
  if (
    resource.payload &&
    resource.mime &&
    Object.keys(sg.mimeHandlers).includes(resource.mime)
  ) {
    try {
      const handler = new sg.mimeHandlers[resource.mime](resource.payload.path);
      return handler.getAll();
    } catch(error) {
      if (error instanceof Error) {
        return Promise.resolve({ error });
      }
    }
  }
  return Promise.resolve({});
}