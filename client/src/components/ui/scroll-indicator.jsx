import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function ScrollIndicator({ children, className, showHint = true }) {
  const [hasScrolledOnce, setHasScrolledOnce] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const checkScroll = () => {
      if (!containerRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const hasScroll = scrollHeight > clientHeight;
      const nearBottom = scrollTop + clientHeight >= scrollHeight - 50;

      setCanScrollDown(hasScroll && !nearBottom);
      setIsNearBottom(nearBottom);

      if (scrollTop > 10 && !hasScrolledOnce) {
        setHasScrolledOnce(true);
      }
    };

    const container = containerRef.current;
    if (container) {
      checkScroll();
      container.addEventListener("scroll", checkScroll);
      window.addEventListener("resize", checkScroll);

      const observer = new MutationObserver(checkScroll);
      observer.observe(container, { childList: true, subtree: true });

      return () => {
        container.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
        observer.disconnect();
      };
    }
  }, [hasScrolledOnce]);

  return (
    <div className={cn("relative h-full", className)}>
      <div
        ref={containerRef}
        className="h-full overflow-y-auto scroll-smooth"
      >
        {children}
      </div>

      <div
        className={cn(
          "pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background via-background/80 to-transparent transition-opacity duration-300",
          canScrollDown && !isNearBottom ? "opacity-100" : "opacity-0"
        )}
      />

      {showHint && canScrollDown && !hasScrolledOnce && (
        <div
          className={cn(
            "absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none transition-opacity duration-500",
            hasScrolledOnce ? "opacity-0" : "opacity-100"
          )}
        >
          <span className="text-xs text-muted-foreground font-medium">
            Scroll for more
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground animate-bounce" />
        </div>
      )}
    </div>
  );
}

export function PageScrollIndicator({ showHint = true }) {
  const [hasScrolledOnce, setHasScrolledOnce] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      const hasScroll = scrollHeight > clientHeight + 100;
      const nearBottom = scrollTop + clientHeight >= scrollHeight - 100;

      setCanScrollDown(hasScroll && !nearBottom);
      setIsNearBottom(nearBottom);

      if (scrollTop > 50 && !hasScrolledOnce) {
        setHasScrolledOnce(true);
      }
    };

    checkScroll();
    window.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);

    return () => {
      window.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [hasScrolledOnce]);

  if (!canScrollDown && hasScrolledOnce) return null;

  return (
    <>
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background via-background/60 to-transparent pointer-events-none transition-opacity duration-300 z-40",
          canScrollDown && !isNearBottom ? "opacity-100" : "opacity-0"
        )}
      />

      {showHint && canScrollDown && !hasScrolledOnce && (
        <div
          className={cn(
            "fixed bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none transition-opacity duration-500 z-50",
            hasScrolledOnce ? "opacity-0" : "opacity-100"
          )}
        >
          <span className="text-xs text-muted-foreground font-medium bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full border border-border">
            Scroll for more
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground animate-bounce" />
        </div>
      )}
    </>
  );
}
