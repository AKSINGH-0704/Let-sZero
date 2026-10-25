/**
 * Click-to-play product walkthrough.
 *
 * Built for the RepMail explainer: a 2:49, 1080p, NARRATED video with a music
 * bed. Narration is why this is never autoplayed, looped or used as a
 * background — it only makes sense with sound, and sound needs a person to ask
 * for it.
 *
 * Network behaviour is the main design constraint. The file is ~29MB, so
 * nothing about it is requested until the visitor presses play:
 *
 *   - Before interaction the <video> has NO src. `preload="none"` alone is a
 *     hint some engines treat loosely; an element with no source cannot fetch.
 *   - The poster is an ordinary <img> (16–35KB WebP) that is not in the
 *     prerendered markup at all; it is attached when the player comes within
 *     ~300px of the viewport. Native `loading="lazy"` was measured NOT to be
 *     lazy enough: Chrome's lazy-load distance is over a screen, so on a
 *     phone the poster downloaded during the critical window and delayed the
 *     hero's text LCP by ~250ms on Slow 4G. A `poster` attribute would be
 *     worse still — fetched eagerly, and it can't take a srcset.
 *   - On press, src is assigned and play() is called INSIDE the click handler.
 *     Calling play() from an effect after a re-render loses the user gesture
 *     on iOS Safari, which then refuses playback with sound.
 *
 * The box reserves its 16:9 geometry from the first paint (`aspect-ratio`), so
 * neither the poster nor the video arriving can shift the page.
 *
 * The video's last seconds carry its own end card. When playback ends we cover
 * that frame with the page's real next step, so the page — not the asset —
 * owns the call to action.
 *
 * Captions: the source has no caption track and its on-screen text does not
 * transcribe the narration. `captionsSrc` takes a reviewed WebVTT file; nothing
 * is generated here. Its <track> is attached with the poster, not prerendered.
 */

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";

/** "3:07" -> 187. Exported for the chapter list and tests. */
export function toSeconds(stamp) {
  const [m, s] = String(stamp).split(":").map(Number);
  return m * 60 + s;
}

