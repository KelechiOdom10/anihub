import { printSchema, lexicographicSortSchema } from "graphql";

import { writeFileSync } from "fs";

import { builder } from "./builder";
import "./modules/shared";
import "./modules/anime";
import "./modules/character";
import "./modules/genre";
import "./modules/user";
import "./modules/producer";

export const schema = builder.toSchema();

const schemaAsString = printSchema(lexicographicSortSchema(schema));

writeFileSync("./src/graphql/schema.graphql", schemaAsString);
