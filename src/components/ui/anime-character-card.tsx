import Image from "next/image";

import { type AnimeCharactersQueryResult } from "~/graphql/queries";
import { cn } from "~/lib/utils";

type CharacterData = NonNullable<
  AnimeCharactersQueryResult["getAnimeCharacters"]
>[number];

interface AnimeCharacterCardProps {
  characterData: CharacterData;
  className?: string;
  loading?: "eager" | "lazy";
  onCardClick?: (character: CharacterData) => void;
}

export const AnimeCharacterCard = ({
  characterData,
  className,
  loading = "lazy",
  onCardClick,
}: AnimeCharacterCardProps) => {
  const { character, role, voiceActors } = characterData;
  const mainVoiceActor = voiceActors?.[0];

  const characterImage =
    character?.image?.default ??
    character?.image?.small ??
    "/fallback-character.avif";

  const voiceActorImage = mainVoiceActor?.person?.image ?? characterImage;
  const characterName = character?.name ?? "Unknown Character";
  const voiceActorName = mainVoiceActor?.person?.name ?? "Unknown Voice Actor";

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onCardClick?.(characterData);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onCardClick?.(characterData)}
      onKeyDown={handleKeyDown}
      className={cn(
        "group relative aspect-[2/3] w-full cursor-pointer overflow-hidden rounded-xl shadow-lg",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        className
      )}
      aria-label={`Character: ${characterName}, Voice Actor: ${voiceActorName}`}
    >
      {/* Images Container */}
      <div className="relative h-full w-full">
        {/* Character Image */}
        <Image
          fill
          priority={loading === "eager"}
          loading={loading}
          className={cn(
            "h-full w-full object-cover transition-all duration-300",
            "group-hover:scale-110",
            mainVoiceActor ? "group-hover:opacity-0" : "group-hover:opacity-100"
          )}
          src={characterImage}
          alt={characterName}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        {/* Voice Actor Image - Preloaded but hidden */}
        {mainVoiceActor && (
          <Image
            fill
            priority={loading === "eager"}
            loading={loading}
            className={cn(
              "absolute inset-0 h-full w-full scale-110 object-cover opacity-0 transition-opacity duration-300",
              "group-hover:opacity-100"
            )}
            src={voiceActorImage}
            alt={voiceActorName}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        )}

        {/* Gradient Overlay - Now transitions with the images */}
        <div
          className={cn(
            "absolute inset-0 z-10 bg-gradient-to-b from-background/20 via-transparent to-background/90",
            "transition-opacity duration-300"
          )}
          aria-hidden="true"
        />
      </div>

      {/* Text Content */}
      <div className="absolute inset-0 isolate z-20 flex items-end p-3">
        <div className="grid grid-cols-1 gap-1">
          {/* Character Info */}
          <div
            className={cn(
              "translate-y-8 transform transition-all duration-300",
              "group-hover:opacity-0"
            )}
          >
            <p className="line-clamp-1 font-semibold text-white">
              {characterName}
            </p>
            <p className="line-clamp-1 text-sm text-slate-300">{role}</p>
          </div>

          {/* Voice Actor Info */}
          <div
            className={cn(
              "transform transition-all duration-300",
              "translate-y-full opacity-0",
              "group-hover:-translate-y-3 group-hover:opacity-100"
            )}
            aria-hidden="true"
          >
            <p className="line-clamp-1 text-sm font-medium text-white">
              {voiceActorName}
            </p>
            <p className="text-sm text-slate-300">Voice Actor</p>
          </div>
        </div>
      </div>
    </div>
  );
};
