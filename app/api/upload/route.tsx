import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const files = form.getAll("files") as File[];
    
    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Validate all files first
    const invalidFiles = files.filter(file => 
      file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")
    );
    
    if (invalidFiles.length > 0) {
      return NextResponse.json({ 
        error: `Invalid file types: ${invalidFiles.map(f => f.name).join(", ")}` 
      }, { status: 400 });
    }

    type SuccessfulDoc = { id: string; title: string };
    type FailedDoc = { file: string; error: string };
    type UploadResult =
      | { success: true; data: SuccessfulDoc; file: string }
      | { success: false; error: string; file: string };

    const results: { successful: SuccessfulDoc[]; failed: FailedDoc[] } = {
      successful: [],
      failed: []
    };

    // Process files in parallel for better performance
    const uploadPromises: Promise<UploadResult>[] = files.map(async (file) => {
      try {
        const storagePath = `pdfs/${userId}/${crypto.randomUUID()}.pdf`;
        const arrayBuf = await file.arrayBuffer();
        
        // Upload to Supabase Storage
        const { error: uploadErr } = await supabaseAdmin.storage
          .from("pdfs")
          .upload(storagePath, Buffer.from(arrayBuf), {
            contentType: "application/pdf",
            upsert: false,
          });

        if (uploadErr) {
          throw new Error(`Storage upload failed: ${uploadErr.message}`);
        }

        // Create document record
        const { data, error } = await supabaseAdmin
          .from("documents")
          .insert({
            user_id: userId,
            title: file.name.replace(/\.pdf$/i, ""),
            storage_path: storagePath,
            bytes: file.size,
            status: "ready", // Set to ready immediately since there's no processing
          })
          .select()
          .single();

        if (error) {
          // Clean up uploaded file if database insert fails
          await supabaseAdmin.storage
            .from("pdfs")
            .remove([storagePath]);
          throw new Error(`Database insert failed: ${error.message}`);
        }

        return { success: true, data: { id: data.id, title: data.title }, file: file.name };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          file: file.name,
        };
      }
    });

    const uploadResults = await Promise.all(uploadPromises);

    // Separate successful and failed uploads
    uploadResults.forEach(result => {
      if (result.success) {
        results.successful.push(result.data);
      } else {
        results.failed.push({
          file: result.file,
          error: result.error
        });
      }
    });

    // Return appropriate response based on results
    if (results.failed.length === 0) {
      return NextResponse.json({ 
        success: true,
        documents: results.successful,
        message: `Successfully uploaded ${results.successful.length} file(s)`
      });
    } else if (results.successful.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: "All uploads failed",
        failed: results.failed
      }, { status: 500 });
    } else {
      return NextResponse.json({ 
        success: true,
        documents: results.successful,
        failed: results.failed,
        message: `Uploaded ${results.successful.length} file(s), ${results.failed.length} failed`
      });
    }

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ 
      error: "Internal server error during upload" 
    }, { status: 500 });
  }
}
