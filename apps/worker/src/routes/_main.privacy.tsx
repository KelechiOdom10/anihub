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
          email address, your display name, which provider you used, that
          provider&apos;s id for your account and the permissions you granted,
          so it can recognise you next time. It also records which version of
          this policy you agreed to and when. It does not keep the
          provider&apos;s access tokens or, for new accounts, your profile
          picture.
        </p>
        <p>
          AniHub also keeps what you create: collections, the anime in them,
          likes and comments. Signing in sets a session cookie, and each session
          stores the IP address and browser user agent it was created from, for
          security.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-white">
          What other people can see
        </h2>
        <p>
          Collections and comments made on the original AniHub are kept. When
          AniHub shows them again, collections marked public and all comments
          will be visible to other people with your display name.
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
          D1, so Cloudflare processes it on AniHub&apos;s behalf. Google or
          Discord handle the sign-in itself. AniHub has no advertising, does not
          sell your data, and gives it to no one else apart from what you make
          public.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-white">
          Accounts from the original AniHub
        </h2>
        <p>
          Accounts created on the original AniHub were copied to this version,
          including the profile picture link if you had one. You will be asked
          to agree to this policy before your account is first connected to
          Google or Discord.
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
