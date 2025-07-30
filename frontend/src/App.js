import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Textarea } from './components/ui/textarea';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Alert, AlertDescription } from './components/ui/alert';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { 
  Twitter, 
  Send, 
  Repeat, 
  Heart, 
  MessageSquare, 
  BarChart3, 
  Users, 
  Settings,
  LogOut,
  Activity,
  TrendingUp
} from 'lucide-react';
import './App.css';

const API_BASE = process.env.REACT_APP_BACKEND_URL;

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [tweetText, setTweetText] = useState('');
  const [retweetId, setRetweetId] = useState('');
  const [analyticsId, setAnalyticsId] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [activeTab, setActiveTab] = useState('compose');

  // Auth forms
  const [isLogin, setIsLogin] = useState(true);
  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'poster'
  });

  useEffect(() => {
    if (token) {
      fetchUser();
      fetchDashboardStats();
      fetchActivities();
    }
  }, [token]);

  const apiCall = async (endpoint, options = {}) => {
    const url = `${API_BASE}/api${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...headers, ...options.headers }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  };

  const fetchUser = async () => {
    try {
      const userData = await apiCall('/me');
      setUser(userData);
    } catch (error) {
      setMessage('Failed to fetch user data');
      handleLogout();
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const stats = await apiCall('/dashboard/stats');
      setDashboardStats(stats);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  };

  const fetchActivities = async () => {
    try {
      const activitiesData = await apiCall('/activity');
      setActivities(activitiesData);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const result = await apiCall(endpoint, {
        method: 'POST',
        body: JSON.stringify(authData)
      });

      setToken(result.token);
      localStorage.setItem('token', result.token);
      setUser(result.user);
      setMessage('Successfully logged in!');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    setMessage('Logged out successfully');
  };

  const postTweet = async () => {
    if (!tweetText.trim()) return;
    
    setLoading(true);
    try {
      const result = await apiCall('/tweet', {
        method: 'POST',
        body: JSON.stringify({ text: tweetText })
      });
      
      setMessage(`Tweet posted successfully! ID: ${result.tweet_id}`);
      setTweetText('');
      fetchDashboardStats();
      fetchActivities();
    } catch (error) {
      setMessage(`Failed to post tweet: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRetweet = async () => {
    if (!retweetId.trim()) return;
    
    setLoading(true);
    try {
      const result = await apiCall(`/retweet/${retweetId}`, {
        method: 'POST'
      });
      
      setMessage(`Retweeted successfully! ID: ${result.retweet_id}`);
      setRetweetId('');
      fetchDashboardStats();
      fetchActivities();
    } catch (error) {
      setMessage(`Failed to retweet: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getAnalytics = async () => {
    if (!analyticsId.trim()) return;
    
    setLoading(true);
    try {
      const result = await apiCall(`/tweet/${analyticsId}/analytics`);
      setAnalytics(result);
      setMessage('Analytics fetched successfully!');
    } catch (error) {
      setMessage(`Failed to get analytics: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'poster': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role) => {
    return role.replace('_', ' ').toUpperCase();
  };

  // Login/Register Form
  if (!token || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23374151" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
        
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Twitter className="h-8 w-8 text-blue-400" />
              <h1 className="text-2xl font-bold text-white">WithRG X Dashboard</h1>
            </div>
            <p className="text-gray-300">Political Twitter Management Platform</p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="flex space-x-1 bg-gray-800/50 rounded-lg p-1">
              <Button
                variant={isLogin ? "default" : "ghost"}
                onClick={() => setIsLogin(true)}
                className="flex-1 text-sm"
              >
                Login
              </Button>
              <Button
                variant={!isLogin ? "default" : "ghost"}
                onClick={() => setIsLogin(false)}
                className="flex-1 text-sm"
              >
                Register
              </Button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <Input
                  placeholder="Full Name"
                  value={authData.name}
                  onChange={(e) => setAuthData({...authData, name: e.target.value})}
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                  required
                />
              )}
              
              <Input
                type="email"
                placeholder="Email"
                value={authData.email}
                onChange={(e) => setAuthData({...authData, email: e.target.value})}
                className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                required
              />
              
              <Input
                type="password"
                placeholder="Password"
                value={authData.password}
                onChange={(e) => setAuthData({...authData, password: e.target.value})}
                className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                required
              />

              {!isLogin && (
                <select
                  value={authData.role}
                  onChange={(e) => setAuthData({...authData, role: e.target.value})}
                  className="w-full p-2 rounded-md bg-white/10 border border-white/20 text-white"
                >
                  <option value="poster" className="text-black">Poster</option>
                  <option value="admin" className="text-black">Admin</option>
                  <option value="super_admin" className="text-black">Super Admin</option>
                </select>
              )}

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700" 
                disabled={loading}
              >
                {loading ? 'Loading...' : (isLogin ? 'Login' : 'Register')}
              </Button>
            </form>

            {message && (
              <Alert className="bg-blue-500/20 border-blue-500/30">
                <AlertDescription className="text-blue-200">{message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Twitter className="h-8 w-8 text-blue-500" />
              <h1 className="text-xl font-bold text-gray-900">WithRG X Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge className={getRoleColor(user.role)}>
                {getRoleLabel(user.role)}
              </Badge>
              <Avatar>
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {dashboardStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100">Total Tweets</p>
                    <p className="text-3xl font-bold">{dashboardStats.total_tweets}</p>
                  </div>
                  <Send className="h-8 w-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100">Total Retweets</p>
                    <p className="text-3xl font-bold">{dashboardStats.total_retweets}</p>
                  </div>
                  <Repeat className="h-8 w-8 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100">Role</p>
                    <p className="text-lg font-bold">{getRoleLabel(user.role)}</p>
                  </div>
                  <Users className="h-8 w-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white shadow-sm">
            <TabsTrigger value="compose" className="flex items-center space-x-2">
              <Send className="h-4 w-4" />
              <span>Compose</span>
            </TabsTrigger>
            <TabsTrigger value="retweet" className="flex items-center space-x-2">
              <Repeat className="h-4 w-4" />
              <span>Retweet</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Activity</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compose">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Send className="h-5 w-5" />
                  <span>Compose Tweet</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="What's happening?"
                  value={tweetText}
                  onChange={(e) => setTweetText(e.target.value)}
                  className="min-h-[120px] resize-none"
                  maxLength={280}
                />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    {tweetText.length}/280 characters
                  </span>
                  <Button 
                    onClick={postTweet} 
                    disabled={loading || !tweetText.trim()}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    {loading ? 'Posting...' : 'Post Tweet'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="retweet">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Repeat className="h-5 w-5" />
                  <span>Retweet</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Enter Tweet ID to retweet"
                  value={retweetId}
                  onChange={(e) => setRetweetId(e.target.value)}
                />
                <Button 
                  onClick={handleRetweet} 
                  disabled={loading || !retweetId.trim()}
                  className="bg-green-500 hover:bg-green-600"
                >
                  {loading ? 'Retweeting...' : 'Retweet'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Tweet Analytics</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter Tweet ID for analytics"
                    value={analyticsId}
                    onChange={(e) => setAnalyticsId(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={getAnalytics} 
                    disabled={loading || !analyticsId.trim()}
                  >
                    {loading ? 'Loading...' : 'Get Analytics'}
                  </Button>
                </div>

                {analytics && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold mb-4">Tweet Analytics</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Heart className="h-4 w-4 text-red-500" />
                        <span>Likes: {analytics.likes}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Repeat className="h-4 w-4 text-green-500" />
                        <span>Retweets: {analytics.retweets}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                        <span>Replies: {analytics.replies}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-purple-500" />
                        <span>Impressions: {analytics.impressions}</span>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-white rounded border">
                      <p className="text-sm text-gray-600">{analytics.text}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Activity Log</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activities.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No activities yet</p>
                  ) : (
                    activities.slice(0, 10).map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full ${
                            activity.action === 'post_tweet' ? 'bg-blue-100' : 'bg-green-100'
                          }`}>
                            {activity.action === 'post_tweet' ? (
                              <Send className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Repeat className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              {activity.action === 'post_tweet' ? 'Posted Tweet' : 'Retweeted'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(activity.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {activity.tweet_id && (
                          <Badge variant="outline">ID: {activity.tweet_id}</Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Message Alert */}
        {message && (
          <Alert className="mt-6">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}

export default App;