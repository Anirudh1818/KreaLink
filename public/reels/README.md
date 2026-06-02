# Creator reels (homepage collage)

Drop the creator video clips in **this folder** (`public/reels/`). They'll be
served directly by the site (no Firebase needed) and used in the homepage hero
collage as looping, muted background videos.

## How to add them
1. Copy your video files into this folder.
2. Name them simply and in order, e.g.:
   `reel-01.mp4`, `reel-02.mp4`, `reel-03.mp4` … `reel-30.mp4`
   (or include a creator label: `samay-01.mp4`, `mayafit-01.mp4` — your choice)
3. Tell Claude they're in, and the collage gets wired to play them.

## Ideal format (so the site stays fast)
- **Format:** `.mp4` (H.264) or `.webm`
- **Length:** short loops, ~3–8 seconds each
- **Size:** aim for **under ~1.5 MB each** (≈ 480–640px wide is plenty)
- **Orientation:** vertical/reel shape is perfect — the tiles are portrait
- Audio doesn't matter — the collage plays everything muted

If your reels are big/raw (10–30 MB each), that's fine — drop them anyway and
Claude can compress them for web first (downscale, trim, strip audio).
