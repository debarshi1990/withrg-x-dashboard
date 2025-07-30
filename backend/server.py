from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import tweepy
import jwt
import bcrypt
from enum import Enum
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Twitter API setup
def get_twitter_api():
    auth = tweepy.OAuthHandler(
        os.environ['TWITTER_API_KEY'],
        os.environ['TWITTER_API_SECRET']
    )
    auth.set_access_token(
        os.environ['TWITTER_ACCESS_TOKEN'],
        os.environ['TWITTER_ACCESS_TOKEN_SECRET']
    )
    return tweepy.API(auth, wait_on_rate_limit=True)

twitter_api = get_twitter_api()

# Create the main app
app = FastAPI(title="WithRG X Dashboard API")
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()
JWT_SECRET = os.environ['JWT_SECRET_KEY']

# Enums
class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    POSTER = "poster"

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    role: UserRole
    created_at: datetime = Field(default_factory=datetime.utcnow)
    twitter_handles: List[str] = []

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: UserRole = UserRole.POSTER

class UserLogin(BaseModel):
    email: str
    password: str

class TwitterHandle(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    handle_name: str
    twitter_id: str
    access_token: str
    access_token_secret: str
    assigned_users: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class TweetPost(BaseModel):
    text: str
    handle_id: Optional[str] = None

class TweetAnalytics(BaseModel):
    tweet_id: str
    likes: int
    retweets: int
    replies: int
    impressions: Optional[int] = 0

class ActivityLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    action: str
    handle_id: str
    tweet_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    details: dict = {}

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("user_id")
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return User(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Routes
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_password = hash_password(user_data.password)
    
    # Create user
    user = User(
        email=user_data.email,
        name=user_data.name,
        role=user_data.role
    )
    
    user_dict = user.dict()
    user_dict["password"] = hashed_password
    
    await db.users.insert_one(user_dict)
    
    # Create JWT token
    token = create_jwt_token(user.id, user.role)
    
    return {
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role
        }
    }

@api_router.post("/auth/login")
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email})
    if not user or not verify_password(login_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user["id"], user["role"])
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"]
        }
    }

@api_router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.post("/tweet")
async def post_tweet(tweet_data: TweetPost, current_user: User = Depends(get_current_user)):
    try:
        # Post tweet using the main Twitter API
        tweet = twitter_api.update_status(status=tweet_data.text)
        
        # Log activity
        activity = ActivityLog(
            user_id=current_user.id,
            action="post_tweet",
            handle_id=tweet_data.handle_id or "main",
            tweet_id=str(tweet.id),
            details={
                "text": tweet_data.text,
                "tweet_url": f"https://twitter.com/user/status/{tweet.id}"
            }
        )
        await db.activity_logs.insert_one(activity.dict())
        
        return {
            "success": True,
            "tweet_id": tweet.id,
            "text": tweet.text,
            "url": f"https://twitter.com/user/status/{tweet.id}",
            "created_at": tweet.created_at
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to post tweet: {str(e)}")

@api_router.post("/retweet/{tweet_id}")
async def retweet(tweet_id: str, current_user: User = Depends(get_current_user)):
    try:
        retweet = twitter_api.retweet(tweet_id)
        
        # Log activity
        activity = ActivityLog(
            user_id=current_user.id,
            action="retweet",
            handle_id="main",
            tweet_id=tweet_id,
            details={
                "original_tweet_id": tweet_id,
                "retweet_id": str(retweet.id)
            }
        )
        await db.activity_logs.insert_one(activity.dict())
        
        return {
            "success": True,
            "retweet_id": retweet.id,
            "original_tweet_id": tweet_id
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to retweet: {str(e)}")

@api_router.get("/tweet/{tweet_id}/analytics")
async def get_tweet_analytics(tweet_id: str, current_user: User = Depends(get_current_user)):
    try:
        tweet = twitter_api.get_status(tweet_id)
        return {
            "tweet_id": tweet_id,
            "likes": tweet.favorite_count,
            "retweets": tweet.retweet_count,
            "replies": 0,  # Not available in free tier
            "created_at": tweet.created_at,
            "text": tweet.text
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get analytics: {str(e)}")

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    # Get recent activity logs
    recent_activities = await db.activity_logs.find(
        {"user_id": current_user.id}
    ).sort("timestamp", -1).limit(10).to_list(10)
    
    # Get total counts
    total_tweets = await db.activity_logs.count_documents({
        "user_id": current_user.id,
        "action": "post_tweet"
    })
    
    total_retweets = await db.activity_logs.count_documents({
        "user_id": current_user.id,
        "action": "retweet"
    })
    
    return {
        "total_tweets": total_tweets,
        "total_retweets": total_retweets,
        "recent_activities": [ActivityLog(**activity) for activity in recent_activities],
        "user_role": current_user.role
    }

@api_router.get("/activity")
async def get_activity_logs(current_user: User = Depends(get_current_user)):
    activities = await db.activity_logs.find().sort("timestamp", -1).limit(50).to_list(50)
    return [ActivityLog(**activity) for activity in activities]

@api_router.get("/")
async def root():
    return {"message": "WithRG X Dashboard API", "status": "running"}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()