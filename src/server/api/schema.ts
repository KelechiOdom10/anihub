import { builder } from "./builder";
import "./modules/anime";
import "./modules/character";
import "./modules/genre";

export const schema = builder.toSchema();
