import { builder } from "./builder";
import "./modules/shared";
import "./modules/anime";
import "./modules/character";
import "./modules/genre";
import "./modules/user";
import "./modules/producer";
import "./modules/collection";

export const schema = builder.toSchema();
