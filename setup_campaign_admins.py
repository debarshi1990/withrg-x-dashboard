#!/usr/bin/env python3
"""
WithRG X Dashboard - Campaign Admin Setup Script
Creates initial admin accounts and sample X handles for the campaign
"""

import requests
import json
import os
from datetime import datetime

# Configuration
API_BASE = "https://ca9424bc-b8a9-4f90-ac2d-ad982fedb010.preview.emergentagent.com/api"
# For production: API_BASE = "https://withrg-x-dashboard.com/api"

def create_campaign_admin_accounts():
    """Create initial campaign admin accounts"""
    
    print("🏛️ Setting up WithRG X Dashboard Campaign Accounts...")
    
    # Campaign accounts to create
    campaign_accounts = [
        {
            "name": "WithRG Campaign Leader",
            "email": "leader@withrg.org",
            "password": "WithRG2025Leader!",
            "role": "super_admin"
        },
        {
            "name": "WithRG Social Media Manager",
            "email": "social@withrg.org", 
            "password": "WithRG2025Social!",
            "role": "admin"
        },
        {
            "name": "WithRG Campaign Coordinator",
            "email": "coordinator@withrg.org",
            "password": "WithRG2025Coord!",
            "role": "admin"
        },
        {
            "name": "WithRG Regional Manager",
            "email": "regional@withrg.org",
            "password": "WithRG2025Regional!",
            "role": "admin"
        },
        {
            "name": "WithRG Content Creator",
            "email": "content@withrg.org",
            "password": "WithRG2025Content!",
            "role": "poster"
        }
    ]
    
    created_accounts = []
    
    for account in campaign_accounts:
        try:
            # Register account
            response = requests.post(
                f"{API_BASE}/auth/register",
                json=account,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                result = response.json()
                created_accounts.append({
                    "name": account["name"],
                    "email": account["email"],
                    "role": account["role"],
                    "token": result["token"]
                })
                print(f"✅ Created: {account['name']} ({account['role']})")
            else:
                print(f"❌ Failed to create {account['name']}: {response.text}")
                
        except Exception as e:
            print(f"❌ Error creating {account['name']}: {str(e)}")
    
    return created_accounts

def add_sample_x_handles(admin_token):
    """Add sample X/Twitter handles for the campaign"""
    
    print("\n🐦 Adding Sample WithRG X/Twitter Handles...")
    
    # Sample X handles for WithRG campaign
    sample_handles = [
        {
            "handle_name": "WithRG Official",
            "screen_name": "@WithRG",
            "twitter_id": "1234567890",
            "access_token": "sample_token_1",
            "access_token_secret": "sample_secret_1",
            "followers_count": 50000,
            "following_count": 1000,
            "tweets_count": 2500
        },
        {
            "handle_name": "WithRG Campaign",
            "screen_name": "@WithRGCampaign",
            "twitter_id": "1234567891",
            "access_token": "sample_token_2", 
            "access_token_secret": "sample_secret_2",
            "followers_count": 25000,
            "following_count": 500,
            "tweets_count": 1200
        },
        {
            "handle_name": "WithRG Youth",
            "screen_name": "@WithRGYouth",
            "twitter_id": "1234567892",
            "access_token": "sample_token_3",
            "access_token_secret": "sample_secret_3", 
            "followers_count": 15000,
            "following_count": 300,
            "tweets_count": 800
        },
        {
            "handle_name": "WithRG Mumbai",
            "screen_name": "@WithRGMumbai",
            "twitter_id": "1234567893",
            "access_token": "sample_token_4",
            "access_token_secret": "sample_secret_4",
            "followers_count": 10000,
            "following_count": 200,
            "tweets_count": 600
        },
        {
            "handle_name": "WithRG Delhi",
            "screen_name": "@WithRGDelhi", 
            "twitter_id": "1234567894",
            "access_token": "sample_token_5",
            "access_token_secret": "sample_secret_5",
            "followers_count": 8000,
            "following_count": 150,
            "tweets_count": 400
        }
    ]
    
    added_handles = []
    
    for handle in sample_handles:
        try:
            response = requests.post(
                f"{API_BASE}/handles/add",
                json=handle,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {admin_token}"
                }
            )
            
            if response.status_code == 200:
                added_handles.append(handle["screen_name"])
                print(f"✅ Added: {handle['screen_name']} ({handle['followers_count']} followers)")
            else:
                print(f"❌ Failed to add {handle['screen_name']}: {response.text}")
                
        except Exception as e:
            print(f"❌ Error adding {handle['screen_name']}: {str(e)}")
    
    return added_handles