const ProductVideo = forwardRef(function ProductVideo({
  src,
  poster,
  title,
  duration,
  durationLabel,
  captionsSrc,
  chapters,
  endTitle = "Ready when you are.",
  endAction,
  className = "",
  frameClassName = "",
  frameStyle,
  chapterTone = "dark",
}, ref) {
  const videoRef = useRef(null);
  const endRef = useRef(null);
  // idle -> playing (controls visible) -> ended (end card) ; error at any point
  const [phase, setPhase] = useState("idle");
  const [posterFailed, setPosterFailed] = useState(false);
  const [posterNear, setPosterNear] = useState(false);
  const frameRef = useRef(null);
  const pendingSeek = useRef(null);
  const posterImgRef = useRef(null);

  const start = useCallback(
    (at = 0) => {
      const v = videoRef.current;
      if (!v) return;
      if (!v.getAttribute("src")) {
        // The poster the visitor is looking at is already decoded; handing it
        // to the element avoids a black frame while the first bytes arrive.
        // (Started from the hero link, the poster may not be attached yet.)
        v.poster = posterImgRef.current?.currentSrc || poster.src;
        v.src = src;
      }
      pendingSeek.current = at;
      try {
        v.currentTime = at;
      } catch {
        /* HAVE_NOTHING in an engine that refuses early seeks — applied on loadedmetadata */
      }
      setPhase("playing");
      const p = v.play();
      // Autoplay policy can still refuse (e.g. a browser set to block all
      // audio). The native controls are now visible, so the visitor can press
      // play themselves; nothing else to do.
      if (p && typeof p.catch === "function") p.catch(() => {});
      v.focus({ preventScroll: true });
    },
    [src, poster.src],
  );

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setPosterNear(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setPosterNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Lets an outside control ("Watch the walkthrough" in a hero) start this
  // player. The caller must invoke it from its own click handler so the user
  // gesture — which iOS needs for playback with sound — is still live.
  useImperativeHandle(ref, () => ({ start }), [start]);

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    const at = pendingSeek.current;
    if (v && at && Math.abs(v.currentTime - at) > 0.5) v.currentTime = at;
    pendingSeek.current = null;
  };

  const onEnded = () => {
    setPhase("ended");
  };

  useEffect(() => {
    if (phase !== "ended") return;
    // The video element held focus and is now covered; hand focus to the end
    // card so a keyboard user lands on the next step instead of on nothing.
    if (endRef.current && endRef.current.parentElement?.contains(document.activeElement)) {
      endRef.current.focus({ preventScroll: true });
    }
  }, [phase]);

  const onError = () => {
    // Only meaningful once a source was assigned; an idle element has none.
    if (videoRef.current?.getAttribute("src")) setPhase("error");
  };

  // Drop the failed source and start over from inside this click, so the
  // retry is still a user gesture and the element refetches from scratch.
  const retry = () => {
    const v = videoRef.current;
    if (!v) return;
    v.removeAttribute("src");
    v.load();
    start(0);
  };

  const playLabel = `Play ${title} — ${duration ?? durationLabel} with narration`;

  return (
    <div className={className}>
      <div
        ref={frameRef}
        data-product-video=""
        data-phase={phase}
        className={`relative w-full overflow-hidden bg-[#0B0A12] [aspect-ratio:16/9] ${frameClassName}`}
        style={frameStyle}
      >
        {/* No src, no autoplay, no loop, no muted: see the header. `cursor-auto`
            in fullscreen because the marketing page hides the native cursor
            and draws its own, and its overlay cannot follow into fullscreen. */}
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full bg-black [&:fullscreen]:cursor-auto"
          preload="none"
          playsInline
          controls={phase === "playing" || phase === "ended"}
          aria-label={title}
          aria-hidden={phase === "idle" ? "true" : undefined}
          tabIndex={phase === "idle" ? -1 : undefined}
          onLoadedMetadata={onLoadedMetadata}
          onEnded={onEnded}
          onPlay={() => setPhase("playing")}
          onError={onError}
        >
          {/* Gated like the poster. In the prerendered markup a `default`
              track is fetched at page load — measured: twice, before any
              interaction — so it only appears once the player is near. It is
              still in place before play assigns src, so default selection
              behaves as for a static track. */}
          {captionsSrc && posterNear ? (
            <track kind="captions" src={captionsSrc} srcLang="en" label="English" default />
          ) : null}
        </video>

        {phase === "idle" && (
          <button
            type="button"
            onClick={() => start(0)}
            aria-label={playLabel}
            data-cursor="PLAY"
            className="group absolute inset-0 block h-full w-full text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-white/80"
          >
            {posterNear && !posterFailed && (
              <img
                ref={posterImgRef}
                src={poster.src}
                srcSet={poster.srcSet}
                sizes={poster.sizes}
                width={poster.width}
                height={poster.height}
                alt=""
                decoding="async"
                onError={() => setPosterFailed(true)}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            {/* Legibility scrim for the label only; the product frame above it
                stays untouched. */}
            <span
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 via-black/30 to-transparent"
            />
            <span aria-hidden="true" className="absolute inset-0 grid place-items-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-white text-[#15120D] shadow-[0_10px_40px_-8px_rgba(0,0,0,0.6)] transition-transform duration-200 motion-safe:group-hover:scale-105 sm:h-20 sm:w-20">
                <Play className="ml-1 h-7 w-7 fill-current sm:h-8 sm:w-8" />
              </span>
            </span>
            <span
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3 sm:p-5"
            >
              <span className="min-w-0 text-[13px] font-semibold leading-tight text-white sm:text-base">
                {title}
              </span>
              <span className="shrink-0 rounded-full bg-black/60 px-2.5 py-1 font-mono text-xs font-medium text-white tabular-nums">
                {durationLabel}
              </span>
            </span>
          </button>
        )}

        {phase === "ended" && (
          <div
            ref={endRef}
            tabIndex={-1}
            role="group"
            aria-label="Walkthrough finished"
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-y-auto bg-[#0B0A12]/90 p-3 text-center backdrop-blur-sm focus:outline-none sm:gap-5 sm:p-6"
          >
            {/* Compact below `sm`: at 320px the frame is ~153px tall, and the roomy
                layout overflowed it by 8px at both ends (measured). */}
            <p className="text-base font-semibold leading-tight text-white sm:text-2xl">{endTitle}</p>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
              {endAction}
              <button
                type="button"
                onClick={() => start(0)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/30 px-5 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:h-11"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Watch again
              </button>
            </div>
          </div>
        )}

        {phase === "error" && (
          <div
            role="alert"
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-y-auto bg-[#0B0A12] p-3 text-center sm:gap-3 sm:p-6"
          >
            <p className="text-base font-semibold text-white">The walkthrough couldn't load.</p>
            <p className="max-w-sm text-xs text-white/70 sm:text-sm">Check your connection, then try again.</p>
            <button
              type="button"
              onClick={retry}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/30 px-5 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:h-11"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Try again
            </button>
          </div>
        )}
      </div>

      {chapters?.length ? (
        <ol
          aria-label={`Chapters in ${title}`}
          className="mt-4 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3"
        >
          {chapters.map((c) => (
            <li key={c.at}>
              <button
                type="button"
                onClick={() => start(toSeconds(c.at))}
                className={`flex w-full items-baseline gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 ${
                  chapterTone === "dark"
                    ? "text-slate-300 hover:bg-white/5 hover:text-white focus-visible:ring-cyan-400/70"
                    : "text-[#5C564B] hover:bg-black/[0.04] hover:text-[#15120D] focus-visible:ring-[#15120D]/40"
                }`}
              >
                <span
                  className={`shrink-0 font-mono text-xs tabular-nums ${
                    chapterTone === "dark" ? "text-cyan-300" : "text-[#116F7B]"
                  }`}
                >
                  {c.at}
                </span>
                <span>
                  <span className="sr-only">Play from {c.at}: </span>
                  {c.label}
                </span>
              </button>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
});

export default ProductVideo;
