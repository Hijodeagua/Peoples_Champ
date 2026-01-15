"""
AI Analysis endpoints with support for both OpenAI and Claude.
Includes caching to reduce API costs.
"""
import os
import hashlib
import json
from datetime import datetime, timedelta
from typing import Optional, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db.session import get_db
from .. import models

router = APIRouter()


# ============ Request/Response Models ============

class AnalysisRequest(BaseModel):
    rankings: list[dict]
    comparison_type: Optional[str] = None  # 'h2h_vs_elo', 'h2h_vs_ringer', 'elo_vs_ringer'
    analysis_style: Optional[Literal["concise", "detailed", "hot_take"]] = "concise"
    provider: Optional[Literal["auto", "openai", "claude"]] = "auto"


class AnalysisResponse(BaseModel):
    analysis: str
    provider: str
    cached: bool = False


class FeedbackCreate(BaseModel):
    analysis_text: str
    rating: int


# ============ Helper Functions ============

def get_cache_key(rankings: list[dict], comparison_type: str, style: str) -> str:
    """Generate a cache key from the analysis parameters."""
    # Create a deterministic string from rankings
    rankings_str = json.dumps(
        [{"name": r.get("name"), "rank": r.get("rank"), "diff": r.get("diff")}
         for r in rankings[:15]],
        sort_keys=True
    )
    key_str = f"{rankings_str}:{comparison_type}:{style}"
    return hashlib.sha256(key_str.encode()).hexdigest()[:32]


def get_cached_analysis(cache_key: str, provider: str, db: Session) -> Optional[str]:
    """Check for cached analysis."""
    cache = db.query(models.AnalysisCache).filter(
        models.AnalysisCache.cache_key == cache_key,
        models.AnalysisCache.provider == provider
    ).first()

    if cache:
        # Check if expired (24 hours)
        if cache.expires_at and cache.expires_at < datetime.utcnow():
            db.delete(cache)
            db.commit()
            return None
        return cache.analysis_text
    return None


def save_cached_analysis(cache_key: str, provider: str, analysis: str, db: Session):
    """Save analysis to cache."""
    cache = models.AnalysisCache(
        cache_key=cache_key,
        provider=provider,
        analysis_text=analysis,
        input_hash=cache_key,
        expires_at=datetime.utcnow() + timedelta(hours=24)
    )
    db.add(cache)
    try:
        db.commit()
    except Exception:
        db.rollback()


def build_prompt(rankings: list[dict], comparison_type: str, style: str) -> tuple[str, str]:
    """Build the analysis prompt based on style."""

    # Build context based on comparison type
    comparison_context = {
        "h2h_vs_elo": "comparing simulated Head-to-Head voting results against our internal ELO model",
        "h2h_vs_ringer": "comparing simulated Head-to-Head voting results against The Ringer's Top 100",
        "elo_vs_ringer": "comparing our internal ELO model against The Ringer's Top 100",
    }.get(comparison_type, "comparing different ranking methodologies")

    # Style-specific system prompts
    system_prompts = {
        "concise": "You are a concise basketball analyst for the People's Champ ranking system. Keep responses short and punchy. Maximum 4 bullet points, one sentence each. Focus on interesting insights about player valuations.",
        "detailed": "You are a thoughtful basketball analyst providing in-depth analysis of player rankings. Provide nuanced insights about why certain players are valued differently across ranking systems. Include context about playing styles, team situations, and statistical profiles.",
        "hot_take": "You are a bold, entertaining basketball analyst known for spicy takes. Be provocative but back it up with data. Challenge conventional wisdom. Make it fun and engaging while still being insightful."
    }

    # Style-specific formats
    formats = {
        "concise": """Respond ONLY in this exact format:

• Biggest overvaluation: [Player Name] - [One short reason]
• Biggest undervaluation: [Player Name] - [One short reason]
• Model bias: [One sentence about what type of players show disagreement]
• Key insight: [One sentence about what this reveals]

Keep each bullet to ONE sentence maximum.""",

        "detailed": """Provide a detailed analysis covering:

1. **Most Overvalued Player**: Who and why (2-3 sentences)
2. **Most Undervalued Player**: Who and why (2-3 sentences)
3. **Systematic Biases**: What types of players do different systems favor? (2-3 sentences)
4. **Surprising Agreements**: Where do the rankings align unexpectedly? (1-2 sentences)
5. **Key Takeaway**: What should fans understand from this comparison? (1-2 sentences)""",

        "hot_take": """Give us your hottest takes in this format:

🔥 **OVERRATED ALERT**: [Player] - [Spicy reason why they're overrated]
💎 **SLEEPING ON**: [Player] - [Why this player deserves more respect]
🤖 **THE TRUTH**: [One controversial insight about what the data reveals]
🎯 **BOLD PREDICTION**: [Based on this data, what should we expect?]

Be bold. Be entertaining. Back it up with the numbers."""
    }

    system_prompt = system_prompts.get(style, system_prompts["concise"])
    format_instructions = formats.get(style, formats["concise"])

    user_prompt = f"""Analyze this basketball ranking data {comparison_context}. {format_instructions}

Data (showing players with biggest ranking differences):
"""

    for p in rankings[:15]:
        h2h_rank = p.get('h2hRank', 'N/A')
        stats = p.get('stats_summary', 'N/A')
        user_prompt += f"\n- {p['name']}: ELO #{p.get('rank', 'N/A')}, Ringer #{p.get('ringerRank', 'N/A')}, H2H #{h2h_rank} (Diff: {p.get('diff', 'N/A')}). Stats: {stats}"

    return system_prompt, user_prompt


