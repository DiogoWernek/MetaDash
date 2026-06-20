import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const USE_MOCK = process.env.MOCK_AGENT === "true" || !process.env.FAL_API_KEY;

export async function POST(req: NextRequest) {
  const body = await req.json() as { prompt?: string };
  const { prompt } = body;

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt é obrigatório" }, { status: 400 });
  }

  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 2800));
    const seed = Math.floor(Math.random() * 9999);
    return NextResponse.json({ url: `https://picsum.photos/seed/${seed}/1200/628` });
  }

  try {
    // Call fal.ai Flux Schnell
    const falRes = await fetch("https://fal.run/fal-ai/flux/schnell", {
      method: "POST",
      headers: {
        "Authorization": `Key ${process.env.FAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: `${prompt.trim()}, professional advertisement, high quality photo, no text overlay, suitable for social media`,
        image_size: "landscape_16_9",
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: true,
      }),
    });

    if (!falRes.ok) {
      const errText = await falRes.text();
      throw new Error(`fal.ai: ${errText}`);
    }

    const falData = await falRes.json() as { images: Array<{ url: string }> };
    const falImageUrl = falData.images[0]?.url;
    if (!falImageUrl) throw new Error("Nenhuma imagem retornada pela API");

    // Download the generated image
    const imgRes = await fetch(falImageUrl);
    if (!imgRes.ok) throw new Error("Falha ao baixar a imagem gerada");
    const buffer = await imgRes.arrayBuffer();

    // Upload to Supabase Storage (same bucket as manual uploads)
    const fileName = `generated/${Date.now()}.jpg`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("ad-images")
      .upload(fileName, buffer, { contentType: "image/jpeg", upsert: false });

    if (uploadError) throw new Error(`Supabase upload: ${uploadError.message}`);

    const { data: publicData } = supabaseAdmin.storage.from("ad-images").getPublicUrl(fileName);

    return NextResponse.json({ url: publicData.publicUrl });
  } catch (err) {
    console.error("[generate-image]", err);
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}
