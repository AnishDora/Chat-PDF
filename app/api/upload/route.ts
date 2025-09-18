import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { pdfProcessor } from "@/lib/chunk";
import { ragSystem } from "@/lib/rag";

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

        // Create document record with processing status
        const { data, error } = await supabaseAdmin
          .from("documents")
          .insert({
            user_id: userId,
            title: file.name.replace(/\.pdf$/i, ""),
            storage_path: storagePath,
            bytes: file.size,
            status: "processing", // Set to processing for PDF processing
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

        // Process PDF and create chunks
        try {
          const { chunks, pageCount } = await pdfProcessor.processPDF(Buffer.from(arrayBuf), data.id);
          
          // Store chunks in database
          const chunkRecords = chunks.map(chunk => ({
            id: chunk.id,
            document_id: chunk.document_id,
            user_id: userId,
            content: chunk.content,
            page_number: chunk.page_number,
            chunk_index: chunk.chunk_index,
          }));

          const { error: chunksError } = await supabaseAdmin
            .from("document_chunks")
            .insert(chunkRecords);

          if (chunksError) {
            console.error("Error inserting chunks:", chunksError);
            // Continue anyway, but log the error
          }

          // Update document status to ready and add page count
          await supabaseAdmin
            .from("documents")
            .update({ 
              status: "ready",
              page_count: pageCount
            })
            .eq("id", data.id);

          // Add chunks to vector store
          await ragSystem.addDocumentsToVectorStore(chunks);

        } catch (processingError) {
          console.error("Error processing PDF:", processingError);
          
          // Check if it's a quota error or FAISS error
          const isQuotaError = processingError instanceof Error && 
            (processingError.message.includes('quota') || processingError.message.includes('429'));
          const isFaissError = processingError instanceof Error && 
            (processingError.message.includes('faiss-node') || processingError.message.includes('FAISS'));
          
          if (isQuotaError || isFaissError) {
            // Update document status to ready but with a note about quota
            await supabaseAdmin
              .from("documents")
              .update({ 
                status: "ready",
                page_count: 1 // Set a default page count
              })
              .eq("id", data.id);
            
            console.log("PDF uploaded but processing skipped due to API limits (quota or FAISS)");
            // Continue without throwing error
          } else {
            // Update document status to failed for other errors
            await supabaseAdmin
              .from("documents")
              .update({ status: "failed" })
              .eq("id", data.id);
            
            throw new Error(`PDF processing failed: ${processingError instanceof Error ? processingError.message : 'Unknown error'}`);
          }
        }

        return { success: true as const, data: { id: data.id, title: data.title }, file: file.name };
      } catch (error) {
        return {
          success: false as const,
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
