from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import tweepy
import jwt
import bcrypt
from enum import Enum
import base64
import json
from urllib.parse import urlencode
import secrets
from authlib.integrations.starlette_client import OAuth

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# OAuth Setup
oauth = OAuth()
oauth.register(
    name='twitter',
    client_id=os.environ['TWITTER_API_KEY'],
    client_secret=os.environ['TWITTER_API_SECRET'],
    request_token_url='https://api.twitter.com/oauth/request_token',
    access_token_url='https://api.twitter.com/oauth/access_token',
    authorize_url='https://api.twitter.com/oauth/authenticate',
    api_base_url='https://api.twitter.com/1.1/',
)

# Twitter API setup
def get_twitter_api(access_token=None, access_token_secret=None):
    auth = tweepy.OAuthHandler(
        os.environ['TWITTER_API_KEY'],
        os.environ['TWITTER_API_SECRET']
    )
    if access_token and access_token_secret:
        auth.set_access_token(access_token, access_token_secret)
    else:
        auth.set_access_token(
            os.environ['TWITTER_ACCESS_TOKEN'],
            os.environ['TWITTER_ACCESS_TOKEN_SECRET']
        )
    return tweepy.API(auth, wait_on_rate_limit=True)

# Create the main app
app = FastAPI(title="WithRG X Dashboard API - Enhanced")
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()
JWT_SECRET = os.environ['JWT_SECRET_KEY']

# Enums
class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    POSTER = "poster"

class HandleStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

# Enhanced Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    role: UserRole
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    is_active: bool = True
    avatar_url: Optional[str] = None
    assigned_handles: List[str] = []

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: UserRole = UserRole.POSTER

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    assigned_handles: Optional[List[str]] = None

class UserLogin(BaseModel):
    email: str
    password: str

