import { printSchema } from "graphql";

import { writeFileSync } from "node:fs";

import { schema } from "./schema";

writeFileSync("src/graphql/schema.graphql", printSchema(schema));
