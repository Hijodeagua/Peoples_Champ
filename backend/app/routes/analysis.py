import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models

router = APIRouter()

# Request model for generating analysis
class AnalysisRequest(BaseModel):
    rankings: list[dict] # Simplified; we'll pass a summary of the data
    
# Request model for feedback
class FeedbackRequest(BaseModel):
    analysis_text: string
    rating: int

class FeedbackCreate(BaseModel):
    analysis_text: str
    rating: int

@router.post("/generate")
async def generate_analysis(request: AnalysisRequest):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {
            "analysis": "OpenAI API Key not found. Unable to generate AI analysis. (Mock Analysis: The model shows significant divergence from consensus on several defensive specialists...)"
        }

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)

        # Prepare the prompt
        # We'll extract the most interesting data points:
        # 1. Biggest disagreements (positive and negative)
        # 2. General trends
        
        rankings = request.rankings
        
        # Identify outliers
        # Sort by difference (assuming difference is in the dict)
        # We expect the frontend to pass pre-processed or raw ranking objects.
        # Let's assume the frontend sends a simplified list of top 10 divergences or just the whole list (limit to top 20 for context window?)
        
        # Constructing a prompt text
        # "rankings" is expected to be a list of objects with { name, rank, ringerRank, diff, stats: {...} }
        
        prompt = """
        You are a basketball analyst. Analyze the following data comparing "Peoples Champ" model rankings vs "The Ringer" rankings for the 2025-26 NBA season.
        The "Peoples Champ" model heavily weights advanced stats like BPM, VORP, and WS/48.
        
        Identify:
        1. Players we rate significantly higher than the consensus (Underrated by consensus). Look at their advanced stats to explain why.
        2. Players we rate significantly lower (Overrated by consensus).
        3. Any systematic bias (e.g. do we overvalue big men?).
        
        Keep the analysis concise, fun, and insightful. Max 3 paragraphs.
        
        Data (Sample of notable differences):
        """
        
        for p in rankings[:15]: # process first 15 passed (assuming sorted by interest or just top players)
             prompt += f"\n- {p['name']}: Our Rank #{p['rank']}, Ringer #{p['ringerRank']} (Diff: {p['diff']}). Stats: {p.get('stats_summary', 'N/A')}"

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a sharp, analytical basketball expert."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=400
        )
        
        analysis = response.choices[0].message.content
        return {"analysis": analysis}

    except Exception as e:
        print(f"Error generating analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/feedback")
def save_feedback(feedback: FeedbackCreate, db: Session = Depends(get_db)):
    db_feedback = models.AnalysisFeedback(
        analysis_text=feedback.analysis_text,
        rating=feedback.rating
    )
    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)
    return {"status": "success", "id": db_feedback.id}
