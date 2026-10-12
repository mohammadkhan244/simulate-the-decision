// Server-only: Notion writes through the Lovable connector gateway, idempotency and rate limiting.
import {
  ENQUIRY_DATA_SOURCE_ID,
  EXERCISE_DATA_SOURCE_ID,
  enquiryProperties,
  enquirySchema,
  exerciseProperties,
  exerciseSchema,
} from "./submissions";

type Kind = "enquiry" | "exercise";
const GATEWAY = "https://connector-gateway.lovable.dev/notion/v1";
const NOTION_VERSION = "2025-09-03";
const MAX_BODY = 200_000;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

class Uncertain extends Error {}
class Rejected extends Error {}

function notionHeaders() {
  const lovable = process.env["LOVABLE_API_KEY"];
  const notion = process.env["NOTION_API_KEY"];
  if (!lovable || !notion) throw new Rejected("Notion connection is not configured");
  return {
    Authorization: `Bearer ${lovable}`,
    "X-Connection-Api-Key": notion,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

async function notionFetch(path: string, body: unknown, timeoutMs: number) {
  let res: Response;
  try {
    res = await fetch(`${GATEWAY}${path}`, {
      method: "POST",
      headers: notionHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new Uncertain("network/timeout");
  }
  if (res.ok) return (await res.json()) as Record<string, unknown>;
  const detail = (await res.text()).slice(0, 300);
  // Status only plus Notion's error code; never log submitted answers.
  console.error(`Notion ${path.split("/")[1]} failed [${res.status}] ${detail.match(/"code":"[^"]+"/)?.[0] ?? ""}`);
  if (res.status >= 500 || res.status === 429) throw new Uncertain(`status ${res.status}`);
  throw new Rejected(`status ${res.status}`);
}

async function findExisting(dataSourceId: string, submissionId: string) {
  const r = await notionFetch(
    `/data_sources/${dataSourceId}/query`,
    { filter: { property: "Submission ID", rich_text: { equals: submissionId } }, page_size: 1 },
    10_000,
  );
  const results = (r["results"] as { id: string }[] | undefined) ?? [];
  return results[0]?.id ?? null;
}

async function sha256(value: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function handleSubmission(request: Request, kind: Kind): Promise<Response> {
  // Same-origin only: the public page is the only legitimate caller.
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) return json(403, { ok: false });
  if (!(request.headers.get("content-type") ?? "").includes("application/json")) return json(415, { ok: false });
  const raw = await request.text();
  if (raw.length > MAX_BODY) return json(413, { ok: false });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { ok: false });
  }
  const parsed = kind === "enquiry" ? enquirySchema.safeParse(body) : exerciseSchema.safeParse(body);
  if (!parsed.success) return json(400, { ok: false, message: "Please check your answers." });
  const data = parsed.data;
  const submissionId = data.submission_id;

  // Honeypot: pretend success so bots learn nothing; nothing is written.
  if (data.website) return json(200, { ok: true, submissionId });

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipHash = (await sha256(`${kind}:${ip}`)).slice(0, 32);
  const [perVisitor, global] = await Promise.all([
    supabaseAdmin.rpc("hit_rate_limit", { _bucket: `${kind}:ip:${ipHash}`, _window_seconds: 600, _max: kind === "enquiry" ? 8 : 15 }),
    supabaseAdmin.rpc("hit_rate_limit", { _bucket: `${kind}:all`, _window_seconds: 3600, _max: 300 }),
  ]);
  if (perVisitor.error || global.error) return json(503, { ok: false });
  if (!perVisitor.data || !global.data) return json(429, { ok: false, message: "Too many submissions. Please wait a few minutes." });

  const dataSourceId = kind === "enquiry" ? ENQUIRY_DATA_SOURCE_ID : EXERCISE_DATA_SOURCE_ID;
  const finish = (status: "saved" | "failed", pageId: string | null) =>
    supabaseAdmin.rpc("finish_submission", { _id: submissionId, _status: status, _page_id: pageId as string });

  // Atomic claim; concurrent requests with the same ID wait for the winner.
  let outcome = "";
  for (let attempt = 0; attempt < 16; attempt++) {
    const { data: rows, error } = await supabaseAdmin.rpc("claim_submission", { _id: submissionId, _kind: kind });
    if (error || !rows?.[0]) return json(503, { ok: false });
    outcome = rows[0].outcome;
    if (outcome === "saved") return json(200, { ok: true, submissionId });
    if (outcome === "conflict") return json(409, { ok: false });
    if (outcome !== "busy") break;
    await new Promise((r) => setTimeout(r, 750));
  }
  if (outcome === "busy") return json(409, { ok: false, message: "Still saving. Please try again shortly." });

  try {
    // A previous attempt may have reached Notion before failing/timing out: reconcile first.
    if (outcome === "reclaimed") {
      const existing = await findExisting(dataSourceId, submissionId);
      if (existing) {
        await finish("saved", existing);
        return json(200, { ok: true, submissionId });
      }
    }
    const properties = kind === "enquiry" ? enquiryProperties(data as never) : exerciseProperties(data as never);
    const page = await notionFetch(
      "/pages",
      { parent: { type: "data_source_id", data_source_id: dataSourceId }, properties },
      15_000,
    );
    await finish("saved", String(page["id"]));
    return json(200, { ok: true, submissionId });
  } catch (e) {
    await finish("failed", null);
    if (e instanceof Rejected) return json(502, { ok: false, message: "Could not be saved." });
    return json(504, { ok: false, message: "Could not confirm the save. Please try again." });
  }
}
