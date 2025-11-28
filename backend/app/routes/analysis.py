import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..db.session import get_db
from .. import models

router = APIRouter()

# Request model for generating analysis
class AnalysisRequest(BaseModel):
    rankings: list[dict] # Simplified; we'll pass a summary of the data
    
# Request model for feedback
class FeedbackCreate(BaseModel):
    analysis_text: str
    rating: int

@router.post("/generate")
async def generate_analysis(request: AnalysisRequest):
    api_key = os.getenv("OPENAI_API_KEY")
    print(f"API Key present: {bool(api_key)}")
    print(f"Number of rankings received: {len(request.rankings)}")
    
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
        print(f"Processing {len(rankings)} rankings for analysis")
        
        # Identify outliers
        # Sort by difference (assuming difference is in the dict)
        # We expect the frontend to pass pre-processed or raw ranking objects.
        # Let's assume the frontend sends a simplified list of top 10 divergences or just the whole list (limit to top 20 for context window?)
        
        # Constructing a prompt text
        # "rankings" is expected to be a list of objects with { name, rank, ringerRank, diff, stats: {...} }
        
        prompt = """
        Analyze this basketball ranking data. Respond ONLY in this exact format:

        • Biggest overvaluation: [Player Name] - [One short reason why we rank them higher]
        • Biggest undervaluation: [Player Name] - [One short reason why we rank them lower]  
        • Model bias: [What type of players our model favors in 1 sentence]
        • Key insight: [One sentence about analytics vs expert opinion]

        Keep each bullet to ONE sentence maximum. Be concise.
        
        Data:
        """
        
        for p in rankings[:15]: # process first 15 passed (assuming sorted by interest or just top players)
             prompt += f"\n- {p['name']}: Our Rank #{p['rank']}, Ringer #{p['ringerRank']} (Diff: {p['diff']}). Stats: {p.get('stats_summary', 'N/A')}"

        print(f"Prompt length: {len(prompt)} characters")
        print("Making OpenAI API call...")

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a concise basketball analyst. Follow the exact format requested. Keep responses short and punchy. Maximum 4 bullet points, one sentence each."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=200,
            temperature=0.3
        )
        
        analysis = response.choices[0].message.content
        print(f"Received analysis length: {len(analysis) if analysis else 0} characters")
        return {"analysis": analysis}

    except Exception as e:
        print(f"Error generating analysis: {e}")
        # Provide a short fallback analysis
        fallback_analysis = """
        • Biggest overvaluation: Player X - Strong advanced metrics but low traditional recognition
        • Biggest undervaluation: Player Y - High profile but concerning efficiency numbers  
        • Model bias: Our model favors statistical efficiency over reputation and narrative
        • Key insight: Analytics capture per-minute impact while experts weigh intangibles and leadership
        """
        return {"analysis": fallback_analysis}

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
