# Aimly ML Relevance Engine

> **Course Viva Reference**: This document explains the machine learning pipeline powering Aimly's semantic intent verification in plain language for academic presentation and viva examination.

---

## 1. Motivation: Why Semantic Intent Instead of Blocklists?
Traditional website blockers rely on static blocklists (e.g., blocking `youtube.com` or `reddit.com`). However:
- A student studying machine learning might legitimately need YouTube for a 3Blue1Brown calculus video or Reddit for an r/MachineLearning discussion.
- Conversely, a student might waste time browsing off-topic documentation or lifestyle blogs that aren't on any blocklist.

Aimly replaces blunt domain blocking with **real-time semantic intent verification**:
1. The user defines a one-line goal (e.g., *"Study Graph Traversal Algorithms for DSA"*).
2. During the session, the Chrome extension observes the title, description, and readable path of active tabs.
3. The ML service evaluates whether the tab is *semantically relevant* to the stated goal.

---

## 2. Technical Architecture
The ML service is a lightweight Python microservice built with **FastAPI**:
- **Port**: `8001`
- **Endpoints**:
  - `GET /health`: Health check and model readiness indicator.
  - `POST /score`: Accepts `{ goal: string, text: string }` and returns `{ score: float }` between 0.0 and 1.0.

### Model Choice: `all-MiniLM-L6-v2`
- **Architecture**: 6-layer MiniLM transformer developed by Microsoft and fine-tuned by Hugging Face / Sentence-Transformers.
- **Embedding Dimension**: 384 dimensions.
- **Speed & Footprint**: ~80MB on disk, encodes sentences in ~10–20 milliseconds on CPU without requiring an expensive GPU.
- **Cold-Start Optimization**: The model is loaded **once at startup** into memory (`lifespan` handler) so individual request latencies are sub-30ms.

---

## 3. Mathematical Principle: Cosine Similarity
1. The model converts the goal string into vector $\vec{G} \in \mathbb{R}^{384}$.
2. It converts the page text into vector $\vec{P} \in \mathbb{R}^{384}$.
3. It computes the **cosine similarity**:
   $$\text{similarity}(\vec{G}, \vec{P}) = \frac{\vec{G} \cdot \vec{P}}{\|\vec{G}\| \|\vec{P}\|}$$
4. Because the vectors are unit-normalized, this simplifies to the dot product of the two vectors, yielding a similarity metric in $[0, 1]$ (clamped to positive values for intent ranking).

### Example Scoring:
- Goal: *"Study Graph Traversal Algorithms for DSA"*
- Page: *"Breadth-First Search (BFS) Implementation in Python - GeeksforGeeks"*
  - Score: **~0.68 - 0.78** (Strongly on-topic -> **No Drift**)
- Page: *"Top 10 Stand-up Comedy Specials on Netflix"*
  - Score: **~0.04 - 0.12** (Off-topic -> **Drift Warning Triggered**)

---

## 4. Multi-Tier Decision Pipeline in Express
The ML score is returned to the Express backend (`backend/services/relevance.js`), which applies a robust multi-tier pipeline:
1. **Bypass Checks**: Returns `is_drift: false` if session is paused or tracking is disabled.
2. **User Whitelist**: If the domain is in the user's `allowed_domains`, returns `method: "allowed"` immediately.
3. **ML Scoring**: Calls `POST /score` on the FastAPI service.
4. **Domain Priors**:
   - Academic/tech domains (`leetcode.com`, `geeksforgeeks.org`, `github.com`, `stackoverflow.com`, `wikipedia.org`) receive a gentle calibration boost if the goal contains technical keywords.
   - Entertainment domains (`youtube.com`, `instagram.com`, `reddit.com`) rely purely on page-level content semantics.
5. **Sensitivity Calibration**:
   - `low`: Threshold = 0.20
   - `medium`: Threshold = 0.30
   - `high`: Threshold = 0.40
   A page is flagged as drift if $\text{Score} < \text{Threshold}$.
6. **Adaptive Personalization**:
   - If a user marks 3 pages from a domain as "relevant", that domain is auto-added to `allowed_domains`.
   - If >30% of recent drift flags were overridden by the user, the effective threshold is reduced by 0.05.
7. **Fail-Safe Fallback**:
   - If the ML service is offline or takes >2000ms, the system falls back to an intelligent keyword heuristic so student demonstrations never crash.

---

## 5. Running the Service
```bash
# Run standalone
uvicorn main:app --host 127.0.0.1 --port 8001
```
