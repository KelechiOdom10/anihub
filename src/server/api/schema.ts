import { builder } from "./builder";
import "./modules/anime";
import "./modules/character";
import "./modules/genre";
import "./modules/user";

export const schema = builder.toSchema();
