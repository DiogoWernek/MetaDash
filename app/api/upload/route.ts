import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 400 });
    }

    const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png"];
    const allowedVideoTypes = ["video/mp4", "video/quicktime"];
    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Apenas JPG, PNG (imagem) ou MP4/MOV (vídeo) são aceitos" }, { status: 400 });
    }

    const isVideo = allowedVideoTypes.includes(file.type);
    const maxSize = (isVideo ? 90 : 30) * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: `Arquivo deve ter menos de ${isVideo ? 90 : 30}MB` }, { status: 400 });
    }

    const extByType: Record<string, string> = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "video/mp4": "mp4",
      "video/quicktime": "mov",
    };
    const ext = extByType[file.type] ?? "bin";
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
