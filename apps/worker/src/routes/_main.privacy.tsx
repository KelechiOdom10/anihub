import { createFileRoute } from "@tanstack/react-router";
import { privacyPolicyVersion } from "../lib/privacy";

export const Route = createFileRoute("/_main/privacy")({
  head: () => ({ meta: [{ title: "Privacy policy | Anihub" }] }),
  component: Privacy,
});

const contact = "[CONTACT ADDRESS: Kelechi to provide before publishing]";

function Privacy() {
  return (
    <article className="container mx-auto max-w-3xl space-y-6 py-28 text-slate-200">
      <p
        role="note"
        className="rounded-lg border border-amber-500/60 bg-amber-500/10 p-3 text-sm text-amber-200"
      >
        Draft for review ({privacyPolicyVersion}). This text has not been
        approved and must be finalised before AniHub asks anyone to agree to it.
      </p>
      <h1 className="text-3xl font-bold text-white">Privacy policy</h1>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-white">What AniHub keeps</h2>
        <p>
          When you sign in with Google or Discord, AniHub keeps your verified
          email address, your display name and the provider&apos;s account id so
          it can recognise you next time. It does not keep your profile picture
          or the provider&apos;s access tokens.
        </p>
        <p>
          AniHub also keeps what you create: collections, the anime in them,
          likes and comments. Each session stores the IP address and browser
          user agent it was created from, for security.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-white">Anime data</h2>
        <p>
          Anime details come from the MyAnimeList API. AniHub does not connect
          to your MyAnimeList account and receives no MyAnimeList user data.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-white">Where it is stored</h2>
        <p>
          AniHub runs on Cloudflare Workers and stores its data in Cloudflare
          D1. It has no advertising and does not sell or share your data.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-white">
          Accounts from the original AniHub
        </h2>
        <p>
          Accounts created on the original AniHub were copied to this version.
          You will be asked to agree to this policy the next time you sign in.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-white">
          Your choices and reporting abuse
        </h2>
        <p>
          To get a copy of your data, have it deleted, or report abuse or
          content that breaks the rules, contact {contact}.
        </p>
      </section>
    </article>
  );
}
