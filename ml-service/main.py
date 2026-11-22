import os
import sys
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("aimly-ml-service")

model = None
model_name = "all-MiniLM-L6-v2"

@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    logger.info(f"Loading embedding model '{model_name}' at startup...")
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer(model_name)
        logger.info("model ready")
    except Exception as e:
        logger.error(f"Failed to load sentence-transformers model: {e}")
        model = None
    yield
    logger.info("Shutting down ML service.")

app = FastAPI(
    title="Aimly ML Relevance Service",
    description="Microservice for real-time semantic similarity scoring between focus goals and web page content.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScoreRequest(BaseModel):
    goal: str
    text: str

class ScoreResponse(BaseModel):
    score: float
    model: str

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "model": model_name,
        "model_ready": model is not None,
    }

@app.post("/score", response_model=ScoreResponse)
def score_similarity(request: ScoreRequest):
    goal_text = request.goal.strip()
    page_text = request.text.strip()

    if not goal_text or not page_text:
        return ScoreResponse(score=0.0, model=model_name)

    global model
    if model is not None:
        try:
            # Generate embeddings
            embeddings = model.encode([goal_text, page_text], convert_to_numpy=True, normalize_embeddings=True)
            # Dot product of normalized vectors equals cosine similarity
            similarity = float(np.dot(embeddings[0], embeddings[1]))
            # Clamp between 0.0 and 1.0
            clamped_similarity = max(0.0, min(1.0, round(similarity, 4)))
            return ScoreResponse(score=clamped_similarity, model=model_name)
        except Exception as e:
            logger.error(f"Error computing model embeddings: {e}")

    # Fallback heuristic if model is not loaded yet or CPU resource issue
    from difflib import SequenceMatcher
    words_goal = set(goal_text.lower().split())
    words_page = set(page_text.lower().split())
    overlap = len(words_goal.intersection(words_page))
    fallback_score = min(1.0, overlap / max(1, len(words_goal)))
    return ScoreResponse(score=round(fallback_score, 4), model="keyword-fallback")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=False)



#run command
#cd ml-service
#python -u -m uvicorn main:app --host 127.0.0.1 --port 8001
