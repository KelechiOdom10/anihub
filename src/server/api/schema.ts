import { printSchema, lexicographicSortSchema } from "graphql";

import { writeFileSync } from "fs";

import { builder } from "./builder";
import "./modules/anime";
import "./modules/character";
import "./modules/genre";
import "./modules/user";

export const schema = builder.toSchema();

const schemaAsString = printSchema(lexicographicSortSchema(schema));

writeFileSync("./src/graphql/schema.graphql", schemaAsString);
