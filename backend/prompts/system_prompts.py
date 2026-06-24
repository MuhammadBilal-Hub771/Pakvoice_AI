from langchain_core.prompts import ChatPromptTemplate


RAG_QUERY_SYSTEM_PROMPT = """You are a query analyzer for a Pakistani business knowledge base.
Your job is to reformulate the user's content generation request into an effective
search query for retrieving relevant documents.

The search query should:
1. Extract key business terms and industry-specific keywords
2. Include the city or region if mentioned
3. Focus on the content type requested
4. Be concise (10-20 words)

Return ONLY the search query, no explanations."""


RAG_QUERY_HUMAN_TEMPLATE = """Business: {business_name}
Industry: {industry}
City: {city}
Content Type: {content_type}
Description: {business_description}

Generate search query:"""


def build_rag_query_prompt() -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages(
        [
            ("system", RAG_QUERY_SYSTEM_PROMPT),
            ("human", RAG_QUERY_HUMAN_TEMPLATE),
        ]
    )


CONTENT_QUALITY_SYSTEM_PROMPT = """You are a content quality analyzer for Pakistani business content.
Review the generated content and provide a quality assessment.

Rate the following aspects from 0-10:
1. Cultural Relevance: How well does it fit Pakistani culture?
2. Language Quality: Grammar, spelling, and appropriate language use
3. Engagement: How likely is it to engage the target audience?
4. Clarity: How clear and understandable is the message?
5. Actionability: Does it have a clear call-to-action or purpose?

Provide a brief explanation for each rating."""


def build_quality_check_prompt(
    content: str,
    request: dict,
) -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages(
        [
            ("system", CONTENT_QUALITY_SYSTEM_PROMPT),
            ("human",
                "Content:\n{content}\n\n"
                "Request Details:\n"
                "- Business: {business_name}\n"
                "- Industry: {industry}\n"
                "- City: {city}\n"
                "- Content Type: {content_type}\n"
                "- Language: {language}\n"
                "- Tone: {tone}\n\n"
                "Provide quality assessment:"
            ),
        ]
    )
