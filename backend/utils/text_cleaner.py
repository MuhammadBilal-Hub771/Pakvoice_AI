import re
from typing import List


def clean_text(text: str) -> str:
    if not text:
        return ""

    # Replace multiple newlines with double newline
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Replace multiple spaces with single space
    text = re.sub(r" {2,}", " ", text)

    # Remove carriage returns
    text = text.replace("\r", "")

    # Remove null bytes
    text = text.replace("\x00", "")

    # Remove weird unicode control characters (keep newlines and tabs)
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)

    # Normalize Unicode (NFKC normalization)
    import unicodedata
    text = unicodedata.normalize("NFKC", text)

    return text.strip()


def chunk_text(
    text: str,
    chunk_size: int = 500,
    chunk_overlap: int = 50,
) -> List[str]:
    if not text:
        return []

    # Clean text first
    text = clean_text(text)

    # Split into paragraphs first
    paragraphs = text.split("\n\n")
    paragraphs = [p.strip() for p in paragraphs if p.strip()]

    chunks = []
    current_chunk = ""
    current_words = 0

    for paragraph in paragraphs:
        words = paragraph.split()
        word_count = len(words)

        # If single paragraph exceeds chunk size, split it
        if word_count > chunk_size:
            if current_chunk:
                chunks.append(current_chunk.strip())
                current_chunk = ""
                current_words = 0

            for i in range(0, word_count, chunk_size - chunk_overlap):
                sub_chunk = " ".join(words[i : i + chunk_size])
                if sub_chunk:
                    chunks.append(sub_chunk)
            continue

        # If adding this paragraph would exceed chunk size, start new chunk
        if current_words + word_count > chunk_size:
            chunks.append(current_chunk.strip())
            # Start new chunk with overlap from end of previous
            overlap_words = current_chunk.split()[-chunk_overlap:] if current_chunk else []
            current_chunk = " ".join(overlap_words + words)
            current_words = len(current_chunk.split())
        else:
            if current_chunk:
                current_chunk += "\n\n" + paragraph
            else:
                current_chunk = paragraph
            current_words += word_count

    if current_chunk:
        chunks.append(current_chunk.strip())

    return chunks


def extract_keywords(text: str, max_keywords: int = 10) -> List[str]:
    words = re.findall(r"\b[a-zA-Z]{3,}\b", text.lower())
    stop_words = {
        "the", "and", "for", "are", "but", "not", "you", "all", "can",
        "had", "her", "was", "one", "our", "out", "has", "its", "his",
        "that", "this", "with", "from", "they", "been", "have", "will",
        "would", "could", "should", "about", "into", "over", "also",
    }
    keywords = [w for w in words if w not in stop_words]
    seen = set()
    unique_keywords = []
    for kw in keywords:
        if kw not in seen:
            seen.add(kw)
            unique_keywords.append(kw)
    return unique_keywords[:max_keywords]
