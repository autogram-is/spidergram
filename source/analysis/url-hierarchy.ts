import { UniqueUrl, IsChildOf } from '../model/index.js';

// Naive hierarchy building;  
export async function buildUrlHierarchy(urls: UniqueUrl[]): Promise<IsChildOf<UniqueUrl, UniqueUrl>[]> {
  return [];
  
}