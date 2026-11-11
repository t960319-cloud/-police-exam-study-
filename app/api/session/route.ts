import { getStudyUser } from "../../../lib/study-user";
export async function GET() {
  return Response.json({ user: await getStudyUser() }, { headers: { "Cache-Control": "no-store, private", "Vary": "Cookie" } });
}
