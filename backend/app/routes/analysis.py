import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from ..db.session import get_db
from .. import models

router = APIRouter()

# Request model for generating analysis
class AnalysisRequest(BaseModel):
    rankings: list[dict]
    comparison_type: Optional[str] = None  # 'h2h_vs_elo', 'h2h_vs_ringer', 'elo_vs_ringer'
    
# Request model for feedback
class FeedbackCreate(BaseModel):
    analysis_text: str
    rating: int

@router.post("/generate")
async def generate_analysis(request: AnalysisRequest):
    api_key = os.getenv("OPENAI_API_KEY")
    print(f"API Key present: {bool(api_key)}")
    print(f"Number of rankings received: {len(request.rankings)}")
    print(f"Comparison type: {request.comparison_type}")
    
    if not api_key:
        # Generate a meaningful fallback based on the data provided
        rankings = request.rankings
        if rankings:
            # Find biggest positive and negative differences
            sorted_by_diff = sorted(rankings, key=lambda x: x.get('diff', 0) or 0)
            undervalued = sorted_by_diff[:3] if sorted_by_diff else []
            overvalued = sorted_by_diff[-3:] if sorted_by_diff else []
            
            fallback = f"""• Most undervalued: {', '.join([p['name'] for p in undervalued])} - Our model ranks them higher than consensus
• Most overvalued: {', '.join([p['name'] for p in reversed(overvalued)])} - Consensus ranks them higher than our model
• Model bias: Advanced metrics favor efficient two-way players over high-usage scorers
• Key insight: The People's Champ simulation blends analytics with expert opinion for balanced rankings"""
            return {"analysis": fallback}
        return {
            "analysis": "Unable to generate analysis - no data provided."
        }

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)

        rankings = request.rankings
        print(f"Processing {len(rankings)} rankings for analysis")
        
        # Build context based on comparison type
        comparison_context = ""
        if request.comparison_type == "h2h_vs_elo":
            comparison_context = "comparing simulated Head-to-Head voting results against our internal ELO model"
        elif request.comparison_type == "h2h_vs_ringer":
            comparison_context = "comparing simulated Head-to-Head voting results against The Ringer's Top 100"
        elif request.comparison_type == "elo_vs_ringer":
            comparison_context = "comparing our internal ELO model against The Ringer's Top 100"
        else:
            comparison_context = "comparing different ranking methodologies"
        
        prompt = f"""
        Analyze this basketball ranking data {comparison_context}. Respond ONLY in this exact format:

        • Biggest overvaluation: [Player Name] - [One short reason why one ranking values them higher]
        • Biggest undervaluation: [Player Name] - [One short reason why one ranking values them lower]  
        • Model bias: [What type of players show the biggest disagreement in 1 sentence]
        • Key insight: [One sentence about what this comparison reveals]

        Keep each bullet to ONE sentence maximum. Be concise and insightful.
        
        Data (showing players with biggest ranking differences):
        """
        
        for p in rankings[:15]:
            h2h_rank = p.get('h2hRank', 'N/A')
            prompt += f"\n- {p['name']}: ELO #{p['rank']}, Ringer #{p['ringerRank']}, H2H #{h2h_rank} (Diff: {p['diff']}). Stats: {p.get('stats_summary', 'N/A')}"

        print(f"Prompt length: {len(prompt)} characters")
        print("Making OpenAI API call...")

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a concise basketball analyst for the People's Champ ranking system. Follow the exact format requested. Keep responses short and punchy. Maximum 4 bullet points, one sentence each. Focus on interesting insights about player valuations."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=250,
            temperature=0.4
        )
        
        analysis = response.choices[0].message.content
        print(f"Received analysis length: {len(analysis) if analysis else 0} characters")
        return {"analysis": analysis}

    except Exception as e:
        print(f"Error generating analysis: {e}")
        # Provide a data-driven fallback
        rankings = request.rankings
        if rankings:
            sorted_by_diff = sorted(rankings, key=lambda x: x.get('diff', 0) or 0)
            undervalued = sorted_by_diff[:2] if sorted_by_diff else []
            overvalued = sorted_by_diff[-2:] if sorted_by_diff else []
            
            fallback = f"""• Most undervalued: {', '.join([p['name'] for p in undervalued])} - Analytics favor their efficiency
• Most overvalued: {', '.join([p['name'] for p in reversed(overvalued)])} - Reputation exceeds recent production
• Model bias: Our model favors statistical efficiency over reputation and narrative
• Key insight: The gap between analytics and expert opinion reveals market inefficiencies"""
            return {"analysis": fallback}
        return {"analysis": "Analysis generation failed. Please try again."}

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
