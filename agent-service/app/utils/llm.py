from langchain_google_genai import ChatGoogleGenerativeAI
from app.config import settings

def get_resilient_model(temperature: float = 0.1) -> ChatGoogleGenerativeAI:
    """Creates a ChatGoogleGenerativeAI instance with automatic fallback rotation across all available API keys."""
    keys = [k.strip() for k in settings.google_api_keys.split(",") if k.strip()]
    if not keys and settings.google_api_key and settings.google_api_key != "not-set":
        keys = [settings.google_api_key.strip()]
    if not keys:
        keys = ["not-set"]
    
    models = [
        ChatGoogleGenerativeAI(
            model=settings.gemini_model,
            google_api_key=key,
            temperature=temperature,
            max_retries=0, # Fail fast and fallback to the next key
        )
        for key in keys
    ]
    
    primary = models[0]
    if len(models) > 1:
        primary = primary.with_fallbacks(models[1:])
        
    return primary
