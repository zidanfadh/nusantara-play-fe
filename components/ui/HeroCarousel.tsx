"use client";

import { useState, useRef, useEffect } from "react";
import { getImageProps, type StaticImageData } from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import heroImage from "@/public/images/landing/hero.webp";
import nuslandImage from "@/public/images/landing/nusland.webp";

/** The carousel is shown only from Tailwind's `lg` breakpoint (`hidden lg:block` in app/page.tsx). */
export const HERO_CAROUSEL_MEDIA = "(min-width: 1024px)";

/** 1x1 transparent GIF: what the <img> shows below `lg`, so phones download no carousel photo at all. */
export const EMPTY_IMAGE = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAACH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/**
 * Slide width in CSS px: the square box is lg:col-span-5 of the max-w-7xl hero grid, scaled 105 % (about
 * 510 px from 1280 px up, about 44vw between 1024 and 1279 px). With object-cover a 3:2 photo is drawn
 * 1.5 times as wide as the box, so its `sizes` is 1.5 times larger.
 */
export function heroSlideSizes(aspect: number): string {
  const factor = Math.max(1, aspect);
  return `(min-width: 1280px) ${Math.round(510 * factor)}px, ${Math.round(44 * factor)}vw`;
}

interface Slide {
  image: StaticImageData;
  alt: string;
  href: string | null;
}

const SLIDES: Slide[] = [
  {
    image: heroImage,
    alt: "Children playing traditional Indonesian games in a village",
    href: null,
  },
  {
    image: nuslandImage,
    alt: "Nusantara Virtual Tour Preview",
    // Phase 17: our own Jelajah Nusantara (the former external site no longer exists).
    href: "/jelajah",
  },
];

const SLIDE_CLASS =
  "w-full h-full object-cover rounded-[3rem] grayscale-[20%] hover:grayscale-0 transition-all duration-700 hover:scale-100";

/**
 * One slide through next/image (Phase 14): `getImageProps` builds the optimized srcset, which only a
 * `<source>` for the `lg` media query receives (art direction as in the Next.js docs). The first slide is
 * the one visible on load: eager with high fetch priority; the second slide is lazy.
 */
export function HeroSlideImage({ slide, first }: { slide: Slide; first: boolean }) {
  const { image, alt } = slide;
  const {
    props: { srcSet, sizes, width, height },
  } = getImageProps({ src: image, alt, sizes: heroSlideSizes(image.width / image.height) });
  return (
    <picture className="block w-full h-full">
      <source media={HERO_CAROUSEL_MEDIA} srcSet={srcSet} sizes={sizes} />
      <img
        className={SLIDE_CLASS}
        alt={alt}
        src={EMPTY_IMAGE}
        width={width}
        height={height}
        loading={first ? "eager" : "lazy"}
        fetchPriority={first ? "high" : undefined}
        decoding="async"
      />
    </picture>
  );
}

export function HeroCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const images = SLIDES;

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(Math.round(scrollLeft + clientWidth) < scrollWidth);
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current;
      const scrollAmount = direction === "left" ? -clientWidth : clientWidth;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  useEffect(() => {
    handleScroll();
    window.addEventListener("resize", handleScroll);
    return () => window.removeEventListener("resize", handleScroll);
  }, []);

  return (
    <div className="relative w-full h-full group rounded-[3rem] overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide no-scrollbar"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {images.map((img, idx) => (
          <div key={idx} className="w-full h-full flex-shrink-0 snap-center">
            {img.href ? (
              <Link href={img.href} className="w-full h-full block">
                <HeroSlideImage slide={img} first={idx === 0} />
              </Link>
            ) : (
              <HeroSlideImage slide={img} first={idx === 0} />
            )}
          </div>
        ))}
      </div>

      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center text-foreground hover:bg-background transition-colors opacity-0 group-hover:opacity-100 shadow-xl"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center text-foreground hover:bg-background transition-colors opacity-0 group-hover:opacity-100 shadow-xl"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-y-1/2 flex space-x-2 -translate-x-1/2">
        {images.map((_, idx) => (
          <button
            key={idx}
            className={`w-2 h-2 rounded-full transition-all ${
              idx === (canScrollLeft ? 1 : 0)
                ? "bg-primary w-4"
                : "bg-primary/30"
            }`}
            onClick={() => {
              if (scrollRef.current) {
                scrollRef.current.scrollTo({
                  left: idx * scrollRef.current.clientWidth,
                  behavior: "smooth",
                });
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}
