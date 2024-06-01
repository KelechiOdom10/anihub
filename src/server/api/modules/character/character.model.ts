import { builder } from "../../builder";

import { type components } from "~/server/jikan-schema";

type CharacterType = components["schemas"]["character"];
type ImageType = NonNullable<components["schemas"]["character_images"]["webp"]>;

const CharacterImage = builder
  .objectRef<ImageType>("CharacterImage")
  .implement({
    description: "Character Image object",
    fields: (t) => ({
      small: t.exposeString("small_image_url", { nullable: true }),
      default: t.exposeString("image_url", { nullable: true }),
    }),
  });

export const Character = builder.objectRef<CharacterType>("Character");

builder.objectType(Character, {
  description: "Character object",
  fields: (t) => ({
    id: t.exposeID("mal_id", { nullable: true }),
    url: t.exposeString("url", { nullable: true }),
    name: t.exposeString("name", { nullable: true }),
    about: t.exposeString("about", { nullable: true }),
    nicknames: t.exposeStringList("nicknames", { nullable: true }),
    image: t.field({
      type: CharacterImage,
      nullable: true,
      resolve: (parent) => parent.images?.webp ?? parent.images?.jpg,
    }),
  }),
});
