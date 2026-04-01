"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function HeroCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const images = [
    {
      src: "/images/landing/hero.webp",
      alt: "Children playing traditional Indonesian games in a village",
      href: null,
    },
    {
      src: "/images/landing/nusland (1).webp",
      alt: "Nusantara Legacy Virtual Tour Preview",
      href: "https://nusantaraplay.kpoti.id/",
    },
  ];

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
              <a
                href={img.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-full block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="w-full h-full object-cover rounded-[3rem] grayscale-[20%] hover:grayscale-0 transition-all duration-700 hover:scale-100"
                  alt={img.alt}
                  src={img.src}
                />
              </a>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                className="w-full h-full object-cover rounded-[3rem] grayscale-[20%] hover:grayscale-0 transition-all duration-700 hover:scale-100"
                alt={img.alt}
                src={img.src}
              />
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
