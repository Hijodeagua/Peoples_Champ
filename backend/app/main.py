from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from .routes import auth, daily_set, game, players, analysis, voting, admin
from .db.session import engine
from .db.base import Base

app = FastAPI(title="Peoples Champ API")

# --- CORS setup so the React frontend can call the API ---
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "https://peoples-champ.vercel.app",
    "https://peoples-champ-frontend.onrender.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# --------------------------------------------------------------------------


@app.on_event("startup")
def create_tables():
    """Create database tables on startup"""
    Base.metadata.create_all(bind=engine)


@app.on_event("startup") 
def initialize_data():
    """Initialize database with players and schedule on first startup"""
    from .db.session import SessionLocal
    from .services.player_loader import load_players_from_csv
    from .services.batch_scheduler import BatchScheduler
    from .models import Player
    import os
    
    db = SessionLocal()
    try:
        # Check if players already exist
        try:
            player_count = db.query(Player).count()
            print(f"Found {player_count} players in database")
        except Exception as e:
            print(f"Error checking player count: {e}")
            db.rollback()
            player_count = 0
        
        if player_count == 0:
            print("No players found. Attempting to load from CSV...")
            
            # Get the directory where this file is located
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            
            # Try to find and load CSV using relative paths from backend directory
            possible_paths = [
                os.path.join(base_dir, "data", "Bbref_Adv_25-26.csv"),
                os.path.join(base_dir, "..", "data", "Bbref_Adv_25-26.csv"),
                os.path.join(base_dir, "..", "frontend", "public", "data", "Bbref_Adv_25-26.csv"),
                "data/Bbref_Adv_25-26.csv",
            ]
            
            csv_path = None
            for path in possible_paths:
                print(f"Checking path: {path}")
                if os.path.exists(path):
                    csv_path = path
                    break
            
            if csv_path:
                try:
                    players = load_players_from_csv(db, csv_path)
                    print(f"Loaded {len(players)} players from {csv_path}")
                except Exception as e:
                    print(f"Failed to load players: {e}")
                    db.rollback()
            else:
                print("No CSV file found for player data")
        
        # Check if schedule needs to be generated (with fresh session if needed)
        try:
            batch_scheduler = BatchScheduler(db)
            status = batch_scheduler.get_schedule_status()
            
            if status["total_daily_sets"] == 0:
                print("No schedule found. Generating initial schedule...")
                try:
                    result = batch_scheduler.generate_next_batch(manual_override=True)
                    if result.get("success"):
                        print(f"Generated initial schedule: {result['message']}")
                    else:
                        print(f"Failed to generate schedule: {result.get('error')}")
                except Exception as e:
                    print(f"Error generating schedule: {e}")
                    db.rollback()
            else:
                print(f"Schedule exists: {status['total_daily_sets']} daily sets, {status['days_remaining']} days remaining")
        except Exception as e:
            print(f"Error with schedule operations: {e}")
            db.rollback()
            
    except Exception as e:
        print(f"Startup initialization error: {e}")
        db.rollback()
    finally:
        db.close()


@app.get("/", tags=["health"])
def read_root():
    return {"status": "ok"}


app.include_router(players.router, prefix="/players", tags=["players"])
app.include_router(daily_set.router, prefix="/daily-set", tags=["daily-set"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
app.include_router(game.router)
app.include_router(voting.router)
app.include_router(admin.router)
