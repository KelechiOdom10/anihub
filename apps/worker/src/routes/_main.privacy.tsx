import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_main/privacy")({
  head: () => ({ meta: [{ title: "Privacy policy | Anihub" }] }),
  component: Privacy,
});

const contact = "kelechiodom10@gmail.com";

function Privacy() {
  return (
    <article className="container mx-auto max-w-3xl space-y-6 py-28 text-slate-200">
      <h1 className="text-3xl font-bold text-white">Privacy policy</h1>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-white">What we keep</h2>
        <p>
          From Google or Discord: your email, display name and account id. We
          also keep which one you used, the permissions you granted, when you
          agreed to this policy, and the IP address and browser of each sign-in.
          A cookie keeps you signed in.
        </p>
        <p>
          Plus what you add: collections, likes and comments. Accounts from the
          original AniHub were copied over, including any profile picture.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-white">Who sees it</h2>
        <p>
          Public collections and comments show your display name. We store
          everything with Cloudflare and never sell it.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-white">Anime data</h2>
        <p>
          Anime details come from MyAnimeList. We never see your MyAnimeList
          account.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-white">Contact</h2>
        <p>
          To get a copy of your data, delete it, or report abuse, email{" "}
          <a
            className="underline underline-offset-4"
            href={`mailto:${contact}`}
          >
            {contact}
          </a>
          .
        </p>
      </section>
    </article>
  );
}