def generate_fallback_analysis(rankings: list[dict], style: str) -> str:
    """Generate a data-driven fallback when API is unavailable."""
    if not rankings:
        return "Unable to generate analysis - no data provided."

    sorted_by_diff = sorted(rankings, key=lambda x: x.get('diff', 0) or 0)
    undervalued = sorted_by_diff[:3] if sorted_by_diff else []
    overvalued = sorted_by_diff[-3:] if sorted_by_diff else []

    if style == "hot_take":
        return f"""🔥 **OVERRATED ALERT**: {overvalued[-1]['name'] if overvalued else 'Unknown'} - The hype machine is working overtime here!
💎 **SLEEPING ON**: {undervalued[0]['name'] if undervalued else 'Unknown'} - The numbers don't lie, this player is cooking!
🤖 **THE TRUTH**: Advanced metrics consistently favor efficient two-way players over volume scorers
🎯 **BOLD PREDICTION**: The undervalued players here will be ranked higher by next season"""

    elif style == "detailed":
        return f"""**Most Overvalued**: {', '.join([p['name'] for p in reversed(overvalued)])} - Consensus rankings favor these players more than our analytical model suggests they deserve. This could be due to reputation, market size, or narrative-driven evaluation.

**Most Undervalued**: {', '.join([p['name'] for p in undervalued])} - Our model ranks these players significantly higher than consensus. They may be flying under the radar due to team situation or lack of media coverage.

**Systematic Biases**: The People's Champ model tends to favor statistical efficiency and two-way impact over raw counting stats. Players who contribute quietly but effectively often rate higher.

**Key Takeaway**: The gap between analytics and expert opinion reveals interesting market inefficiencies that could inform fantasy decisions or trade evaluations."""

    else:  # concise
        return f"""• Most undervalued: {', '.join([p['name'] for p in undervalued])} - Our model ranks them higher than consensus
• Most overvalued: {', '.join([p['name'] for p in reversed(overvalued)])} - Consensus ranks them higher than our model
• Model bias: Advanced metrics favor efficient two-way players over high-usage scorers
• Key insight: The People's Champ simulation blends analytics with expert opinion for balanced rankings"""


async def generate_openai_analysis(system_prompt: str, user_prompt: str) -> str:
    """Generate analysis using OpenAI."""
    from openai import OpenAI

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY not configured")

    client = OpenAI(api_key=api_key)

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        max_tokens=500,
        temperature=0.4
    )

    return response.choices[0].message.content or ""


async def generate_claude_analysis(system_prompt: str, user_prompt: str) -> str:
    """Generate analysis using Claude."""
    import anthropic

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not configured")

    client = anthropic.Anthropic(api_key=api_key)

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        system=system_prompt,
        messages=[
            {"role": "user", "content": user_prompt}
        ]
    )

    return message.content[0].text if message.content else ""


# ============ API Endpoints ============