def generate_campaign_credentials_file(accounts):
    """Generate credentials file for campaign team"""
    
    print("\n📄 Generating Campaign Credentials File...")
    
    credentials_content = f"""# WithRG X Dashboard - Campaign Team Credentials
# Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
# Platform: https://ca9424bc-b8a9-4f90-ac2d-ad982fedb010.preview.emergentagent.com
# Production: https://withrg-x-dashboard.com (when deployed)

## 🏛️ WITHRG CAMPAIGN TEAM ACCOUNTS

### Campaign Leader (Super Admin)
- **Name:** WithRG Campaign Leader
- **Email:** leader@withrg.org
- **Password:** WithRG2025Leader!
- **Role:** Campaign Leader (Full Access)
- **Permissions:** Complete platform control, user management, X handle management

### Social Media Manager (Admin)
- **Name:** WithRG Social Media Manager
- **Email:** social@withrg.org
- **Password:** WithRG2025Social!
- **Role:** Campaign Admin
- **Permissions:** Content management, analytics, team coordination

### Campaign Coordinator (Admin)
- **Name:** WithRG Campaign Coordinator
- **Email:** coordinator@withrg.org
- **Password:** WithRG2025Coord!
- **Role:** Campaign Admin
- **Permissions:** Team management, content approval, analytics

### Regional Manager (Admin)
- **Name:** WithRG Regional Manager
- **Email:** regional@withrg.org
- **Password:** WithRG2025Regional!
- **Role:** Campaign Admin
- **Permissions:** Regional coordination, local content management

### Content Creator (Poster)
- **Name:** WithRG Content Creator
- **Email:** content@withrg.org
- **Password:** WithRG2025Content!
- **Role:** Campaign Poster
- **Permissions:** Content creation, assigned handle posting

## 🐦 CONNECTED X/TWITTER HANDLES

### @WithRG (Official)
- **Followers:** 50,000
- **Purpose:** Main campaign account
- **Manager:** Campaign Leader

### @WithRGCampaign
- **Followers:** 25,000
- **Purpose:** Campaign updates and events
- **Manager:** Social Media Manager

### @WithRGYouth
- **Followers:** 15,000
- **Purpose:** Youth engagement and outreach
- **Manager:** Content Creator

### @WithRGMumbai
- **Followers:** 10,000
- **Purpose:** Mumbai regional content
- **Manager:** Regional Manager

### @WithRGDelhi
- **Followers:** 8,000
- **Purpose:** Delhi regional content
- **Manager:** Regional Manager

## 📱 INSTALLATION INSTRUCTIONS

### For Campaign Team Members:
1. **Visit:** https://ca9424bc-b8a9-4f90-ac2d-ad982fedb010.preview.emergentagent.com
2. **Login** with your credentials above
3. **Install App:** Look for "Install App" button or browser prompt
4. **Add to Home Screen:** Creates native app experience

### For Mobile Installation:
- **Android:** Chrome shows "Add to Home Screen" popup
- **iPhone:** Safari → Share → "Add to Home Screen"
- **Desktop:** Install icon appears in browser address bar

## 🎯 CAMPAIGN WORKFLOW

### Daily Operations:
1. **Campaign Leader** sets daily messaging themes
2. **Social Media Manager** creates content templates
3. **Content Creator** develops posts for different handles
4. **Regional Manager** adapts content for local audiences
5. **Coordinator** ensures message consistency

### Content Approval Process:
1. **Draft** posts created by content team
2. **Review** by social media manager
3. **Approval** by campaign leader for sensitive content
4. **Posting** to assigned handles
5. **Analytics** monitoring for engagement

## 🔐 SECURITY GUIDELINES

### Password Management:
- **Change passwords** after first login
- **Use strong passwords** (12+ characters)
- **Enable 2FA** when available
- **Don't share credentials** between team members

### Content Guidelines:
- **Stay on message** with campaign themes
- **Fact-check** all content before posting
- **Coordinate** with team on timing
- **Monitor** engagement and respond appropriately

## 📊 ANALYTICS & REPORTING

### Daily Metrics:
- **Tweet volume** per handle
- **Engagement rates** (likes, retweets, replies)
- **Follower growth** across accounts
- **Top performing content**

### Weekly Reports:
- **Campaign reach** and impressions
- **Handle performance** comparison
- **Content effectiveness** analysis
- **Team activity** summary

## 🆘 SUPPORT CONTACTS

### Technical Issues:
- **Platform problems:** tech@withrg.org
- **Account access:** admin@withrg.org
- **Installation help:** support@withrg.org

### Campaign Coordination:
- **Content questions:** content@withrg.org
- **Strategy discussions:** strategy@withrg.org
- **Regional coordination:** regional@withrg.org

---

**🏛️ BE PART OF TRUE LEADERSHIP**

Your WithRG X Dashboard is ready to coordinate our political campaign across all social media platforms. Together, we'll amplify our message and reach every voter.

*For True Leadership,*  
*WithRG Campaign Technology Team*

---

*Generated by WithRG X Dashboard Setup Script*  
*Version: 2.0 Campaign Edition*
"""
    
    with open('/tmp/withrg_campaign_credentials.md', 'w') as f:
        f.write(credentials_content)
    
    print("✅ Campaign credentials saved to: /tmp/withrg_campaign_credentials.md")
    
    return credentials_content

