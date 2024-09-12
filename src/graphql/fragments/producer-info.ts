import { type FragmentOf, graphql } from "gql.tada";

export const ProducerPreview = graphql(`
  fragment ProducerPreview on Producer @_unmask {
    id
    url
    about
    image {
      imageUrl
    }
    titles {
      type
      title
    }
  }
`);
export type ProducerPreview = FragmentOf<typeof ProducerPreview>;
