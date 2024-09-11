"use client";

import ColorThief from "colorthief";
import Image from "next/image";
import { useRef, useState } from "react";

import { type CharacterPreview } from "~/graphql/fragments";
import { cn } from "~/lib/utils";
import { extractCharacterDetails } from "~/lib/utils/anime";

interface CharacterCardProps {
  character: CharacterPreview;
}

export const CharacterCard = ({ character }: CharacterCardProps) => {
  const [color, setColor] = useState<string | null>(null);
  const [imageURL, setImageURL] = useState(
    character.image?.default ?? "/fallback-anime.avif"
  );
  const imgRef = useRef<HTMLImageElement>(null);

  return (
    <div
      className={cn(
        "flex aspect-video w-[45vw] max-w-96 shrink-0 items-stretch space-x-4 overflow-hidden rounded-md border px-3 py-3 transition-transform duration-300 ease-in-out hover:scale-105 md:w-[23vw] lg:py-5"
      )}
      style={{
        background: color
          ? `linear-gradient(to right, ${color} , #27272a, #09090b)`
          : "#27272a",
      }}
    >
      <Image
        src={imageURL}
        alt={character.name ?? "Anime Character"}
        ref={imgRef}
        onLoad={() => {
          if (imgRef.current) {
            const colorThief = new ColorThief();
            const color = colorThief.getColor(imgRef.current);
            if (color) {
              setColor(rgbToHex(color[0], color[1], color[2]));
            }
          }
        }}
        onError={() => setImageURL("/fallback-anime.avif")}
        width={250}
        height={400}
        className="w-[40%] rounded-md object-cover"
        crossOrigin="anonymous"
      />
      <div className="flex flex-col space-y-2">
        <h2 className="text-base font-semibold md:text-xl">{character.name}</h2>
        <div className="line-clamp-6 flex flex-col space-y-1 text-ellipsis">
          {character.about &&
            Object.entries(extractCharacterDetails(character.about))
              .filter(([_, value]) => value && value.length < 45)
              .slice(0, 4)
              .map(([key, value]) => (
                <p
                  key={key}
                  className="relative text-xs font-light text-gray-300 md:text-sm"
                >
                  <span className="font-semibold">{key}:</span> {value}
                </p>
              ))}
        </div>
      </div>
    </div>
  );
};

const rgbToHex = (r: number, g: number, b: number) =>
  "#" +
  [r, g, b]
    .map((x) => {
      const hex = x.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    })
    .join("");
