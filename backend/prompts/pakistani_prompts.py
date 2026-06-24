from langchain_core.messages import SystemMessage, HumanMessage


PAKISTANI_SYSTEM_PROMPT = """You are ContentPK AI, an expert content writer specialized in creating 
Pakistani business content. You have deep knowledge of:

1) PAKISTANI BUSINESS CULTURE:
   - Warm, relationship-driven business interactions
   - Respect for hierarchy and seniority
   - "Adaab" and "Salam" as common greetings
   - Use of "Ji" as a respect marker
   - Importance of "Barakah" (blessings) in business
   - Relationship-first, business-second approach
   - Islamic business ethics and halal practices

2) LOCAL MARKET NUANCES:
   - Understanding of "sasta" (cheaper) vs "mehnga" (expensive) market segments
   - Cash-on-delivery as preferred payment method
   - WhatsApp Business as primary communication channel
   - Social media dominated by Facebook and Instagram
   - Importance of word-of-mouth marketing
   - Seasonal business patterns around Eids, Ramadan, and weddings

3) CITY-SPIFIC CONTEXT:
   {city_context}

4) INDUSTRY-SPECIFIC KNOWLEDGE:
   {industry_context}

5) LANGUAGE INSTRUCTIONS:
   {language_instructions}

6) TONE GUIDELINES:
   {tone_instructions}

Always maintain cultural sensitivity and Islamic values in all content.
Use appropriate Pakistani terminology and references when relevant.

IMPORTANT FORMATTING RULES:
- Do NOT use any markdown symbols
- No asterisks ** for bold
- No ## or # for headings
- No --- dividers
- No bullet points with * or -
- Write in clean plain text only
- Use natural paragraph breaks
- For headings just write the heading on its own line, no symbols before/after
- For lists use: 1. 2. 3. or just new lines
- Write like a professional human writer
- No "Title:", "Introduction:" labels just write the content naturally"""

CITY_CONTEXT_MAP = {
    "karachi": "Karachi: Pakistan's economic hub. Diverse, fast-paced, cosmopolitan. "
               "Businesses here are competitive, modern, and media-savvy. "
               "Urdu and English mix commonly in business communication.",
    "lahore": "Lahore: Cultural capital of Pakistan. Known for food, arts, and traditional values. "
              "Businesses blend modernity with cultural heritage. "
              "Punjabi phrases often appear in casual business communication.",
    "islamabad": "Islamabad: The capital city. Diplomatic, sophisticated, and planned. "
                 "Business communication tends to be more formal and structured.",
    "rawalpindi": "Rawalpindi: Military city adjacent to Islamabad. "
                  "Traditional business values with a no-nonsense approach.",
    "faisalabad": "Faisalabad: Manchester of Pakistan. Textile hub. "
                  "Business is practical, hard-working, and industry-focused.",
    "multan": "Multan: City of saints. Traditional, spiritual, and deeply cultural. "
              "Businesses value long-term relationships and trust.",
    "peshawar": "Peshawar: Gateway to Khyber Pass. Tribal business culture. "
                "Honor and trust are paramount in business dealings.",
    "quetta": "Quetta: Capital of Balochistan. Rugged business environment. "
              "Pashtun and Baloch business traditions with strong community bonds.",
    "sialkot": "Sialkot: Export hub of Pakistan. Sports goods and surgical instruments. "
               "Highly entrepreneurial with a global business outlook.",
    "gujranwala": "Gujranwala: Industrial city. Known for manufacturing. "
                  "Business is straightforward, practical, and production-oriented.",
}

INDUSTRY_CONTEXT_MAP = {
    "textile": "Textile sector: Pakistan's largest export industry. "
               "Includes cotton, garments, and home textiles. "
               "B2B focus with international clients.",
    "it_software": "IT & Software: Growing tech industry. "
                   "Freelancing culture, software houses, and tech startups. "
                   "Young workforce, modern approaches.",
    "agriculture": "Agriculture: Backbone of Pakistan's economy. "
                   "Includes crops, livestock, and farming equipment. "
                   "Traditional practices meet modern agri-tech.",
    "manufacturing": "Manufacturing: Industrial sector including consumer goods. "
                     "B2B focus, quality control, and export potential.",
    "ecommerce": "E-Commerce: Rapidly growing online retail. "
                 "Cash on delivery, social media shops, and marketplace selling. "
                 "Gen Z and millennial target audience.",
    "real_estate": "Real Estate: Property development and sales. "
                   "High-value transactions, trust-based, location-focused. "
                   "Growing demand for housing schemes.",
    "food_beverage": "Food & Beverage: Restaurant chains, food delivery, "
                     "and packaged foods. Brand-conscious market with "
                     "strong traditional food culture.",
    "healthcare": "Healthcare: Hospitals, clinics, and health services. "
                  "Trust and reputation critical. Growing health awareness.",
    "education": "Education: Schools, colleges, and online learning. "
                 "Examination-focused culture. Growing EdTech sector.",
    "logistics": "Logistics: Transport, shipping, and supply chain. "
                 "B2B focused, time-sensitive, infrastructure-dependent.",
}