class TwitterHandle(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    handle_name: str
    screen_name: str
    twitter_id: str
    access_token: str
    access_token_secret: str
    assigned_users: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: HandleStatus = HandleStatus.ACTIVE
    followers_count: int = 0
    following_count: int = 0
    tweets_count: int = 0
    profile_image_url: Optional[str] = None
    last_sync: Optional[datetime] = None

class HandleAssignment(BaseModel):
    handle_id: str
    user_ids: List[str]

class TweetPost(BaseModel):
    text: str
    handle_ids: Optional[List[str]] = None
    schedule_time: Optional[datetime] = None

class TweetAnalytics(BaseModel):
    tweet_id: str
    handle_id: str
    likes: int
    retweets: int
    replies: int
    impressions: Optional[int] = 0
    engagement_rate: float = 0.0
    posted_at: datetime

class ActivityLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    action: str
    handle_id: Optional[str] = None
    handle_name: Optional[str] = None
    tweet_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    details: Dict[str, Any] = {}
    ip_address: Optional[str] = None

class AnalyticsQuery(BaseModel):
    handle_ids: Optional[List[str]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    metric_type: str = "engagement"

class DashboardStats(BaseModel):
    total_handles: int
    total_users: int
    total_tweets: int
    total_retweets: int
    top_performing_handles: List[Dict[str, Any]]
    recent_activities: List[ActivityLog]
    engagement_trends: List[Dict[str, Any]]

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
        user = await db.users.find_one({"id": user_id, "is_active": True})
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return User(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_role(required_roles: List[UserRole]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in required_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return role_checker

async def log_activity(user_id: str, action: str, details: Dict[str, Any] = None, 
                      handle_id: str = None, tweet_id: str = None, ip_address: str = None):
    user = await db.users.find_one({"id": user_id})
    handle_name = None
    if handle_id:
        handle = await db.twitter_handles.find_one({"id": handle_id})
        handle_name = handle.get("screen_name") if handle else None
    
    activity = ActivityLog(
        user_id=user_id,
        user_name=user.get("name", "Unknown") if user else "System",
        action=action,
        handle_id=handle_id,
        handle_name=handle_name,
        tweet_id=tweet_id,
        details=details or {},
        ip_address=ip_address
    )
    await db.activity_logs.insert_one(activity.dict())

# Authentication Routes
@api_router.post("/auth/register")
async def register(user_data: UserCreate, request: Request):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = hash_password(user_data.password)
    user = User(
        email=user_data.email,
        name=user_data.name,
        role=user_data.role
    )
    
    user_dict = user.dict()
    user_dict["password"] = hashed_password
    
    await db.users.insert_one(user_dict)
    token = create_jwt_token(user.id, user.role)
    
    await log_activity(
        user.id, "user_registered", 
        {"role": user.role}, 
        ip_address=request.client.host
    )
    
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
async def login(login_data: UserLogin, request: Request):
    user = await db.users.find_one({"email": login_data.email, "is_active": True})
    if not user or not verify_password(login_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Update last login
    await db.users.update_one(
        {"id": user["id"]}, 
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    token = create_jwt_token(user["id"], user["role"])
    
    await log_activity(
        user["id"], "user_login", 
        ip_address=request.client.host
    )
    
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

# User Management Routes (Admin/Super Admin only)
@api_router.get("/users", response_model=List[User])
async def get_users(
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    users = await db.users.find({}).to_list(100)
    return [User(**user) for user in users]

@api_router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    update_data = {k: v for k, v in user_update.dict().items() if v is not None}
    
    if update_data:
        result = await db.users.update_one(
            {"id": user_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        await log_activity(
            current_user.id, "user_updated", 
            {"updated_user": user_id, "changes": update_data}
        )
    
    updated_user = await db.users.find_one({"id": user_id})
    return User(**updated_user)

@api_router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_active": False}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    await log_activity(
        current_user.id, "user_deleted", 
        {"deleted_user": user_id}
    )
    
    return {"message": "User deactivated successfully"}

# Twitter Handle Management Routes
@api_router.get("/handles", response_model=List[TwitterHandle])
async def get_handles(current_user: User = Depends(get_current_user)):
    if current_user.role in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        handles = await db.twitter_handles.find({"status": {"$ne": "deleted"}}).to_list(100)
    else:
        handles = await db.twitter_handles.find({
            "id": {"$in": current_user.assigned_handles},
            "status": {"$ne": "deleted"}
        }).to_list(100)
    
    return [TwitterHandle(**handle) for handle in handles]

@api_router.post("/handles/connect")
async def initiate_twitter_oauth(
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    # Generate state for security
    state = secrets.token_urlsafe(32)
    
    # Store state in session/cache (simplified for MVP)
    await db.oauth_sessions.insert_one({
        "state": state,
        "user_id": current_user.id,
        "created_at": datetime.utcnow()
    })
    
    # For MVP, return instructions (real implementation would redirect to Twitter OAuth)
    return {
        "message": "Twitter OAuth flow initiated",
        "instructions": "In production, this would redirect to Twitter OAuth. For MVP, manually add handle data.",
        "state": state
    }

@api_router.post("/handles/add")
async def add_twitter_handle(
    handle_data: dict,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    # For MVP, manually add handle (in production this would be from OAuth callback)
    handle = TwitterHandle(
        handle_name=handle_data.get("handle_name", "test_handle"),
        screen_name=handle_data.get("screen_name", "@test"),
        twitter_id=handle_data.get("twitter_id", "123456789"),
        access_token=handle_data.get("access_token", "dummy_token"),
        access_token_secret=handle_data.get("access_token_secret", "dummy_secret"),
        followers_count=handle_data.get("followers_count", 0),
        following_count=handle_data.get("following_count", 0),
        tweets_count=handle_data.get("tweets_count", 0)
    )
    
    await db.twitter_handles.insert_one(handle.dict())
    
    await log_activity(
        current_user.id, "handle_added", 
        {"handle_name": handle.screen_name}
    )
    
    return handle

@api_router.put("/handles/{handle_id}/assign")
async def assign_handle_to_users(
    handle_id: str,
    assignment: HandleAssignment,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    # Update handle with assigned users
    await db.twitter_handles.update_one(
        {"id": handle_id},
        {"$set": {"assigned_users": assignment.user_ids}}
    )
    
    # Update users with assigned handle
    for user_id in assignment.user_ids:
        await db.users.update_one(
            {"id": user_id},
            {"$addToSet": {"assigned_handles": handle_id}}
        )
    
    await log_activity(
        current_user.id, "handle_assigned", 
        {"handle_id": handle_id, "assigned_to": assignment.user_ids}
    )
    
    return {"message": "Handle assigned successfully"}

# Enhanced Twitter Operations
@api_router.post("/tweet")
async def post_tweet(tweet_data: TweetPost, request: Request, current_user: User = Depends(get_current_user)):
    try:
        handle_ids = tweet_data.handle_ids or ["main"]
        results = []
        
        for handle_id in handle_ids:
            # Get Twitter API for this handle
            if handle_id != "main":
                handle = await db.twitter_handles.find_one({"id": handle_id})
                if not handle:
                    continue
                twitter_api = get_twitter_api(handle["access_token"], handle["access_token_secret"])
            else:
                twitter_api = get_twitter_api()
            
            # Post tweet
            tweet = twitter_api.update_status(status=tweet_data.text)
            
            # Store analytics
            analytics = TweetAnalytics(
                tweet_id=str(tweet.id),
                handle_id=handle_id,
                likes=tweet.favorite_count,
                retweets=tweet.retweet_count,
                replies=0,
                posted_at=tweet.created_at
            )
            await db.tweet_analytics.insert_one(analytics.dict())
            
            results.append({
                "handle_id": handle_id,
                "tweet_id": tweet.id,
                "url": f"https://twitter.com/user/status/{tweet.id}"
            })
        
        await log_activity(
            current_user.id, "tweet_posted", 
            {"text": tweet_data.text, "handles": handle_ids},
            ip_address=request.client.host
        )
        
        return {"success": True, "results": results}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to post tweet: {str(e)}")

# Advanced Analytics Routes
@api_router.get("/analytics/dashboard")
async def get_analytics_dashboard(
    current_user: User = Depends(get_current_user)
):
    # Get accessible handles based on role
    if current_user.role in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        handles = await db.twitter_handles.find({"status": "active"}).to_list(100)
    else:
        handles = await db.twitter_handles.find({
            "id": {"$in": current_user.assigned_handles},
            "status": "active"
        }).to_list(100)
    
    # Calculate engagement trends (last 7 days)
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=7)
    
    engagement_trends = []
    for i in range(7):
        date = start_date + timedelta(days=i)
        day_analytics = await db.tweet_analytics.find({
            "posted_at": {
                "$gte": date,
                "$lt": date + timedelta(days=1)
            }
        }).to_list(1000)
        
        total_engagement = sum(a["likes"] + a["retweets"] for a in day_analytics)
        engagement_trends.append({
            "date": date.strftime("%Y-%m-%d"),
            "engagement": total_engagement
        })
    
    # Top performing handles
    handle_performance = []
    for handle in handles:
        analytics = await db.tweet_analytics.find({
            "handle_id": handle["id"],
            "posted_at": {"$gte": start_date}
        }).to_list(1000)
        
        total_engagement = sum(a["likes"] + a["retweets"] for a in analytics)
        handle_performance.append({
            "handle_id": handle["id"],
            "screen_name": handle["screen_name"],
            "engagement": total_engagement,
            "followers": handle["followers_count"]
        })
    
    handle_performance.sort(key=lambda x: x["engagement"], reverse=True)
    
    return {
        "engagement_trends": engagement_trends,
        "top_handles": handle_performance[:5],
        "total_handles": len(handles),
        "date_range": {"start": start_date, "end": end_date}
    }

@api_router.get("/analytics/detailed")
async def get_detailed_analytics(
    handle_id: Optional[str] = None,
    days: int = 30,
    current_user: User = Depends(get_current_user)
):
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    query = {"posted_at": {"$gte": start_date, "$lte": end_date}}
    if handle_id:
        query["handle_id"] = handle_id
    
    analytics = await db.tweet_analytics.find(query).to_list(1000)
    
    # Calculate metrics
    total_tweets = len(analytics)
    total_likes = sum(a["likes"] for a in analytics)
    total_retweets = sum(a["retweets"] for a in analytics)
    avg_engagement = (total_likes + total_retweets) / total_tweets if total_tweets > 0 else 0
    
    # Daily breakdown
    daily_stats = {}
    for a in analytics:
        date_key = a["posted_at"].strftime("%Y-%m-%d")
        if date_key not in daily_stats:
            daily_stats[date_key] = {"tweets": 0, "likes": 0, "retweets": 0}
        
        daily_stats[date_key]["tweets"] += 1
        daily_stats[date_key]["likes"] += a["likes"]
        daily_stats[date_key]["retweets"] += a["retweets"]
    
    return {
        "summary": {
            "total_tweets": total_tweets,
            "total_likes": total_likes,
            "total_retweets": total_retweets,
            "avg_engagement": avg_engagement
        },
        "daily_breakdown": daily_stats,
        "date_range": {"start": start_date, "end": end_date}
    }

# Enhanced Dashboard
@api_router.get("/dashboard/stats")
async def get_enhanced_dashboard_stats(current_user: User = Depends(get_current_user)):
    # User-specific or admin-wide stats
    if current_user.role in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        # Admin view - all handles and users
        total_handles = await db.twitter_handles.count_documents({"status": "active"})
        total_users = await db.users.count_documents({"is_active": True})
        all_activities = await db.activity_logs.find().sort("timestamp", -1).limit(100).to_list(100)
    else:
        # Poster view - only assigned handles
        total_handles = len(current_user.assigned_handles)
        total_users = 1  # Just themselves
        all_activities = await db.activity_logs.find({
            "user_id": current_user.id
        }).sort("timestamp", -1).limit(50).to_list(50)
    
    # Tweet statistics
    total_tweets = await db.activity_logs.count_documents({"action": "tweet_posted"})
    total_retweets = await db.activity_logs.count_documents({"action": "retweet"})
    
    return DashboardStats(
        total_handles=total_handles,
        total_users=total_users,
        total_tweets=total_tweets,
        total_retweets=total_retweets,
        top_performing_handles=[],  # Will be populated by analytics
        recent_activities=[ActivityLog(**activity) for activity in all_activities[:10]],
        engagement_trends=[]  # Will be populated by analytics
    )

@api_router.get("/activity")
async def get_activity_logs(
    limit: int = 50,
    handle_id: Optional[str] = None,
    action: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    
    # Role-based filtering
    if current_user.role == UserRole.POSTER:
        query["user_id"] = current_user.id
    
    if handle_id:
        query["handle_id"] = handle_id
    if action:
        query["action"] = action
    
    activities = await db.activity_logs.find(query).sort("timestamp", -1).limit(limit).to_list(limit)
    return [ActivityLog(**activity) for activity in activities]

# Existing routes (updated)
@api_router.post("/retweet/{tweet_id}")
async def retweet(tweet_id: str, request: Request, current_user: User = Depends(get_current_user)):
    try:
        twitter_api = get_twitter_api()
        retweet = twitter_api.retweet(tweet_id)
        
        await log_activity(
            current_user.id, "retweet", 
            {"original_tweet_id": tweet_id, "retweet_id": str(retweet.id)},
            tweet_id=tweet_id,
            ip_address=request.client.host
        )
        
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
        twitter_api = get_twitter_api()
        tweet = twitter_api.get_status(tweet_id)
        
        return {
            "tweet_id": tweet_id,
            "likes": tweet.favorite_count,
            "retweets": tweet.retweet_count,
            "replies": 0,
            "created_at": tweet.created_at,
            "text": tweet.text
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get analytics: {str(e)}")

@api_router.get("/")
async def root():
    return {"message": "WithRG X Dashboard API - Enhanced", "status": "running", "version": "2.0"}

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