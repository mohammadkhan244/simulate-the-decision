import { describe, expect, it } from "vitest";

import webinarsHtml from "@/site/webinars.html?raw";

describe("Webinars page testimonials", () => {
  it("renders every testimonial as a static wall instead of a scroll", () => {
    expect(webinarsHtml).toContain('class="testimonial-wall"');
    expect(webinarsHtml).toContain("Sandra Macele");
    expect(webinarsHtml).toContain("Greg Parker");
    expect(webinarsHtml.match(/<figure class="testimonial-slide"/g)).toHaveLength(2);
    // Full quotes start collapsed behind Read more, not visible in the wall.
    expect(webinarsHtml).toContain('<span class="quote-full" hidden>');
  });

  it("keeps no carousel machinery behind", () => {
    for (const gone of [
      "testimonial-carousel",
      "testimonial-track",
      "testimonial-window",
      "testimonial-controls",
      "requestAnimationFrame",
      "IntersectionObserver",
    ]) {
      expect(webinarsHtml).not.toContain(gone);
    }
  });
});
