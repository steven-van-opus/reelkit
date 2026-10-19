// Where a short-form video's frame (1080 × 1920) is safe to draw on: Instagram Reels, TikTok and YouTube Shorts lay
// their own UI over the edges (the top bar, the right-hand rail of buttons, and the caption, name and audio rows at
// the bottom), so anything that must be read stays inside SAFE_ZONE. The spoken-word captions sit in CAPTION_BAND,
// and nothing important is drawn there either. Shared by every look and style (the writer's best practices, the
// code-scene checks, the full-frame canvas look).
export const FRAME = { width: 1080, height: 1920 };

/** Inside these bounds, nothing is covered by a platform's UI. */
export const SAFE_ZONE = { left: 60, right: 960, top: 250, bottom: 1480 };

/** A horizontal band of the frame, from y `top` to y `bottom`. */

/** Where the spoken-word captions are drawn: keep words and key visuals out of it. */
export const CAPTION_BAND = { top: 1300, bottom: 1470 };

/** Where a full-frame scene's content goes: the safe zone above the captions. Backgrounds may run edge to edge. */
export const CONTENT_ZONE = { left: SAFE_ZONE.left, right: SAFE_ZONE.right, top: SAFE_ZONE.top, bottom: CAPTION_BAND.top - 20 };
