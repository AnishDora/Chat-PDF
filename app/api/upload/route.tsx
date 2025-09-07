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

  const form = await req.formData();
  const files = form.getAll("files") as File[];
  if (!files.length) {
    return NextResponse.json({ error: "No files" }, { status: 400 });
  }

  const created: any[] = [];

  for (const file of files) {
    const looksPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!looksPdf) {
      return NextResponse.json({ error: `Not a PDF: ${file.name}` }, { status: 400 });
    }

    const storagePath = `pdfs/${userId}/${crypto.randomUUID()}.pdf`;

    const arrayBuf = await file.arrayBuffer();
    const { error: uploadErr } = await supabaseAdmin.storage
      .from("pdfs")
      .upload(storagePath, Buffer.from(arrayBuf), {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin
      .from("documents")
      .insert({
        user_id: userId,                               
        title: file.name.replace(/\.pdf$/i, ""),      
        storage_path: storagePath,                     
        bytes: file.size,
        status: "processing",                        
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    created.push(data);
  }

  return NextResponse.json({ documents: created });
}
