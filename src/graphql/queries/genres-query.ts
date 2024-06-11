import { graphql } from "gql.tada";

import { GenrePreview } from "../fragments";

export const GenresQuery = graphql(
  `
    query Genres {
      getGenres(query: { filter: genres }) {
        ...GenrePreview
      }
    }
  `,
  [GenrePreview]
);

export const AnimesByGenresQuery = graphql(`
  query AnimesByGenres($query: AnimesByGenresQueryParams!) {
    getAnimesByGenres(query: $query) {
      id
      title
      image {
        small
        default
      }
    }
  }
`);
