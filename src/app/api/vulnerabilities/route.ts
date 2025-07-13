import { NextRequest, NextResponse } from "next/server";
import { VulnerabilityService } from "@/lib/services/vulnerability.service";
import { handleApiError } from "@/lib/errors/errorHandler";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const service = new VulnerabilityService();
    const result = await service.getVulnerabilities(queryParams);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
