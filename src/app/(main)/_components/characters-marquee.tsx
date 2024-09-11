import { type FunctionComponent } from "react";

import { CharacterCard } from "~/components/ui/character-card";
import Marquee from "~/components/ui/marquee";
import { type CharacterPreview } from "~/graphql/fragments";

interface CharactersMarqueeProps {
  characters: NonNullable<Array<CharacterPreview>>;
}

export const CharactersMarquee: FunctionComponent<CharactersMarqueeProps> = ({
  characters,
}) => {
  const firstRow = characters.slice(0, 5);
  const secondRow = characters.slice(5, characters.length - 1);

  return (
    <section className="flex flex-col space-y-8">
      <h3 className="text-xl font-bold text-white">Trending Characters</h3>
      <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-lg pb-20 md:shadow-xl">
        <Marquee pauseOnHover className="[--duration:100s]">
          {firstRow.map((character) => (
            <CharacterCard key={character.id} character={character} />
          ))}
        </Marquee>
        <Marquee reverse pauseOnHover className="[--duration:100s]">
          {secondRow.map((character) => (
            <CharacterCard key={character.id} character={character} />
          ))}
        </Marquee>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-background dark:from-background"></div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-background dark:from-background"></div>
      </div>
    </section>
  );
};
