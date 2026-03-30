import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

async function generate() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY not found");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: 'Two polar bears in minimalistic animation style, clean lines, simple shapes, white and light blue palette, high quality icon, centered, 1:1 aspect ratio.',
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
      },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) {
    console.error("No parts in response");
    process.exit(1);
  }

  for (const part of parts) {
    if (part.inlineData) {
      const base64Data = part.inlineData.data;
      const buffer = Buffer.from(base64Data, 'base64');
      const publicDir = path.join(process.cwd(), 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir);
      }
      fs.writeFileSync(path.join(publicDir, 'icon.png'), buffer);
      console.log('Icon generated and saved to public/icon.png');
      return;
    }
  }
  console.error("No image data found in response");
}

generate().catch(console.error);
