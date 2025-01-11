import { type Metadata } from "next";
import { redirect } from "next/navigation";

import { CreateCollection } from "./create-collection";

import { getClient } from "~/graphql/client";
import { TopAnimeQuery } from "~/graphql/queries";
import { validateRequest } from "~/lib/auth/validate-request";

export const metadata: Metadata = {
  title: "Create Collection - AniHub",
  description: "Create a new anime collection",
};

export default async function NewCollectionPage() {
  const { session } = await validateRequest();
  if (!session) {
    redirect(`/login?redirect=${encodeURIComponent("/collections/new")}`);
  }

  const { data } = await getClient().query(TopAnimeQuery, {
    query: {
      limit: 20,
    },
  });

  return (
    <div className="container mx-auto mt-28 space-y-8 py-8">
      <CreateCollection topAnimes={data?.getTopAnimes ?? []} />
    </div>
  );
}
