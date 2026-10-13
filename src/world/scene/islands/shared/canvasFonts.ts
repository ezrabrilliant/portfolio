/** Font stacks for canvas-drawn screens (GTID board, receipts, chat). Files are self-hosted under /fonts/canvas. */
export const CANVAS_FONTS = {
  ui: '"World Canvas UI", system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: '"World Canvas Mono", ui-monospace, "SFMono-Regular", Consolas, monospace',
} as const;

let ready: Promise<void> | null = null;

export function loadCanvasFonts(): Promise<void> {
  if (ready) return ready;
  const faces = [
    new FontFace("World Canvas UI", "url(/fonts/canvas/schibsted-grotesk-500.woff)", { weight: "500" }),
    new FontFace("World Canvas UI", "url(/fonts/canvas/schibsted-grotesk-700.woff)", { weight: "700" }),
    new FontFace("World Canvas Mono", "url(/fonts/canvas/ibm-plex-mono-500.woff)", { weight: "500" }),
  ];
  ready = Promise.all(
    faces.map((f) =>
      f.load().then((loaded) => {
        document.fonts.add(loaded);
      }),
    ),
  )
    .then(() => undefined)
    .catch((err: unknown) => {
      // fall back to the system stack rather than never drawing
      console.warn("[canvasFonts] failed to load self-hosted fonts; using fallbacks", err);
    });
  return ready;
}
