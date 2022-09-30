import { Database, aql } from "arangojs";

const db = new Database({
  databaseName: "spidergram",
  auth: { username: 'root' },
});

