import { printSchema } from "graphql";

import { writeFileSync } from "node:fs";

import { schema } from "./schema";

writeFileSync("schema.graphql", printSchema(schema));
