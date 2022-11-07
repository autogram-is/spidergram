import {Project} from '../../source/index.js';

// Custom configuration options can be passed in here
const context = await Project.context({name: 'demo'});

// The context options set up the db server credentials
// as well as the name of the specific database to use
console.log(context.graph.collection('test'));

// They also set up storage bins for files created/downloaded
// during a crawl, configuration information, etc.
console.log(await context.files().listContents('/', {recursive: true}));

console.log(await context.files().exists(context.configuration.google?.credentialPath ?? ''));