@router.post("/generate", response_model=AnalysisResponse)
async def generate_analysis(
    request: AnalysisRequest,
    db: Session = Depends(get_db)
):
    """
    Generate AI analysis of player rankings.

    Supports multiple providers (OpenAI, Claude) and analysis styles.
    Results are cached for 24 hours to reduce API costs.
    """
    print(f"Analysis request: {len(request.rankings)} rankings, type={request.comparison_type}, style={request.analysis_style}, provider={request.provider}")

    style = request.analysis_style or "concise"
    comparison_type = request.comparison_type or "general"
    requested_provider = request.provider or "auto"

    # Generate cache key
    cache_key = get_cache_key(request.rankings, comparison_type, style)

    # Determine which providers are available
    openai_available = bool(os.getenv("OPENAI_API_KEY"))
    claude_available = bool(os.getenv("ANTHROPIC_API_KEY"))

    # Determine provider to use
    if requested_provider == "auto":
        # Prefer Claude if available, fall back to OpenAI
        provider = "claude" if claude_available else ("openai" if openai_available else None)
    elif requested_provider == "claude":
        provider = "claude" if claude_available else None
    elif requested_provider == "openai":
        provider = "openai" if openai_available else None
    else:
        provider = None

    # Check cache first
    if provider:
        cached = get_cached_analysis(cache_key, provider, db)
        if cached:
            print(f"Returning cached analysis for provider={provider}")
            return AnalysisResponse(analysis=cached, provider=provider, cached=True)

    # No API key available - return fallback
    if not provider:
        print("No AI provider available, using fallback")
        fallback = generate_fallback_analysis(request.rankings, style)
        return AnalysisResponse(analysis=fallback, provider="fallback", cached=False)

    # Generate new analysis
    try:
        system_prompt, user_prompt = build_prompt(request.rankings, comparison_type, style)

        if provider == "claude":
            analysis = await generate_claude_analysis(system_prompt, user_prompt)
        else:
            analysis = await generate_openai_analysis(system_prompt, user_prompt)

        # Cache the result
        save_cached_analysis(cache_key, provider, analysis, db)

        print(f"Generated new analysis with {provider}, length={len(analysis)}")
        return AnalysisResponse(analysis=analysis, provider=provider, cached=False)

    except Exception as e:
        print(f"Error generating analysis with {provider}: {e}")

        # Try fallback provider
        fallback_provider = "openai" if provider == "claude" and openai_available else ("claude" if provider == "openai" and claude_available else None)

        if fallback_provider:
            try:
                print(f"Trying fallback provider: {fallback_provider}")
                if fallback_provider == "claude":
                    analysis = await generate_claude_analysis(system_prompt, user_prompt)
                else:
                    analysis = await generate_openai_analysis(system_prompt, user_prompt)

                save_cached_analysis(cache_key, fallback_provider, analysis, db)
                return AnalysisResponse(analysis=analysis, provider=fallback_provider, cached=False)
            except Exception as e2:
                print(f"Fallback provider also failed: {e2}")

        # All providers failed - return data-driven fallback
        fallback = generate_fallback_analysis(request.rankings, style)
        return AnalysisResponse(analysis=fallback, provider="fallback", cached=False)


@router.get("/styles")
async def get_analysis_styles():
    """Get available analysis styles and their descriptions."""
    return {
        "styles": [
            {
                "id": "concise",
                "name": "Quick Take",
                "description": "4 bullet points, straight to the point"
            },
            {
                "id": "detailed",
                "name": "Deep Dive",
                "description": "In-depth analysis with context"
            },
            {
                "id": "hot_take",
                "name": "Hot Takes",
                "description": "Bold, entertaining analysis"
            }
        ],
        "providers": {
            "openai": bool(os.getenv("OPENAI_API_KEY")),
            "claude": bool(os.getenv("ANTHROPIC_API_KEY"))
        }
    }


@router.post("/feedback")
def save_feedback(feedback: FeedbackCreate, db: Session = Depends(get_db)):
    """Save user feedback on generated analysis."""
    db_feedback = models.AnalysisFeedback(
        analysis_text=feedback.analysis_text,
        rating=feedback.rating
    )
    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)
    return {"status": "success", "id": db_feedback.id}


@router.delete("/cache")
async def clear_cache(db: Session = Depends(get_db)):
    """Clear all cached analyses (admin endpoint)."""
    deleted = db.query(models.AnalysisCache).delete()
    db.commit()
    return {"status": "success", "deleted": deleted}
