import requests
import sys
import json
from datetime import datetime

class WithRGAPITester:
    def __init__(self, base_url="https://ca9424bc-b8a9-4f90-ac2d-ad982fedb010.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_email = f"test_user_{datetime.now().strftime('%H%M%S')}@test.com"
        self.test_user_password = "TestPass123!"
        self.test_user_name = "Test User"

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test("Root Endpoint", "GET", "/", 200)

    def test_user_registration(self):
        """Test user registration with different roles"""
        print("\n📝 Testing User Registration...")
        
        # Test poster registration
        success, response = self.run_test(
            "Register Poster",
            "POST",
            "/auth/register",
            200,
            data={
                "email": self.test_user_email,
                "password": self.test_user_password,
                "name": self.test_user_name,
                "role": "poster"
            }
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            print(f"   Token received: {self.token[:20]}...")
            return True
        
        return False

    def test_duplicate_registration(self):
        """Test duplicate email registration"""
        return self.run_test(
            "Duplicate Registration",
            "POST",
            "/auth/register",
            400,
            data={
                "email": self.test_user_email,
                "password": self.test_user_password,
                "name": "Another User",
                "role": "admin"
            }
        )

    def test_user_login(self):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "/auth/login",
            200,
            data={
                "email": self.test_user_email,
                "password": self.test_user_password
            }
        )
        
        if success and 'token' in response:
            self.token = response['token']
            return True
        return False

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        return self.run_test(
            "Invalid Login",
            "POST",
            "/auth/login",
            401,
            data={
                "email": "invalid@test.com",
                "password": "wrongpassword"
            }
        )

    def test_get_user_profile(self):
        """Test getting current user profile"""
        return self.run_test("Get User Profile", "GET", "/me", 200)

    def test_unauthorized_access(self):
        """Test accessing protected endpoint without token"""
        old_token = self.token
        self.token = None
        success, _ = self.run_test("Unauthorized Access", "GET", "/me", 401)
        self.token = old_token
        return success

    def test_post_tweet(self):
        """Test posting a tweet"""
        tweet_text = f"Test tweet from WithRG Dashboard - {datetime.now().strftime('%H:%M:%S')}"
        success, response = self.run_test(
            "Post Tweet",
            "POST",
            "/tweet",
            200,
            data={"text": tweet_text}
        )
        
        if success and 'tweet_id' in response:
            self.test_tweet_id = str(response['tweet_id'])
            print(f"   Tweet ID: {self.test_tweet_id}")
            return True
        return False

    def test_empty_tweet(self):
        """Test posting empty tweet"""
        return self.run_test(
            "Empty Tweet",
            "POST",
            "/tweet",
            400,
            data={"text": ""}
        )

    def test_retweet(self):
        """Test retweeting functionality"""
        # Use a known tweet ID for testing (this might fail if the tweet doesn't exist)
        test_retweet_id = "1234567890123456789"  # Placeholder ID
        return self.run_test(
            "Retweet",
            "POST",
            f"/retweet/{test_retweet_id}",
            400  # Expecting 400 since the tweet ID likely doesn't exist
        )

    def test_get_tweet_analytics(self):
        """Test getting tweet analytics"""
        # Use a placeholder tweet ID
        test_analytics_id = "1234567890123456789"
        return self.run_test(
            "Get Tweet Analytics",
            "GET",
            f"/tweet/{test_analytics_id}/analytics",
            400  # Expecting 400 since the tweet ID likely doesn't exist
        )

    def test_dashboard_stats(self):
        """Test getting dashboard statistics"""
        return self.run_test("Dashboard Stats", "GET", "/dashboard/stats", 200)

    def test_activity_logs(self):
        """Test getting activity logs"""
        return self.run_test("Activity Logs", "GET", "/activity", 200)

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting WithRG X Dashboard API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 60)

        # Test sequence
        tests = [
            ("Root Endpoint", self.test_root_endpoint),
            ("User Registration", self.test_user_registration),
            ("Duplicate Registration", self.test_duplicate_registration),
            ("User Login", self.test_user_login),
            ("Invalid Login", self.test_invalid_login),
            ("Get User Profile", self.test_get_user_profile),
            ("Unauthorized Access", self.test_unauthorized_access),
            ("Post Tweet", self.test_post_tweet),
            ("Empty Tweet", self.test_empty_tweet),
            ("Retweet", self.test_retweet),
            ("Tweet Analytics", self.test_get_tweet_analytics),
            ("Dashboard Stats", self.test_dashboard_stats),
            ("Activity Logs", self.test_activity_logs),
        ]

        for test_name, test_func in tests:
            try:
                test_func()
            except Exception as e:
                print(f"❌ {test_name} failed with exception: {str(e)}")

        # Print final results
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS")
        print("=" * 60)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed. Check the logs above.")
            return 1

def main():
    tester = WithRGAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())