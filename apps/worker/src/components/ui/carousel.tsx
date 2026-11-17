import { ArrowLeftIcon, ArrowRightIcon } from "@radix-ui/react-icons";
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from "embla-carousel-react";
import * as React from "react";
import { cn } from "../../lib/utils";
import { Button } from "./button";

type CarouselApi = UseEmblaCarouselType[1];

type CarouselContextProps = {
  carouselRef: UseEmblaCarouselType[0];
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
};

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

function useCarousel() {
  const context = React.useContext(CarouselContext);

  if (!context)
    throw new Error("useCarousel must be used within a <Carousel />");

  return context;
}

type CarouselProps = React.HTMLAttributes<HTMLDivElement> & {
  opts?: Parameters<typeof useEmblaCarousel>[0];
};

function Carousel({ opts, className, children, ...props }: CarouselProps) {
  const [carouselRef, api] = useEmblaCarousel({ ...opts, axis: "x" });
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);

  const onSelect = React.useCallback((current: CarouselApi) => {
    if (!current) return;

    setCanScrollPrev(current.canScrollPrev());
    setCanScrollNext(current.canScrollNext());
  }, []);

  const scrollPrev = React.useCallback(() => api?.scrollPrev(), [api]);
  const scrollNext = React.useCallback(() => api?.scrollNext(), [api]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollPrev();
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollNext();
    }
  };

  React.useEffect(() => {
    if (!api) return;

    onSelect(api);
    api.on("reInit", onSelect);
    api.on("select", onSelect);

    return () => {
      api.off("reInit", onSelect);
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  return (
    <CarouselContext.Provider
      value={{
        carouselRef,
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
      }}
    >
      <div
        onKeyDownCapture={handleKeyDown}
        className={cn("relative", className)}
        role="region"
        aria-roledescription="carousel"
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
}

function CarouselContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { carouselRef } = useCarousel();

  return (
    <div ref={carouselRef} className="overflow-hidden">
      <div className={cn("-ml-4 flex", className)} {...props} />
    </div>
  );
}

function CarouselItem({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="group"
      aria-roledescription="slide"
      className={cn("min-w-0 shrink-0 grow-0 basis-full pl-4", className)}
      {...props}
    />
  );
}

function CarouselPrevious({ className }: { className?: string }) {
  const { scrollPrev, canScrollPrev } = useCarousel();

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        "absolute -left-12 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full",
        className
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
    >
      <ArrowLeftIcon className="mx-auto size-5" />
      <span className="sr-only">Previous slide</span>
    </Button>
  );
}

function CarouselNext({ className }: { className?: string }) {
  const { scrollNext, canScrollNext } = useCarousel();

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        "absolute -right-12 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full",
        className
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
    >
      <ArrowRightIcon className="mx-auto size-5 self-center" />
      <span className="sr-only">Next slide</span>
    </Button>
  );
}

export {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
};
