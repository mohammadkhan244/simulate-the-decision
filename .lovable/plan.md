# Fix mobile layout + rename "Handle more demand"

## 1. Mobile "cut off" layout
In your screenshot the page only fills the left half of the phone screen and the decision choices are clipped ("Autc…"). That usually means something on the page is wider than the screen, so the phone zooms out to fit it. I haven't confirmed which part causes it yet.
- Open the page at real phone sizes (360, 390, 412 px wide) and find what is wider than the screen. The four decision choices and the spotlight/beam artwork behind them are the likeliest causes.
- Fix only that part so the page fits the screen. On phones, the four choices will either wrap into a 2x2 grid or scroll sideways within their own row, whichever matches how the page already behaves. Desktop stays the same.
- Check before and after on phone and desktop. Then click through all four choices, the skill dialogs and the exercise on a phone-sized screen.

## 2. Rename "Handle more demand" to "Scaling a business"
The change is small. The label appears in 4 places:
- the choice button caption
- the decision data label, which also shows in summaries and downloaded notes
- the exercise's decision sentence ("Handle more demand without relying on the founder…"), reworded to "Scale the business without relying on the founder for every exception."
- the allowed decision types the server accepts for Notion saves

Other text in that path already reads naturally, so it stays: "Try a scaling scenario" and the heading "Can the business handle more demand without relying on the same few people?". Tell me if you want the heading reworded too.

**Notion impact:** the Stories database's "Decision type" column has a "Handle more demand" option. New saves would add a new option, "Scaling a business", and older records keep the old one. If you'd like old and new records grouped together, rename the option in Notion first.

## Technical details
- Edit `src/site/workshop.html` directly: CSS media-query fix for the overflowing element, plus the label in the button, the `decision-paths` JSON and the `scaling` exercise object.
- Update `DECISION_TYPES` in `src/lib/submissions.ts` and its tests, then run the tests.
- Playwright checks scrollWidth against innerWidth at phone widths.
