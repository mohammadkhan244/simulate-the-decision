import { describe, expect, it } from "vitest";

import workshopHtml from "@/site/workshop.html?raw";
import webinarsHtml from "@/site/webinars.html?raw";

const pages = [
  ["workshop", workshopHtml],
  ["webinars", webinarsHtml],
] as const;

describe("Site navigation labels and call to action", () => {
  for (const [name, html] of pages) {
    it(`combines Home and Workshop into one Workshop link on ${name}`, () => {
      expect(html).not.toContain('data-navlink="home"');
      expect(html).toContain('href="/" data-navlink="workshop">Workshop</a>');
      const navMatch = html.match(/<ul class="site-nav-links">[\s\S]*?<\/ul>/);
      expect(navMatch?.[0].match(/<li>/g)).toHaveLength(3);
    });

    it(`styles every banner nav item as a bordered pill button on ${name}`, () => {
      expect(html).toContain("border:1px solid var(--nav-btn-border);border-radius:999px");
      expect(html).toContain("background:var(--nav-btn-bg)");
    });

    it(`renames Story Graph to Story Analyzer on ${name}`, () => {
      expect(html).toContain("Story Analyzer");
      expect(html).not.toContain("Story Graph");
      expect(html).toContain('href="https://story-graph-three.vercel.app/"');
    });

    it(`shows Free Webinars as an animated pill on ${name}`, () => {
      expect(html).toContain('class="nav-pill" href="/webinars"');
      expect(html).toContain('class="nav-pill-dot"');
      expect(html).toContain("navPillRing");
      expect(html).toContain("navPillDot");
      expect(html).toContain("animation-play-state:paused");
      // The pulse must stop for people who ask for less motion.
      expect(html).toMatch(/prefers-reduced-motion:reduce\)\{[^}]*nav-pill/);
    });
  }

  it("turns the See all events link into a button with an arrow", () => {
    expect(webinarsHtml).toContain('class="primary calendar-events-btn"');
    expect(webinarsHtml).toContain('href="https://luma.com/Ficitoneering"');
    expect(webinarsHtml).toContain('class="btn-arrow"');
    expect(webinarsHtml).not.toContain("calendar-plain-link");
  });

  it("keeps every script element closed on the home page", () => {
    const opens = workshopHtml.match(/<script\b/g) ?? [];
    const closes = workshopHtml.match(/<\/script>/g) ?? [];
    expect(closes).toHaveLength(opens.length);
    // The nav handler must be its own script, not text inside another one.
    expect(workshopHtml).toMatch(/<\/script>\n<script>\(function\(\)\{var p=location\.pathname/);
  });
});
