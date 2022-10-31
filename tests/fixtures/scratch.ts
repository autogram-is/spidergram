import { Project } from '../../source/index.js';

const context = await Project.context();

console.log(context.graph.collection('test'));