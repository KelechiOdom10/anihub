import { builder } from "../../builder";
import { Anime } from "../anime";
import { animeService } from "../anime/anime.service";

import { type components } from "~/server/jikan-schema";

type CharacterType = components["schemas"]["character"];
type AnimeCharacterType = NonNullable<
  components["schemas"]["anime_characters"]["data"]
>[0];
type VoiceActorType = NonNullable<
  NonNullable<
    components["schemas"]["anime_characters"]["data"]
  >[0]["voice_actors"]
>[0];
type ImageType = NonNullable<components["schemas"]["character_images"]["webp"]>;
type PersonType = components["schemas"]["person"];

const Person = builder.objectRef<PersonType>("Person").implement({
  description: "Person object",
  fields: (t) => ({
    id: t.exposeID("mal_id", { nullable: true }),
    name: t.exposeString("name", { nullable: true }),
    url: t.exposeString("url", { nullable: true }),
    image: t.string({
      nullable: true,
      resolve: (parent) => parent.images?.jpg?.image_url,
    }),
  }),
});

const CharacterImage = builder
  .objectRef<ImageType>("CharacterImage")
  .implement({
    description: "Character Image object",
    fields: (t) => ({
      small: t.exposeString("small_image_url", { nullable: true }),
      default: t.exposeString("image_url", { nullable: true }),
    }),
  });

const VoiceActor = builder.objectRef<VoiceActorType>("VoiceActor").implement({
  description: "Voice Actor object",
  fields: (t) => ({
    person: t.field({
      type: Person,
      nullable: true,
      resolve: (parent) => parent.person,
    }),
    language: t.exposeString("language", { nullable: true }),
  }),
});

export const Character = builder.objectRef<CharacterType>("Character");
export const AnimeCharacter =
  builder.objectRef<AnimeCharacterType>("AnimeCharacter");

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
    anime: t.field({
      type: Anime,
      nullable: true,
      resolve: async (parent) => {
        if (!parent.mal_id) return null;

        const { data } = await animeService.GET("/characters/{id}/anime", {
          params: {
            path: { id: parent.mal_id },
          },
        });

        const animeId = data?.data?.[0]?.anime?.mal_id;

        if (!animeId) return null;

        const { data: animeData } = await animeService.GET("/anime/{id}", {
          params: {
            path: { id: animeId },
          },
        });

        return animeData?.data;
      },
    }),
  }),
});

builder.objectType(AnimeCharacter, {
  description: "Anime Character with role and voice actors",
  fields: (t) => ({
    character: t.field({
      type: Character,
      nullable: true,
      resolve: (parent) => parent.character,
    }),
    role: t.string({
      nullable: true,
      resolve: (parent) => parent.role,
    }),
    voiceActors: t.field({
      type: [VoiceActor],
      nullable: true,
      resolve: (parent) => parent.voice_actors,
    }),
  }),
});
