import { describe, expect, it } from "vitest";
import { enquiryProperties, enquirySchema, exerciseProperties, exerciseSchema, richText } from "./submissions";

const id = "3f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f";
const enquiry = {
  name: "Ada", email: "ada@example.com", company: "Acme", decision: "Replace billing",
  deadline: "not set yet", participant_count: 8, source: "workshop-website" as const, submission_id: id,
};
const exercise = {
  decision_type: "Replace a system" as const, character_role: "The person maintaining it", writing_seconds: 90 as const,
  scene: "s", observation: "o", assumption: "a", connection: "c", move: "m", generated_summary: "g",
  situation_prompt: "sp", character_prompt: "cp", emotion_prompt: "ep", lens_prompt: "lp", reflection_prompt: "rp",
  submission_id: id,
};

describe("submissions", () => {
  it("splits long text into 2000-char chunks without truncation", () => {
    const long = "x".repeat(4500);
    const parts = richText(long);
    expect(parts.map((p) => p.text.content.length)).toEqual([2000, 2000, 500]);
    expect(parts.map((p) => p.text.content).join("")).toBe(long);
  });

  it("keeps the decision deadline as free text and sets Status New", () => {
    const p = enquiryProperties(enquirySchema.parse(enquiry));
    expect(p["Decision deadline"].rich_text[0]!.text.content).toBe("not set yet");
    expect(p.Status).toEqual({ status: { name: "New" } });
    expect(p.Participants).toEqual({ number: 8 });
    expect("Skill of interest" in p).toBe(false);
  });

  it("rejects participants above 500 and unknown fields", () => {
    expect(enquirySchema.safeParse({ ...enquiry, participant_count: 501 }).success).toBe(false);
    expect(enquirySchema.safeParse({ ...enquiry, extra: "x" }).success).toBe(false);
  });

  it("accepts only 90 or 600 second timers and the four decision types", () => {
    expect(exerciseSchema.safeParse({ ...exercise, writing_seconds: 120 }).success).toBe(false);
    expect(exerciseSchema.safeParse({ ...exercise, decision_type: "Other" }).success).toBe(false);
    expect(exerciseSchema.safeParse({ ...exercise, scene: "x".repeat(30001) }).success).toBe(false);
  });

  it("maps the exercise source and selected timer", () => {
    const p = exerciseProperties(exerciseSchema.parse(exercise), new Date("2026-10-12T00:00:00Z"));
    expect(p.Source.rich_text[0]!.text.content).toBe("workshop-website-exercise");
    expect(p["Writing time (seconds)"]).toEqual({ number: 90 });
    expect(p.Response.title[0]!.text.content).toBe("Replace a system – The person maintaining it – 12 Oct 2026");
  });
});
