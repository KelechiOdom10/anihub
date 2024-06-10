import { graphql } from "gql.tada";

export const AnimePreview = graphql(`
  fragment AnimePreview on Anime @_unmask {
    id
    titles {
      type
      title
    }
    synopsis
    trailer {
      id
      embedUrl
      url
    }
    image {
      default
      large
    }
    genres {
      id
      name
    }
    score
    year
  }
`);
