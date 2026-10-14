// Pure, environment-free submission logic: validation, Notion property mapping, chunking.
import { z } from "zod";

export const ENQUIRY_DATA_SOURCE_ID = "d0e8afa0-af45-478d-818d-460cfa4469f9";
export const EXERCISE_DATA_SOURCE_ID = "1df7569e-4515-492a-b998-93298827d143";

export const DECISION_TYPES = [
  "Replace a system",
  "Automate a process",
  "Build or buy a tool",
  "Handle more demand",
] as const;

const text = (max: number) => z.string().trim().max(max);
const required = (max: number) => text(max).min(1);

// Limits mirror the maxlength/min/max attributes in the original page.
export const enquirySchema = z
  .object({
    name: required(120),
    email: z.string().trim().email().max(254),
    company: required(160),
    decision: required(2000),
    deadline: required(120),
    participant_count: z.number().int().min(1).max(500),
    skill: text(300).optional(),
    source: z.literal("workshop-website"),
    submission_id: z.string().uuid(),
    website: z.string().max(500).optional(), // honeypot
  })
  .strict();

export const exerciseSchema = z
  .object({
    decision_type: z.enum(DECISION_TYPES),
    character_role: required(200),
    writing_seconds: z.union([z.literal(90), z.literal(600)]),
    scene: required(30000),
    observation: required(5000),
    assumption: required(5000),
    connection: required(5000),
    move: required(5000),
    seen_it: required(5000),
    data_shown: z.enum(["Yes", "No", "Not sure"]),
    lives_instead: text(5000).optional(),
    prove_wrong: text(5000).optional(),
    generated_summary: text(5000),
    situation_prompt: required(2000),
    character_prompt: required(2000),
    emotion_prompt: required(2000),
    lens_prompt: required(2000),
    reflection_prompt: required(2000),
    submission_id: z.string().uuid(),
    website: z.string().max(500).optional(),
  })
  .strict();

export type EnquiryInput = z.infer<typeof enquirySchema>;
export type ExerciseInput = z.infer<typeof exerciseSchema>;

/** Split text into Notion rich_text objects of at most 2000 characters each, without losing content. */
export function richText(value: string, size = 2000) {
  const parts: { type: "text"; text: { content: string } }[] = [];
  const chars = Array.from(value); // avoid splitting surrogate pairs
  for (let i = 0; i < chars.length; i += size) {
    parts.push({ type: "text", text: { content: chars.slice(i, i + size).join("") } });
  }
  return parts;
}

const rt = (v: string) => ({ rich_text: richText(v) });

export function enquiryProperties(d: EnquiryInput) {
  return {
    Name: { title: richText(d.name) },
    "Work email": { email: d.email },
    Company: rt(d.company),
    "Team decision": rt(d.decision),
    "Decision deadline": rt(d.deadline),
    Participants: { number: d.participant_count },
    ...(d.skill ? { "Skill of interest": rt(d.skill) } : {}),
    Source: rt(d.source),
    "Submission ID": rt(d.submission_id),
    Status: { status: { name: "New" } },
  };
}

export function exerciseTitle(d: ExerciseInput, now: Date) {
  const date = now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return `${d.decision_type} – ${d.character_role} – ${date}`;
}

export function exerciseProperties(d: ExerciseInput, now = new Date()) {
  return {
    Response: { title: richText(exerciseTitle(d, now)) },
    "Decision type": { select: { name: d.decision_type } },
    "Character role": rt(d.character_role),
    "Writing time (seconds)": { number: d.writing_seconds },
    Story: rt(d.scene),
    "Line from the story": rt(d.observation),
    "Assumption to check": rt(d.assumption),
    "Connection to work": rt(d.connection),
    "Next check": rt(d.move),
    "Where you've seen it": rt(d.seen_it),
    "Would data have shown this?": { select: { name: d.data_shown } },
    "Where it lives instead": rt(d.data_shown === "Yes" ? "" : (d.lives_instead ?? "")),
    "What would prove it wrong": rt(d.prove_wrong ?? ""),
    "Generated summary": rt(d.generated_summary),
    "Situation card": rt(d.situation_prompt),
    "Character card": rt(d.character_prompt),
    "Emotion card": rt(d.emotion_prompt),
    "Lens card": rt(d.lens_prompt),
    "Reflection card": rt(d.reflection_prompt),
    Source: rt("workshop-website-exercise-v2"),
    "Submission ID": rt(d.submission_id),
    Status: { status: { name: "New" } },
  };
}
