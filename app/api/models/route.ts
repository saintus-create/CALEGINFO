import { servedModels } from "@/agent/lib/models";

export async function GET() {
  return Response.json({ models: servedModels() });
}
