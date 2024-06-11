import Image from "next/image";

import { Meteors } from "./meteors";

interface InfoCardProps {
  heading: string;
  images: Array<{
    url: string;
    alt: string;
  }>;
}

export const InfoCard = ({ heading, images }: InfoCardProps) => {
  return (
    <div className="relative flex h-full w-full flex-col items-center gap-8 overflow-hidden rounded-lg bg-zinc-800 px-6 pt-12 transition-transform duration-300 ease-in-out hover:scale-105">
      <Meteors number={10} />
      <h4 className="line-clamp-2 max-w-48 text-center text-xl font-medium">
        {heading}
      </h4>
      <div className="-mb-4 flex -space-x-6">
        {images.slice(0, 3).map((image, index) => (
          <Image
            width={200}
            height={267}
            key={index}
            src={image.url}
            alt={image.alt}
            className={`aspect-[3/4] w-24 transform overflow-hidden rounded-lg border-[3px] border-zinc-800 shadow-lg transition-transform duration-300 ease-in-out hover:scale-105`}
            // transform to be at a slight angle
            style={{
              transform: `rotate(${index % 2 === 0 ? 5 : -5}deg)`,
            }}
          />
        ))}
      </div>
    </div>
  );
};
