import { graphql } from "gql.tada";

export const MeQuery = graphql(`
  query Me {
    me {
      id
      email
      avatar
    }
  }
`);