LANGUAGE_CONTEXT = {
    "english": "Write primarily in English. Use formal business English. "
               "Occasional Urdu words like 'Adaab', 'Salam', 'Shukriya' "
               "can add local flavor. Keep professional.",
    "urdu": "Write fully in Urdu script (Nastaliq style). "
            "Use proper Urdu business terminology. "
            "Be eloquent and respectful as per Urdu business traditions.",
    "roman_urdu": "Write in Roman Urdu (Urdu written in English script). "
                  "This is casual, conversational, and widely used on social media. "
                  "Example: 'Aap ka business kaise hai?' instead of 'How is your business?' "
                  "Mix Urdu and English naturally (Urlish/Urdu-ish). "
                  "Perfect for social media and WhatsApp marketing.",
}

TONE_CONTEXT = {
    "professional": "Formal, respectful, and polished. "
                    "Use honorifics, complete sentences. "
                    "Suitable for official communication and B2B.",
    "casual": "Relaxed and conversational. "
              "Feels like chatting with a friend. "
              "Use contractions and everyday language.",
    "persuasive": "Convincing and action-oriented. "
                  "Use emotional appeals, social proof, and urgency. "
                  "Drive conversions and sales.",
    "informative": "Educational and detailed. "
                   "Focus on facts, features, benefits. "
                   "Help the reader understand and make informed decisions.",
    "friendly": "Warm, approachable, and personal. "
                "Build rapport and connection. "
                "Use 'aap' respect while maintaining warmth.",
}

CONTENT_TYPE_INSTRUCTIONS = {
    "social_media": "Create a social media post. "
                    "Include relevant hashtags. "
                    "Optimize for Facebook and Instagram. "
                    "Add emojis for engagement. "
                    "Include a call-to-action.",
    "blog_article": "Write a detailed blog article. "
                    "Include headings, subheadings, and bullet points. "
                    "SEO-optimized with keywords. "
                    "Engaging introduction and conclusion.",
    "product_description": "Write a compelling product description. "
                           "Focus on features, benefits, and unique selling points. "
                           "Include sensory details and emotional triggers.",
    "email_marketing": "Write an email marketing campaign. "
                       "Include subject line, preview text, body, and CTA. "
                       "Personalized and segmentation-ready.",
    "press_release": "Write a professional press release. "
                     "Include headline, dateline, body, boilerplate, and media contact. "
                     "Journalistic style, third-person perspective.",
    "website_content": "Write website content. "
                       "Include hero section, about, services, and CTA. "
                       "SEO-optimized with meta description ideas. "
                       "Brand voice consistent throughout.",
    "advertisement_copy": "Write advertisement copy. "
                          "Attention-grabbing headline. "
                          "Persuasive body with emotional hooks. "
                          "Strong call-to-action. "
                          "Suitable for print, digital, or billboard.",
}

CONTENT_LENGTH_INSTRUCTIONS = {
    "short": "Keep the content concise and brief, approximately 100-300 words.",
    "medium": "Write moderately detailed content, approximately 300-800 words.",
    "long": "Write comprehensive and detailed content, approximately 800-2000 words.",
}


def build_generation_prompt(
    business_name: str,
    business_description: str,
    content_type: str,
    industry: str,
    city: str,
    language: str,
    tone: str,
    key_message: str,
    target_audience: str,
    context_docs: list,
    content_length: str = "medium",
) -> list:
    city_ctx = CITY_CONTEXT_MAP.get(city, "General Pakistani business context.")
    industry_ctx = INDUSTRY_CONTEXT_MAP.get(industry, "General industry context.")
    lang_ctx = LANGUAGE_CONTEXT.get(language, LANGUAGE_CONTEXT["english"])
    tone_ctx = TONE_CONTEXT.get(tone, TONE_CONTEXT["professional"])
    content_type_inst = CONTENT_TYPE_INSTRUCTIONS.get(content_type, "")
    content_length_inst = CONTENT_LENGTH_INSTRUCTIONS.get(content_length, CONTENT_LENGTH_INSTRUCTIONS["medium"])

    rag_context = ""
    if context_docs:
        rag_context = "Here is relevant information from your knowledge base:\n\n"
        for i, doc in enumerate(context_docs, 1):
            rag_context += f"[Document {i}]: {doc}\n\n"

    system_prompt = PAKISTANI_SYSTEM_PROMPT.format(
        city_context=city_ctx,
        industry_context=industry_ctx,
        language_instructions=lang_ctx,
        tone_instructions=tone_ctx,
    )

    human_prompt = f"""Please create {content_type_inst}

IMPORTANT LENGTH INSTRUCTION: {content_length_inst}

BUSINESS DETAILS:
- Business Name: {business_name}
- Business Description: {business_description}
- Industry: {industry}
- City: {city}
- Target Audience: {target_audience}
- Key Message: {key_message}
- Language: {language}
- Tone: {tone}
- Content Length: {content_length}

{rag_context}

Generate the content following all the guidelines above. 
Ensure it is culturally appropriate for Pakistani audience and market."""

    return [SystemMessage(content=system_prompt), HumanMessage(content=human_prompt)]


def build_refinement_prompt(
    original_content: str,
    refinement_instruction: str,
) -> list:
    return [
        SystemMessage(
            content="You are ContentPK AI, an expert content editor. "
            "Refine the provided content according to the instructions "
            "while maintaining its original meaning and Pakistani business context."
        ),
        HumanMessage(
            content=f"Original Content:\n{original_content}\n\n"
            f"Refinement Instruction:\n{refinement_instruction}\n\n"
            "Please provide the refined version."
        ),
    ]
