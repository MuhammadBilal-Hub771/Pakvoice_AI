import os
import json
import uuid
import base64
from datetime import datetime, timezone

from openai import OpenAI, APIError, RateLimitError
from loguru import logger

from config import settings


class ImageService:
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)

    # ──────────────────────────────────────────────────────────
    # STEP 1: Extract structured brand details from pasted content
    # ──────────────────────────────────────────────────────────

    def extract_brand_details(self, content: str) -> dict:
        """Uses GPT to analyze pasted content and extract structured
        visual/brand details for accurate image generation.

        Removes noise (hashtags, phone numbers, CTAs) and returns
        only visually relevant information.
        """
        extraction_prompt = f"""
Analyze this marketing content and extract the following details
in JSON format ONLY (no extra text):

Content:
{content[:1000]}

Extract:
{{
  "business_name": "exact business name mentioned, or empty string if none",
  "industry": "specific industry/product category (e.g. pizza restaurant, clothing brand, IT services)",
  "key_products": "specific products or services mentioned (e.g. 'pepperoni pizza, garlic bread')",
  "location": "city or location mentioned, or empty string",
  "mood_tone": "visual mood that matches the content tone (e.g. vibrant and appetizing, professional and clean, warm and inviting)",
  "key_visual_elements": "specific visual elements that should appear in the image based on the content (e.g. 'cheesy pizza slice, pizza box, delivery bag')",
  "color_scheme": "suggested colors based on brand/industry context if mentioned, otherwise infer appropriate colors"
}}

Return ONLY valid JSON, nothing else.
"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": extraction_prompt}],
                temperature=0.3,
                max_tokens=400,
                response_format={"type": "json_object"},
            )

            raw = response.choices[0].message.content or "{}"
            # Clean any markdown fences
            raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            extracted = json.loads(raw)

            logger.info(f"Brand details extracted: {json.dumps(extracted, ensure_ascii=False)[:200]}")

            return {
                "business_name": extracted.get("business_name", ""),
                "industry": extracted.get("industry", ""),
                "key_products": extracted.get("key_products", ""),
                "location": extracted.get("location", ""),
                "mood_tone": extracted.get("mood_tone", "professional and appealing"),
                "key_visual_elements": extracted.get("key_visual_elements", ""),
                "color_scheme": extracted.get("color_scheme", "natural, appealing colors"),
            }

        except (json.JSONDecodeError, Exception) as e:
            logger.warning(f"Brand extraction failed ({e}), using raw content fallback")
            return {
                "business_name": "",
                "industry": "",
                "key_products": "",
                "location": "",
                "mood_tone": "professional and appealing",
                "key_visual_elements": "",
                "color_scheme": "natural, appealing colors",
            }

    # ──────────────────────────────────────────────────────────
    # STEP 2: Build a precise image prompt from extracted details
    # ──────────────────────────────────────────────────────────

    def build_image_prompt(self, brand_details: dict, image_type: str) -> str:
        """Builds a precise image generation prompt using extracted
        brand details instead of raw pasted content.
        """
        business_name = brand_details.get("business_name", "")
        industry = brand_details.get("industry", "")
        products = brand_details.get("key_products", "")
        location = brand_details.get("location", "")
        mood = brand_details.get("mood_tone", "professional and appealing")
        visual_elements = brand_details.get("key_visual_elements", "")
        colors = brand_details.get("color_scheme", "natural, appealing colors")

        if image_type == "social_media":
            format_instruction = (
                "square format social media post image, eye-catching and "
                "shareable, modern social media aesthetic"
            )
        else:
            format_instruction = (
                "clean professional thumbnail image, bold focal point, "
                "high contrast, blog cover style"
            )

        prompt_parts = [
            f"A high-quality, realistic commercial photograph for {format_instruction}.",
        ]

        if industry:
            prompt_parts.append(f"Subject: {industry}.")

        if products:
            prompt_parts.append(f"Show specifically: {products}.")

        if visual_elements:
            prompt_parts.append(f"Include these visual elements: {visual_elements}.")

        if location:
            prompt_parts.append(f"Setting reflects {location}, Pakistan market context.")

        prompt_parts.append(f"Mood and style: {mood}.")
        prompt_parts.append(f"Color palette: {colors}.")
        prompt_parts.append(
            "Professional commercial photography, sharp focus, "
            "natural lighting, no text overlay, no logos, no "
            "watermarks, photorealistic."
        )

        if business_name:
            prompt_parts.append(
                f"This represents the brand '{business_name}' visually "
                f"through product/service presentation, not through "
                f"text or logo."
            )

        return " ".join(prompt_parts)

    # ──────────────────────────────────────────────────────────
    # STEP 3: Generate image (two-step pipeline)
    # ──────────────────────────────────────────────────────────

    async def generate_image(self, content: str, image_type: str) -> dict:
        """Generate an image using the two-step pipeline:

        1. GPT extracts structured brand/product details from content
        2. Build a precise prompt from those details
        3. Generate the image using GPT Image 2 (gpt-image-2)

        Returns a dict with image_id, image_url, image_type,
        prompt_used, brand_details_extracted, generated_at.
        Falls back to SVG placeholder if the API fails.
        """
        try:
            # ─ Step 1: Extract brand details ─
            brand_details = self.extract_brand_details(content)

            # ─ Step 2: Build precise prompt ─
            prompt = self.build_image_prompt(brand_details, image_type)

            logger.info(
                f"Image generation: model={settings.IMAGE_MODEL}, "
                f"type={image_type}, content_length={len(content)}, "
                f"industry={brand_details.get('industry', 'unknown')}"
            )

            # ─ Step 3: Generate image ─
            response = self.client.images.generate(
                model=settings.IMAGE_MODEL,
                prompt=prompt,
                size=settings.IMAGE_SIZE,
                quality=settings.IMAGE_QUALITY,
                n=1,
            )

            image_id = str(uuid.uuid4())

            # gpt-image-2 can return either url or b64_json
            image_url = getattr(response.data[0], "url", None)
            b64_json = getattr(response.data[0], "b64_json", None)

            if image_url:
                image_url_final = image_url
                logger.info(f"Image generated via URL: {image_id}")
            elif b64_json:
                # Save base64 image locally
                from_path = os.path.join(os.path.dirname(__file__), "..")
                images_dir = os.path.join(from_path, "generated_images")
                os.makedirs(images_dir, exist_ok=True)

                filename = f"{image_id}.png"
                filepath = os.path.join(images_dir, filename)

                img_data = base64.b64decode(b64_json)
                with open(filepath, "wb") as f:
                    f.write(img_data)

                image_url_final = f"/generated_images/{filename}"
                logger.info(f"Image saved from base64: {filename} ({len(img_data)} bytes)")
            else:
                logger.warning("No image data returned from API")
                return self._fallback_svg(content, image_type, "no_data")

            return {
                "image_id": image_id,
                "image_url": image_url_final,
                "image_type": image_type,
                "prompt_used": prompt,
                "brand_details_extracted": brand_details,
                "generated_at": datetime.now(timezone.utc),
            }

        except RateLimitError:
            logger.warning("Rate limit reached")
            return self._fallback_svg(content, image_type, "rate_limit")

        except APIError as e:
            logger.error(f"API error: {e}")
            return self._fallback_svg(content, image_type, "api_error")

        except Exception as e:
            logger.error(f"Image generation failed: {e}")
            return self._fallback_svg(content, image_type, "unknown")

    # ──────────────────────────────────────────────────────────
    # Fallback: SVG placeholder
    # ──────────────────────────────────────────────────────────

    def _fallback_svg(self, content: str, image_type: str, reason: str) -> dict:
        """Generate SVG placeholder when image generation is unavailable."""
        from_path = os.path.join(os.path.dirname(__file__), "..")
        images_dir = os.path.join(from_path, "generated_images")
        os.makedirs(images_dir, exist_ok=True)

        display_text = (
            content[:200]
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
        )
        if len(content) > 200:
            display_text += "..."

        words = display_text.split()
        lines = []
        current_line = ""
        for word in words:
            test_line = f"{current_line} {word}".strip()
            if len(test_line) * 7 > 380:
                lines.append(current_line)
                current_line = word
            else:
                current_line = test_line
        lines.append(current_line)
        if not lines:
            lines = ["No content"]

        svg_lines = ""
        y_start = 80
        for i, line in enumerate(lines):
            svg_lines += (
                f'<text x="256" y="{y_start + i * 28}" '
                f'font-family="Arial, sans-serif" font-size="18" '
                f'fill="#333" text-anchor="middle">{line}</text>'
            )

        image_id = str(uuid.uuid4())
        filename = f"{image_id}.svg"
        filepath = os.path.join(images_dir, filename)

        reasons: dict = {
            "rate_limit": "Rate limit — fallback",
            "api_error": "API error — fallback",
            "no_data": "No data — fallback",
        }
        warning = reasons.get(reason, "Unavailable — fallback")
        warning_text = (
            f'<text x="256" y="460" font-family="Arial, sans-serif" '
            f'font-size="10" fill="#ef4444" text-anchor="middle">{warning}</text>'
        )

        svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0c4d2f;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#16a34a;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="card" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.95" />
      <stop offset="100%" style="stop-color:#f0fdf4;stop-opacity:0.95" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)" rx="20"/>
  <rect x="30" y="30" width="452" height="452" fill="url(#card)" rx="16"/>
  <text x="256" y="65" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#0c4d2f" text-anchor="middle">{"Social Media Post" if image_type == "social_media" else "Thumbnail"}</text>
  <line x1="80" y1="85" x2="432" y2="85" stroke="#e5e7eb" stroke-width="1"/>
  {svg_lines}
  {warning_text}
  <text x="256" y="490" font-family="Arial, sans-serif" font-size="12" fill="#9ca3af" text-anchor="middle">Generated by PakVoice AI</text>
</svg>'''

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(svg)

        return {
            "image_id": image_id,
            "image_url": f"/generated_images/{filename}",
            "image_type": image_type,
            "prompt_used": self.build_image_prompt(
                {"mood_tone": "professional", "color_scheme": "green, gold"},
                image_type,
            ),
            "brand_details_extracted": {},
            "generated_at": datetime.now(timezone.utc),
        }


image_service = ImageService()
