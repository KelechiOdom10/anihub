/* eslint-disable */
/* prettier-ignore */

export type introspection_types = {
    'Aired': { kind: 'OBJECT'; name: 'Aired'; fields: { 'from': { name: 'from'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'to': { name: 'to'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; }; };
    'Anime': { kind: 'OBJECT'; name: 'Anime'; fields: { 'aired': { name: 'aired'; type: { kind: 'OBJECT'; name: 'Aired'; ofType: null; } }; 'airing': { name: 'airing'; type: { kind: 'SCALAR'; name: 'Boolean'; ofType: null; } }; 'background': { name: 'background'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'characters': { name: 'characters'; type: { kind: 'LIST'; name: never; ofType: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'Character'; ofType: null; }; }; } }; 'description': { name: 'description'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'duration': { name: 'duration'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'episodes': { name: 'episodes'; type: { kind: 'SCALAR'; name: 'Int'; ofType: null; } }; 'genres': { name: 'genres'; type: { kind: 'LIST'; name: never; ofType: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'Genre'; ofType: null; }; }; } }; 'id': { name: 'id'; type: { kind: 'SCALAR'; name: 'ID'; ofType: null; } }; 'image': { name: 'image'; type: { kind: 'OBJECT'; name: 'AnimeImage'; ofType: null; } }; 'popularity': { name: 'popularity'; type: { kind: 'SCALAR'; name: 'Int'; ofType: null; } }; 'producers': { name: 'producers'; type: { kind: 'LIST'; name: never; ofType: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'Metadata'; ofType: null; }; }; } }; 'rank': { name: 'rank'; type: { kind: 'SCALAR'; name: 'Int'; ofType: null; } }; 'rating': { name: 'rating'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'score': { name: 'score'; type: { kind: 'SCALAR'; name: 'Float'; ofType: null; } }; 'season': { name: 'season'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'source': { name: 'source'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'status': { name: 'status'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'studios': { name: 'studios'; type: { kind: 'LIST'; name: never; ofType: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'Metadata'; ofType: null; }; }; } }; 'synopsis': { name: 'synopsis'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'title': { name: 'title'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'titles': { name: 'titles'; type: { kind: 'LIST'; name: never; ofType: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'AnimeTitle'; ofType: null; }; }; } }; 'trailer': { name: 'trailer'; type: { kind: 'OBJECT'; name: 'Trailer'; ofType: null; } }; 'type': { name: 'type'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'year': { name: 'year'; type: { kind: 'SCALAR'; name: 'Int'; ofType: null; } }; }; };
    'AnimeCharacter': { kind: 'OBJECT'; name: 'AnimeCharacter'; fields: { 'character': { name: 'character'; type: { kind: 'OBJECT'; name: 'Character'; ofType: null; } }; 'role': { name: 'role'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'voiceActors': { name: 'voiceActors'; type: { kind: 'LIST'; name: never; ofType: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'VoiceActor'; ofType: null; }; }; } }; }; };
    'AnimeImage': { kind: 'OBJECT'; name: 'AnimeImage'; fields: { 'default': { name: 'default'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'large': { name: 'large'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'small': { name: 'small'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; }; };
    'AnimeOrderEnum': { name: 'AnimeOrderEnum'; enumValues: 'end_date' | 'episodes' | 'favorites' | 'mal_id' | 'popularity' | 'rank' | 'score' | 'scored_by' | 'start_date' | 'title'; };
    'AnimeSearchResult': { kind: 'OBJECT'; name: 'AnimeSearchResult'; fields: { 'data': { name: 'data'; type: { kind: 'LIST'; name: never; ofType: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'Anime'; ofType: null; }; }; } }; 'pagination': { name: 'pagination'; type: { kind: 'OBJECT'; name: 'PaginationResult'; ofType: null; } }; }; };
    'AnimeTitle': { kind: 'OBJECT'; name: 'AnimeTitle'; fields: { 'title': { name: 'title'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'type': { name: 'type'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; }; };
    'AnimeTypeEnum': { name: 'AnimeTypeEnum'; enumValues: 'cm' | 'movie' | 'music' | 'ona' | 'ova' | 'pv' | 'special' | 'tv' | 'tv_special'; };
    'AnimesByGenresQueryParams': { kind: 'INPUT_OBJECT'; name: 'AnimesByGenresQueryParams'; isOneOf: false; inputFields: [{ name: 'genres'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; }; defaultValue: null }, { name: 'limit'; type: { kind: 'SCALAR'; name: 'Int'; ofType: null; }; defaultValue: "10" }, { name: 'page'; type: { kind: 'SCALAR'; name: 'Int'; ofType: null; }; defaultValue: "1" }]; };
    'Boolean': unknown;
    'Character': { kind: 'OBJECT'; name: 'Character'; fields: { 'about': { name: 'about'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'anime': { name: 'anime'; type: { kind: 'OBJECT'; name: 'Anime'; ofType: null; } }; 'id': { name: 'id'; type: { kind: 'SCALAR'; name: 'ID'; ofType: null; } }; 'image': { name: 'image'; type: { kind: 'OBJECT'; name: 'CharacterImage'; ofType: null; } }; 'name': { name: 'name'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'nicknames': { name: 'nicknames'; type: { kind: 'LIST'; name: never; ofType: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; }; } }; 'url': { name: 'url'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; }; };
    'CharacterImage': { kind: 'OBJECT'; name: 'CharacterImage'; fields: { 'default': { name: 'default'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'small': { name: 'small'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; }; };
    'CharacterQueryParams': { kind: 'INPUT_OBJECT'; name: 'CharacterQueryParams'; isOneOf: false; inputFields: [{ name: 'limit'; type: { kind: 'SCALAR'; name: 'Int'; ofType: null; }; defaultValue: null }, { name: 'page'; type: { kind: 'SCALAR'; name: 'Int'; ofType: null; }; defaultValue: null }]; };
    'CommonImage': { kind: 'OBJECT'; name: 'CommonImage'; fields: { 'imageUrl': { name: 'imageUrl'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; }; };
    'FilterEnum': { name: 'FilterEnum'; enumValues: 'airing' | 'bypopularity' | 'favorite'; };
    'Float': unknown;
    'Genre': { kind: 'OBJECT'; name: 'Genre'; fields: { 'animes': { name: 'animes'; type: { kind: 'LIST'; name: never; ofType: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'Anime'; ofType: null; }; }; } }; 'count': { name: 'count'; type: { kind: 'SCALAR'; name: 'Int'; ofType: null; } }; 'id': { name: 'id'; type: { kind: 'SCALAR'; name: 'ID'; ofType: null; } }; 'name': { name: 'name'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'url': { name: 'url'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; }; };
    'GenresFilterEnum': { name: 'GenresFilterEnum'; enumValues: 'demographics' | 'explicit_genres' | 'genres' | 'themes'; };
    'GenresQueryParams': { kind: 'INPUT_OBJECT'; name: 'GenresQueryParams'; isOneOf: false; inputFields: [{ name: 'filter'; type: { kind: 'ENUM'; name: 'GenresFilterEnum'; ofType: null; }; defaultValue: null }]; };
    'ID': unknown;
    'Int': unknown;
    'Metadata': { kind: 'OBJECT'; name: 'Metadata'; fields: { 'name': { name: 'name'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'type': { name: 'type'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'url': { name: 'url'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; }; };
    'Pagination': { kind: 'OBJECT'; name: 'Pagination'; fields: { 'hasNextPage': { name: 'hasNextPage'; type: { kind: 'SCALAR'; name: 'Boolean'; ofType: null; } }; 'lastVisiblePage': { name: 'lastVisiblePage'; type: { kind: 'SCALAR'; name: 'Int'; ofType: null; } }; }; };
    'PaginationItems': { kind: 'OBJECT'; name: 'PaginationItems'; fields: { 'count': { name: 'count'; type: { kind: 'SCALAR'; name: 'Int'; ofType: null; } }; 'perPage': { name: 'perPage'; type: { kind: 'SCALAR'; name: 'Int'; ofType: null; } }; 'total': { name: 'total'; type: { kind: 'SCALAR'; name: 'Int'; ofType: null; } }; }; };
    'PaginationResult': { kind: 'OBJECT'; name: 'PaginationResult'; fields: { 'hasNextPage': { name: 'hasNextPage'; type: { kind: 'SCALAR'; name: 'Boolean'; ofType: null; } }; 'items': { name: 'items'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'PaginationItems'; ofType: null; }; } }; 'lastVisiblePage': { name: 'lastVisiblePage'; type: { kind: 'SCALAR'; name: 'Int'; ofType: null; } }; }; };
    'Person': { kind: 'OBJECT'; name: 'Person'; fields: { 'id': { name: 'id'; type: { kind: 'SCALAR'; name: 'ID'; ofType: null; } }; 'image': { name: 'image'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'name': { name: 'name'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'url': { name: 'url'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; }; };
    'Producer': { kind: 'OBJECT'; name: 'Producer'; fields: { 'about': { name: 'about'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'id': { name: 'id'; type: { kind: 'SCALAR'; name: 'ID'; ofType: null; } }; 'image': { name: 'image'; type: { kind: 'OBJECT'; name: 'CommonImage'; ofType: null; } }; 'titles': { name: 'titles'; type: { kind: 'LIST'; name: never; ofType: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'AnimeTitle'; ofType: null; }; }; } }; 'url': { name: 'url'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; }; };
    'ProducerOrderEnum': { name: 'ProducerOrderEnum'; enumValues: 'count' | 'established' | 'favorites' | 'mal_id'; };
    'ProducerSearchQueryParams': { kind: 'INPUT_OBJECT'; name: 'ProducerSearchQueryParams'; isOneOf: false; inputFields: [{ name: 'letter'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; }; defaultValue: null }, { name: 'limit'; type: { kind: 'SCALAR'; name: 'Int'; ofType: null; }; defaultValue: null }, { name: 'order_by'; type: { kind: 'ENUM'; name: 'ProducerOrderEnum'; ofType: null; }; defaultValue: null }, { name: 'page'; type: { kind: 'SCALAR'; name: 'Int'; ofType: null; }; defaultValue: null }, { name: 'q'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; }; defaultValue: null }, { name: 'sort'; type: { kind: 'ENUM'; name: 'SearchSortEnum'; ofType: null; }; defaultValue: null }]; };
    'ProducerSearchResult': { kind: 'OBJECT'; name: 'ProducerSearchResult'; fields: { 'data': { name: 'data'; type: { kind: 'LIST'; name: never; ofType: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'Producer'; ofType: null; }; }; } }; 'pagination': { name: 'pagination'; type: { kind: 'OBJECT'; name: 'Pagination'; ofType: null; } }; }; };
    'Query': { kind: 'OBJECT'; name: 'Query'; fields: { 'getAnime': { name: 'getAnime'; type: { kind: 'OBJECT'; name: 'Anime'; ofType: null; } }; 'getAnimeCharacters': { name: 'getAnimeCharacters'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'LIST'; name: never; ofType: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'AnimeCharacter'; ofType: null; }; }; }; } }; 'getAnimeRelations': { name: 'getAnimeRelations'; type: { kind: 'LIST'; name: never; ofType: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'Anime'; ofType: null; }; }; } }; 'getAnimesByGenres': { name: 'getAnimesByGenres'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'LIST'; name: never; ofType: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'Anime'; ofType: null; }; }; }; } }; 'getAnimesSearch': { name: 'getAnimesSearch'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'AnimeSearchResult'; ofType: null; }; } }; 'getGenres': { name: 'getGenres'; type: { kind: 'LIST'; name: never; ofType: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'Genre'; ofType: null; }; }; } }; 'getProducers': { name: 'getProducers'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'ProducerSearchResult'; ofType: null; }; } }; 'getTopAnimes': { name: 'getTopAnimes'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'LIST'; name: never; ofType: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'Anime'; ofType: null; }; }; }; } }; 'getTopCharacters': { name: 'getTopCharacters'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'LIST'; name: never; ofType: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'Character'; ofType: null; }; }; }; } }; 'me': { name: 'me'; type: { kind: 'OBJECT'; name: 'User'; ofType: null; } }; }; };
    'RatingEnum': { name: 'RatingEnum'; enumValues: 'g' | 'pg' | 'pg13' | 'r' | 'r17' | 'rx'; };
    'SearchAnimeQueryParams': { kind: 'INPUT_OBJECT'; name: 'SearchAnimeQueryParams'; isOneOf: false; inputFields: [{ name: 'end_date'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; }; defaultValue: null }, { name: 'filter'; type: { kind: 'ENUM'; name: 'FilterEnum'; ofType: null; }; defaultValue: null }, { name: 'genres'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; }; defaultValue: null }, { name: 'limit'; type: { kind: 'SCALAR'; name: 'Int'; ofType: null; }; defaultValue: null }, { name: 'order_by'; type: { kind: 'ENUM'; name: 'AnimeOrderEnum'; ofType: null; }; defaultValue: null }, { name: 'page'; type: { kind: 'SCALAR'; name: 'Int'; ofType: null; }; defaultValue: null }, { name: 'producers'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; }; defaultValue: null }, { name: 'q'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; }; defaultValue: null }, { name: 'rating'; type: { kind: 'ENUM'; name: 'RatingEnum'; ofType: null; }; defaultValue: null }, { name: 'sfw'; type: { kind: 'SCALAR'; name: 'Boolean'; ofType: null; }; defaultValue: null }, { name: 'sort'; type: { kind: 'ENUM'; name: 'SearchSortEnum'; ofType: null; }; defaultValue: null }, { name: 'start_date'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; }; defaultValue: null }, { name: 'status'; type: { kind: 'ENUM'; name: 'StatusEnum'; ofType: null; }; defaultValue: null }, { name: 'type'; type: { kind: 'ENUM'; name: 'AnimeTypeEnum'; ofType: null; }; defaultValue: null }]; };
    'SearchSortEnum': { name: 'SearchSortEnum'; enumValues: 'asc' | 'desc'; };
    'StatusEnum': { name: 'StatusEnum'; enumValues: 'airing' | 'complete' | 'upcoming'; };
    'String': unknown;
    'TopAnimeQueryParams': { kind: 'INPUT_OBJECT'; name: 'TopAnimeQueryParams'; isOneOf: false; inputFields: [{ name: 'filter'; type: { kind: 'ENUM'; name: 'FilterEnum'; ofType: null; }; defaultValue: null }, { name: 'limit'; type: { kind: 'SCALAR'; name: 'Int'; ofType: null; }; defaultValue: null }, { name: 'page'; type: { kind: 'SCALAR'; name: 'Int'; ofType: null; }; defaultValue: null }, { name: 'rating'; type: { kind: 'ENUM'; name: 'RatingEnum'; ofType: null; }; defaultValue: null }, { name: 'sfw'; type: { kind: 'SCALAR'; name: 'Boolean'; ofType: null; }; defaultValue: null }, { name: 'type'; type: { kind: 'ENUM'; name: 'AnimeTypeEnum'; ofType: null; }; defaultValue: null }]; };
    'Trailer': { kind: 'OBJECT'; name: 'Trailer'; fields: { 'embedUrl': { name: 'embedUrl'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'id': { name: 'id'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'url': { name: 'url'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; }; };
    'User': { kind: 'OBJECT'; name: 'User'; fields: { 'avatar': { name: 'avatar'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'createdAt': { name: 'createdAt'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; } }; 'email': { name: 'email'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; } }; 'emailVerified': { name: 'emailVerified'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'Boolean'; ofType: null; }; } }; 'id': { name: 'id'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'ID'; ofType: null; }; } }; 'updatedAt': { name: 'updatedAt'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; } }; }; };
    'VoiceActor': { kind: 'OBJECT'; name: 'VoiceActor'; fields: { 'language': { name: 'language'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'person': { name: 'person'; type: { kind: 'OBJECT'; name: 'Person'; ofType: null; } }; }; };
};

/** An IntrospectionQuery representation of your schema.
 *
 * @remarks
 * This is an introspection of your schema saved as a file by GraphQLSP.
 * It will automatically be used by `gql.tada` to infer the types of your GraphQL documents.
 * If you need to reuse this data or update your `scalars`, update `tadaOutputLocation` to
 * instead save to a .ts instead of a .d.ts file.
 */
export type introspection = {
  name: never;
  query: 'Query';
  mutation: never;
  subscription: never;
  types: introspection_types;
};

import * as gqlTada from 'gql.tada';

declare module 'gql.tada' {
  interface setupSchema {
    introspection: introspection
  }
}