#!/usr/bin/env python3
"""
Enhanced WithRG X Dashboard Backend API Testing Suite
Tests all enhanced features including multi-handle management, analytics, and role-based access
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class EnhancedWithRGAPITester:
    def __init__(self, base_url="https://de7c82b6-d23b-489c-a63b-fcd7f850869d.preview.emergentagent.com"):
        self.base_url = base_url
        self.tokens = {}  # Store tokens for different roles
        self.users = {}   # Store user data for different roles
        self.handles = [] # Store created handles
        self.tests_run = 0
        self.tests_passed = 0
        self.timestamp = datetime.now().strftime('%H%M%S')
        self.session = requests.Session()

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")
        return success

    def api_call(self, endpoint: str, method: str = "GET", data: Dict = None, 
                 token: str = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make API call and return success status and response data"""
        url = f"{self.base_url}/api{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'

        try:
            if method == "GET":
                response = self.session.get(url, headers=headers, timeout=15)
            elif method == "POST":
                response = self.session.post(url, json=data, headers=headers, timeout=15)
            elif method == "PUT":
                response = self.session.put(url, json=data, headers=headers, timeout=15)
            elif method == "DELETE":
                response = self.session.delete(url, headers=headers, timeout=15)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}

            return success, response_data

        except Exception as e:
            return False, {"error": str(e)}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, data = self.api_call("/", expected_status=200)
        return self.log_test(
            "Root Endpoint", 
            success and "WithRG X Dashboard API - Enhanced" in data.get("message", ""),
            f"- {data.get('message', 'No message')}"
        )

    def test_user_registration(self):
        """Test user registration for different roles"""
        roles = ["super_admin", "admin", "poster"]
        
        for role in roles:
            user_data = {
                "email": f"test_{role}_{self.timestamp}@example.com",
                "password": "TestPass123!",
                "name": f"Test {role.replace('_', ' ').title()}",
                "role": role
            }
            
            success, data = self.api_call("/auth/register", "POST", user_data, expected_status=200)
            
            if success and "token" in data and "user" in data:
                self.tokens[role] = data["token"]
                self.users[role] = data["user"]
                self.log_test(f"Register {role}", True, f"- User ID: {data['user']['id']}")
            else:
                self.log_test(f"Register {role}", False, f"- {data}")
                return False
        
        return True

    def test_user_login(self):
        """Test user login"""
        if "super_admin" not in self.users:
            return self.log_test("Login Test", False, "- No super_admin user to test login")
        
        user = self.users["super_admin"]
        login_data = {
            "email": user["email"],
            "password": "TestPass123!"
        }
        
        success, data = self.api_call("/auth/login", "POST", login_data, expected_status=200)
        return self.log_test(
            "User Login", 
            success and "token" in data,
            f"- Token received: {'Yes' if success else 'No'}"
        )

    def test_get_current_user(self):
        """Test /me endpoint"""
        if "super_admin" not in self.tokens:
            return self.log_test("Get Current User", False, "- No token available")
        
        success, data = self.api_call("/me", token=self.tokens["super_admin"])
        return self.log_test(
            "Get Current User", 
            success and data.get("role") == "super_admin",
            f"- Role: {data.get('role', 'Unknown')}"
        )

    def test_user_management_endpoints(self):
        """Test user management endpoints (admin/super_admin only)"""
        if "super_admin" not in self.tokens:
            return self.log_test("User Management", False, "- No super_admin token")
        
        token = self.tokens["super_admin"]
        
        # Test GET /users
        success, users_data = self.api_call("/users", token=token)
        if not self.log_test("Get Users List", success, f"- Found {len(users_data) if success else 0} users"):
            return False
        
        # Test PUT /users/{user_id} - update a user
        if success and users_data and "poster" in self.users:
            poster_id = self.users["poster"]["id"]
            update_data = {"name": "Updated Poster Name"}
            
            success, _ = self.api_call(f"/users/{poster_id}", "PUT", update_data, token=token)
            self.log_test("Update User", success, f"- Updated user {poster_id}")
        
        # Test role-based access - poster should not access /users
        if "poster" in self.tokens:
            success, _ = self.api_call("/users", token=self.tokens["poster"], expected_status=403)
            self.log_test("Role-based Access Control", success, "- Poster correctly denied access to /users")
        
        return True

    def test_handle_management(self):
        """Test Twitter handle management"""
        if "super_admin" not in self.tokens:
            return self.log_test("Handle Management", False, "- No super_admin token")
        
        token = self.tokens["super_admin"]
        
        # Test GET /handles
        success, handles_data = self.api_call("/handles", token=token)
        if not self.log_test("Get Handles List", success, f"- Found {len(handles_data) if success else 0} handles"):
            return False
        
        # Test POST /handles/connect (OAuth initiation)
        success, connect_data = self.api_call("/handles/connect", "POST", token=token)
        self.log_test("Handle OAuth Connect", success, f"- {connect_data.get('message', '')}")
        
        # Test POST /handles/add (Add handle manually for MVP)
        handle_data = {
            "handle_name": "test_handle_" + self.timestamp,
            "screen_name": "@test_handle",
            "twitter_id": "123456789",
            "access_token": "dummy_token",
            "access_token_secret": "dummy_secret",
            "followers_count": 1000,
            "following_count": 500,
            "tweets_count": 250
        }
        
        success, new_handle = self.api_call("/handles/add", "POST", handle_data, token=token)
        if success:
            self.handles.append(new_handle)
            self.log_test("Add Handle", True, f"- Handle ID: {new_handle.get('id', 'Unknown')}")
        else:
            self.log_test("Add Handle", False, f"- {new_handle}")
        
        return True

    def test_analytics_endpoints(self):
        """Test analytics endpoints"""
        if "super_admin" not in self.tokens:
            return self.log_test("Analytics Endpoints", False, "- No super_admin token")
        
        token = self.tokens["super_admin"]
        
        # Test GET /analytics/dashboard
        success, dashboard_data = self.api_call("/analytics/dashboard", token=token)
        expected_keys = ["engagement_trends", "top_handles", "total_handles"]
        has_expected_keys = all(key in dashboard_data for key in expected_keys) if success else False
        
        self.log_test(
            "Analytics Dashboard", 
            success and has_expected_keys,
            f"- Keys present: {list(dashboard_data.keys()) if success else 'None'}"
        )
        
        # Test GET /analytics/detailed
        success, detailed_data = self.api_call("/analytics/detailed?days=7", token=token)
        expected_keys = ["summary", "daily_breakdown", "date_range"]
        has_expected_keys = all(key in detailed_data for key in expected_keys) if success else False
        
        self.log_test(
            "Detailed Analytics", 
            success and has_expected_keys,
            f"- Summary: {detailed_data.get('summary', {}) if success else 'None'}"
        )
        
        return True

    def test_dashboard_stats(self):
        """Test enhanced dashboard stats"""
        if "super_admin" not in self.tokens:
            return self.log_test("Dashboard Stats", False, "- No super_admin token")
        
        token = self.tokens["super_admin"]
        
        success, stats_data = self.api_call("/dashboard/stats", token=token)
        expected_keys = ["total_handles", "total_users", "total_tweets", "total_retweets"]
        has_expected_keys = all(key in stats_data for key in expected_keys) if success else False
        
        return self.log_test(
            "Dashboard Stats", 
            success and has_expected_keys,
            f"- Stats: Handles={stats_data.get('total_handles', 0)}, Users={stats_data.get('total_users', 0)}"
        )

    def test_activity_logging(self):
        """Test activity logging endpoint"""
        if "super_admin" not in self.tokens:
            return self.log_test("Activity Logging", False, "- No super_admin token")
        
        token = self.tokens["super_admin"]
        
        success, activities_data = self.api_call("/activity", token=token)
        return self.log_test(
            "Activity Logging", 
            success,
            f"- Found {len(activities_data) if success else 0} activities"
        )

    def test_tweet_operations(self):
        """Test tweet posting and retweet operations"""
        if "super_admin" not in self.tokens:
            return self.log_test("Tweet Operations", False, "- No super_admin token")
        
        token = self.tokens["super_admin"]
        
        # Test POST /tweet
        tweet_data = {
            "text": f"Test tweet from Enhanced WithRG X Dashboard - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "handle_ids": [handle["id"] for handle in self.handles[:1]] if self.handles else None
        }
        
        success, tweet_result = self.api_call("/tweet", "POST", tweet_data, token=token)
        self.log_test(
            "Post Tweet", 
            success,
            f"- Results: {len(tweet_result.get('results', [])) if success else 0} handles"
        )
        
        # Test GET /tweet/{tweet_id}/analytics (using a dummy ID since we can't get real Twitter data)
        success, analytics_result = self.api_call("/tweet/123456789/analytics", token=token, expected_status=400)
        # We expect this to fail with 400 since it's a dummy ID, but the endpoint should exist
        self.log_test(
            "Tweet Analytics", 
            success,  # 400 is expected for dummy ID
            "- Endpoint exists (400 expected for dummy ID)"
        )
        
        return True

    def test_team_management_endpoints(self):
        """Test new team management endpoints"""
        if "super_admin" not in self.tokens:
            return self.log_test("Team Management", False, "- No super_admin token")
        
        token = self.tokens["super_admin"]
        
        # Test POST /team/members - Add new team member
        new_member_data = {
            "email": f"team_member_{self.timestamp}@example.com",
            "password": "TeamPass123!",
            "name": "New Team Member",
            "role": "poster"
        }
        
        success, member_result = self.api_call("/team/members", "POST", new_member_data, token=token)
        new_member_id = None
        if success and "user" in member_result:
            new_member_id = member_result["user"]["id"]
            self.log_test("Add Team Member", True, f"- Member ID: {new_member_id}")
        else:
            self.log_test("Add Team Member", False, f"- {member_result}")
        
        # Test GET /team/members - Get all team members
        success, members_data = self.api_call("/team/members", token=token)
        self.log_test(
            "Get Team Members", 
            success and "members" in members_data,
            f"- Found {len(members_data.get('members', [])) if success else 0} members"
        )
        
        # Test PUT /team/members/{user_id} - Update team member
        if new_member_id:
            update_data = {"name": "Updated Team Member Name"}
            success, _ = self.api_call(f"/team/members/{new_member_id}", "PUT", update_data, token=token)
            self.log_test("Update Team Member", success, f"- Updated member {new_member_id}")
        
        # Test handle assignment endpoints
        if self.handles and new_member_id:
            handle_id = self.handles[0]["id"]
            
            # Test POST /team/assign-handle - Assign handle to user
            assignment_data = {"user_id": new_member_id, "handle_id": handle_id}
            success, _ = self.api_call("/team/assign-handle", "POST", assignment_data, token=token)
            self.log_test("Assign Handle to Member", success, f"- Assigned handle {handle_id} to user {new_member_id}")
            
            # Test DELETE /team/assign-handle - Revoke handle from user
            success, _ = self.api_call("/team/assign-handle", "DELETE", assignment_data, token=token)
            self.log_test("Revoke Handle from Member", success, f"- Revoked handle {handle_id} from user {new_member_id}")
        
        # Test DELETE /team/members/{user_id} - Remove team member
        if new_member_id:
            success, _ = self.api_call(f"/team/members/{new_member_id}", "DELETE", token=token)
            self.log_test("Remove Team Member", success, f"- Removed member {new_member_id}")
        
        return True

    def test_twitter_oauth_endpoints(self):
        """Test Twitter OAuth endpoints"""
        if "super_admin" not in self.tokens:
            return self.log_test("Twitter OAuth", False, "- No super_admin token")
        
        token = self.tokens["super_admin"]
        
        # Test POST /handles/connect - Initiate Twitter OAuth
        success, connect_data = self.api_call("/handles/connect", "POST", token=token)
        has_auth_url = "authorization_url" in connect_data if success else False
        self.log_test(
            "Twitter OAuth Connect", 
            success and has_auth_url,
            f"- Auth URL provided: {'Yes' if has_auth_url else 'No'}"
        )
        
        # Test POST /handles/callback - OAuth callback (will fail without proper tokens, but endpoint should exist)
        callback_data = {
            "oauth_token": "dummy_token",
            "oauth_verifier": "dummy_verifier"
        }
        success, callback_result = self.api_call("/handles/callback", "POST", callback_data, token=token, expected_status=400)
        # We expect 400 because we're using dummy tokens, but the endpoint should exist
        self.log_test(
            "Twitter OAuth Callback", 
            success,  # 400 is expected for dummy tokens
            "- Endpoint exists (400 expected for dummy tokens)"
        )
        
        return True

    def test_role_based_access(self):
        """Test role-based access control across different endpoints"""
        if not all(role in self.tokens for role in ["super_admin", "admin", "poster"]):
            return self.log_test("Role-based Access", False, "- Missing role tokens")
        
        test_results = []
        
        # Test 1: Only super_admin can delete users
        success, _ = self.api_call("/users/dummy_id", "DELETE", 
                                 token=self.tokens["super_admin"], expected_status=404)  # 404 expected for dummy ID
        test_results.append(("Super Admin Delete", success))
        
        success, _ = self.api_call("/users/dummy_id", "DELETE", 
                                 token=self.tokens["admin"], expected_status=403)  # 403 expected - insufficient permissions
        test_results.append(("Admin Delete Denied", success))
        
        # Test 2: Admin and Super Admin can access /users
        success, _ = self.api_call("/users", token=self.tokens["admin"])
        test_results.append(("Admin Access Users", success))
        
        # Test 3: Poster cannot access /users
        success, _ = self.api_call("/users", token=self.tokens["poster"], expected_status=403)
        test_results.append(("Poster Denied Users", success))
        
        # Test 4: All roles can access their own profile
        for role in ["super_admin", "admin", "poster"]:
            success, _ = self.api_call("/me", token=self.tokens[role])
            test_results.append((f"{role} Access Profile", success))
        
        # Test 5: Team management endpoints require admin/super_admin
        success, _ = self.api_call("/team/members", token=self.tokens["poster"], expected_status=403)
        test_results.append(("Poster Denied Team Access", success))
        
        success, _ = self.api_call("/team/members", token=self.tokens["admin"])
        test_results.append(("Admin Team Access", success))
        
        all_passed = all(result[1] for result in test_results)
        details = ", ".join([f"{name}: {'✓' if result else '✗'}" for name, result in test_results])
        
        return self.log_test("Role-based Access Control", all_passed, f"- {details}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Enhanced WithRG X Dashboard Backend API Tests")
        print("=" * 70)
        
        # Core API tests
        self.test_root_endpoint()
        
        # Authentication tests
        if not self.test_user_registration():
            print("❌ Registration failed - stopping tests")
            return False
        
        self.test_user_login()
        self.test_get_current_user()
        
        # Enhanced feature tests
        self.test_user_management_endpoints()
        self.test_handle_management()
        self.test_analytics_endpoints()
        self.test_dashboard_stats()
        self.test_activity_logging()
        self.test_tweet_operations()
        self.test_role_based_access()
        
        # Print summary
        print("\n" + "=" * 70)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed! Backend API is working correctly.")
            return True
        else:
            failed = self.tests_run - self.tests_passed
            print(f"⚠️  {failed} test(s) failed. Check the details above.")
            return False

def main():
    """Main test execution"""
    tester = EnhancedWithRGAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())