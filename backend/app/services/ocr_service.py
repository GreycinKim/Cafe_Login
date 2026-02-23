import os
import json
import base64
import uuid

_openai_client = None
_pinecone_available = True

try:
    from pinecone import Pinecone
except ImportError:
    _pinecone_available = False


def _get_openai():
    global _openai_client
    if _openai_client is None:
        from openai import OpenAI
        _openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _openai_client


def encode_image(image_path):
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def run_ocr(image_path):
    """Send image to GPT-4o for structured receipt extraction."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {
            "merchant_name": None,
            "transaction_date": None,
            "total_amount": None,
            "category_suggestion": "expense",
            "error": "OPENAI_API_KEY not configured",
        }

    client = _get_openai()
    b64 = encode_image(image_path)
    ext = os.path.splitext(image_path)[1].lower().lstrip(".")
    mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}.get(ext, "image/jpeg")

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "Extract the following from this receipt image and return ONLY valid JSON:\n"
                            "{\n"
                            '  "merchant_name": "string",\n'
                            '  "transaction_date": "YYYY-MM-DD",\n'
                            '  "total_amount": number,\n'
                            '  "subtotal": number or null,\n'
                            '  "tax": number or null,\n'
                            '  "items": [{"name": "string", "quantity": number, "price": number}],\n'
                            '  "payment_method": "string or null",\n'
                            '  "category_suggestion": "string"\n'
                            "}\n"
                            "If a field is unreadable, set it to null."
                        ),
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime};base64,{b64}"},
                    },
                ],
            }
        ],
        max_tokens=1000,
    )

    raw_text = response.choices[0].message.content.strip()
    if raw_text.startswith("```"):
        raw_text = raw_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

    return json.loads(raw_text)


def create_embedding(text):
    """Create a vector embedding for semantic search."""
    client = _get_openai()
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding


def upsert_to_pinecone(receipt_id, text_for_embedding, metadata):
    """Store receipt embedding in Pinecone for semantic search."""
    api_key = os.getenv("PINECONE_API_KEY")
    index_name = os.getenv("PINECONE_INDEX_NAME", "receipts")

    if not api_key or not _pinecone_available:
        return None

    pc = Pinecone(api_key=api_key)
    index = pc.Index(index_name)

    vector = create_embedding(text_for_embedding)
    pinecone_id = f"receipt-{receipt_id}-{uuid.uuid4().hex[:8]}"

    index.upsert(vectors=[{"id": pinecone_id, "values": vector, "metadata": metadata}])
    return pinecone_id


def search_receipts(query, top_k=10):
    """Semantic search for receipts via Pinecone."""
    api_key = os.getenv("PINECONE_API_KEY")
    index_name = os.getenv("PINECONE_INDEX_NAME", "receipts")

    if not api_key or not _pinecone_available:
        return []

    pc = Pinecone(api_key=api_key)
    index = pc.Index(index_name)

    vector = create_embedding(query)
    results = index.query(vector=vector, top_k=top_k, include_metadata=True)
    return [
        {"id": m.id, "score": m.score, "metadata": m.metadata}
        for m in results.matches
    ]