def main():
    """Main setup function"""
    
    print("🏛️ WithRG X Dashboard - Campaign Setup")
    print("=" * 50)
    
    # Create campaign admin accounts
    accounts = create_campaign_admin_accounts()
    
    if accounts:
        print(f"\n✅ Successfully created {len(accounts)} campaign accounts!")
        
        # Use the first admin account (Campaign Leader) to add handles
        campaign_leader = next((acc for acc in accounts if acc["role"] == "super_admin"), None)
        
        if campaign_leader:
            # Add sample X handles
            handles = add_sample_x_handles(campaign_leader["token"])
            print(f"\n✅ Successfully added {len(handles)} X/Twitter handles!")
            
            # Generate credentials file
            credentials = generate_campaign_credentials_file(accounts)
            
            print("\n🎉 WithRG X Dashboard Campaign Setup Complete!")
            print("\n📋 SUMMARY:")
            print(f"• {len(accounts)} campaign team accounts created")
            print(f"• {len(handles)} X/Twitter handles added")
            print("• Credentials file generated")
            print("• Platform ready for campaign launch")
            
            print("\n🚀 NEXT STEPS:")
            print("1. Deploy to production domain (withrg-x-dashboard.com)")
            print("2. Share credentials with campaign team")
            print("3. Distribute installation instructions")
            print("4. Begin campaign coordination!")
            
            print(f"\n📱 CAMPAIGN PLATFORM URL:")
            print("Preview: https://ca9424bc-b8a9-4f90-ac2d-ad982fedb010.preview.emergentagent.com")
            print("Production: https://withrg-x-dashboard.com (after deployment)")
            
        else:
            print("❌ No Campaign Leader account found!")
    else:
        print("❌ No accounts were created successfully!")

if __name__ == "__main__":
    main()