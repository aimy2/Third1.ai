from langchain_groq import ChatGroq

from backend.third1_ai.services.config import settings


llm = ChatGroq(
    model="openai/gpt-oss-20b",
    api_key=settings.groq_api_key,
    temperature=0,
    max_tokens=4000,
)