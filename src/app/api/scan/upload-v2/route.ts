import { NextRequest, NextResponse } from "next/server";
import { VulnerabilityService } from "@/lib/services/vulnerability.service";
import { handleApiError } from "@/lib/errors/errorHandler";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    const service = new VulnerabilityService();
    const result = await service.processUpload(file);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
