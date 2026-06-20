import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Apenas JPG e PNG são aceitos" }, { status: 400 });
    }

    const maxSize = 30 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "Arquivo deve ter menos de 30MB" }, { status: 400 });
    }

    const ext = file.type === "image/png" ? "png" : "jpg";
    const filename = `${crypto.randomUUID()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("ad-images")
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from("ad-images")
      .getPublicUrl(filename);

    return NextResponse.json({ url: urlData.publicUrl, filename });
  } catch (err) {
    console.error("[api/upload] Error:", err);
    return NextResponse.json({ error: "Falha no upload" }, { status: 500 });
  }
}
