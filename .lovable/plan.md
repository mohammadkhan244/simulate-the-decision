# Add Sandra Macele and Greg Parker to the testimonials carousel

## What changes
- Add two new slides to the existing "What participants noticed" carousel, Sandra first and Greg second. They go before the five slides already there, and none of those are removed.
- Each new slide shows:
  - the short pull quote in the carousel's large serif style
  - a round 56px photo, the name in bold and the role in small grey text
  - a "Read more" link that opens the full quote in place, and "Show less" to close it again
- All text is copied exactly as you wrote it.
- A dot is added for each new slide. Autoplay pauses while a full quote is open, so it doesn't rotate away mid-read.
- The section keeps its current look (light paper background, same fonts and colours) so it matches the rest of the page. Your brief asked for a dark background, but the page itself is light, so I'm keeping it light. I'm also leaving the heading as it is.
- No sideways scrolling on a 375px phone. The carousel grows taller when a full quote is open.

## Technical details
- Upload both photos as hosted images and point to them from the page file.
- Add the new slide markup and the CSS for the avatar, cite row and expander. Extend the existing carousel script for the extra dots and the pause-while-expanded behaviour.
- Check desktop and 375px mobile in the preview, including Read more / Show less and stepping through every dot.
