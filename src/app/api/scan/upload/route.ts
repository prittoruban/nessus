import { NextRequest, NextResponse } from "next/server";
import { ReportService } from "@/lib/services/report.service";
import { handleApiError } from "@/lib/errors/errorHandler";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    // Extract all form fields
    const file = formData.get("file") as File;
    const orgName = formData.get("orgName") as string;
    const sourceType = formData.get("sourceType") as string;
    const reportName = formData.get("reportName") as string;
    const reportDescription = formData.get("reportDescription") as string;
    const documentType = formData.get("documentType") as string;
    const version = formData.get("version") as string;
    
    // Personnel
    const assessee = formData.get("assessee") as string;
    const assessor = formData.get("assessor") as string;
    const reviewer = formData.get("reviewer") as string;
    const approver = formData.get("approver") as string;
    const conductedBy = formData.get("conductedBy") as string;
    
    // Scan Details
    const scanStartDate = formData.get("scanStartDate") as string;
    const scanEndDate = formData.get("scanEndDate") as string;
    const testLocation = formData.get("testLocation") as string;
    const toolUsed = formData.get("toolUsed") as string;
    const scanDescription = formData.get("scanDescription") as string;
    
    // Report Content
    const methodology = formData.get("methodology") as string;
    const projectScopeNotes = formData.get("projectScopeNotes") as string;
    const conclusion = formData.get("conclusion") as string;
    const confidentialityLevel = formData.get("confidentialityLevel") as string;
    const legalDisclaimer = formData.get("legalDisclaimer") as string;

    // Validation
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!orgName) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      );
    }

    if (!reportName) {
      return NextResponse.json(
        { error: "Report name is required" },
        { status: 400 }
      );
    }

    if (!scanStartDate || !scanEndDate) {
      return NextResponse.json(
        { error: "Scan start and end dates are required" },
        { status: 400 }
      );
    }

    // Prepare report data
    const reportData = {
      orgName,
      sourceType: sourceType || "internal",
      reportName,
      reportDescription: reportDescription || `Uploaded from ${file.name}`,
      documentType: documentType || "Vulnerability Assessment Report",
      version: version || "1.0",
      assessee,
      assessor,
      reviewer,
      approver,
      conductedBy,
      scanStartDate,
      scanEndDate,
      testLocation: testLocation || "On-site",
      toolUsed: toolUsed || "Nessus",
      scanDescription: scanDescription || "Network Vulnerability Assessment",
      methodology,
      projectScopeNotes,
      conclusion,
      confidentialityLevel: confidentialityLevel || "Internal",
      legalDisclaimer: legalDisclaimer || "This document contains confidential and proprietary information."
    };

    const service = new ReportService();
    const result = await service.processUpload(file, reportData);

    return NextResponse.json({
      success: true,
      message: "Upload successful",
      data: result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
