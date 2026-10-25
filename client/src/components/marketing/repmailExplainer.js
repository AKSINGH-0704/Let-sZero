// The RepMail explainer, described once for every page that shows it.
//
// Measured from the master file (not estimated): H.264 1920x1080 @ 60fps,
// AAC stereo, 169.09s, 28,602,145 bytes, `moov` before `mdat` so it streams
// progressively over range requests. Narrated throughout, with a music bed.
// It carries NO embedded caption track. SHA-256 5ae6d2a78d06d3a0… — the
// "repmail version 4.mp4" supplied on 2026-10-25, served as-is (no transcode).
// Its domain step shows the three DKIM CNAMEs RepMail provides, its spam step
// scores the template, and its fields are ones the sender supports.
//
// Captions: repmail-explainer.en.vtt is the operator's
// repmail_explainer_captions.vtt (written for the previous cut) brought into
// line with this one. Cues 1–29 are unchanged and still start within 0.3s of
// the narration. From 1:42 the narration was re-edited, so those cues were
// retimed against it, three cues of narration that no longer exists were
// removed, and "Repmail" is spelled "RepMail".
//
// The poster is the 2:18.7 frame — the spam check flagging a phrase in the
// template at 7.9 — because it shows the product doing its job.
//
// Chapter starts were read off the narration's word timings and the audio
// level; each lands just before the first word of its section, so no chapter
// opens mid-sentence.

export const REPMAIL_EXPLAINER = {
  src: "/media/repmail-explainer.mp4",
  captionsSrc: "/media/repmail-explainer.en.vtt",
  poster: {
    src: "/media/repmail-explainer-poster-960.webp",
    srcSet:
      "/media/repmail-explainer-poster-960.webp 960w, /media/repmail-explainer-poster-1920.webp 1920w",
    sizes: "(min-width: 1120px) 1080px, 100vw",
    width: 1920,
    height: 1080,
  },
  title: "See RepMail in action",
  duration: "2 minutes 49 seconds",
  durationLabel: "2:49",
  chapters: [
    { at: "0:00", label: "Why good email lands in spam" },
    { at: "0:16", label: "The four signals behind your score" },
    { at: "0:51", label: "Warming up and cleaning your list" },
    { at: "1:42", label: "Verifying your sending domain" },
    { at: "1:50", label: "A campaign in RepMail, upload to send" },
  ],
};
