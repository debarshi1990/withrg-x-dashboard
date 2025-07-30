import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Textarea } from './components/ui/textarea';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Alert, AlertDescription } from './components/ui/alert';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { Switch } from './components/ui/switch';
// Removed Select import - using native select for now
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
  TrendingUp,
  Plus,
  UserPlus,
  Shield,
  Link,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Calendar,
  Target,
  Zap
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
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
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // New state for enhanced features
  const [users, setUsers] = useState([]);
  const [handles, setHandles] = useState([]);
  const [selectedHandles, setSelectedHandles] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [detailedAnalytics, setDetailedAnalytics] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showHandleModal, setShowHandleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

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
      fetchHandles();
      fetchAnalytics();
      if (user && (user.role === 'super_admin' || user.role === 'admin')) {
        fetchUsers();
      }
    }
  }, [token, user]);

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

  const fetchUsers = async () => {
    try {
      const usersData = await apiCall('/users');
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchHandles = async () => {
    try {
      const handlesData = await apiCall('/handles');
      setHandles(handlesData);
    } catch (error) {
      console.error('Failed to fetch handles:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const analyticsData = await apiCall('/analytics/dashboard');
      setAnalyticsData(analyticsData);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
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
        body: JSON.stringify({ 
          text: tweetText,
          handle_ids: selectedHandles.length > 0 ? selectedHandles : undefined
        })
      });
      
      setMessage(`Tweet posted successfully!`);
      setTweetText('');
      setSelectedHandles([]);
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
      
      setMessage(`Retweeted successfully!`);
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

  const updateUser = async (userId, updates) => {
    try {
      await apiCall(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      fetchUsers();
      setMessage('User updated successfully!');
    } catch (error) {
      setMessage(`Failed to update user: ${error.message}`);
    }
  };

  const deleteUser = async (userId) => {
    try {
      await apiCall(`/users/${userId}`, {
        method: 'DELETE'
      });
      fetchUsers();
      setMessage('User deleted successfully!');
    } catch (error) {
      setMessage(`Failed to delete user: ${error.message}`);
    }
  };

  const addHandle = async (handleData) => {
    try {
      await apiCall('/handles/add', {
        method: 'POST',
        body: JSON.stringify(handleData)
      });
      fetchHandles();
      setMessage('Handle added successfully!');
    } catch (error) {
      setMessage(`Failed to add handle: ${error.message}`);
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
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23374151' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        
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
        {/* Enhanced Stats Cards */}
        {dashboardStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                    <p className="text-purple-100">Twitter Handles</p>
                    <p className="text-3xl font-bold">{dashboardStats.total_handles}</p>
                  </div>
                  <Link className="h-8 w-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100">Team Members</p>
                    <p className="text-3xl font-bold">{dashboardStats.total_users}</p>
                  </div>
                  <Users className="h-8 w-8 text-orange-200" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Enhanced Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-white shadow-sm">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="compose" className="flex items-center space-x-2">
              <Send className="h-4 w-4" />
              <span>Compose</span>
            </TabsTrigger>
            <TabsTrigger value="handles" className="flex items-center space-x-2">
              <Link className="h-4 w-4" />
              <span>Handles</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Activity</span>
            </TabsTrigger>
            {(user.role === 'super_admin' || user.role === 'admin') && (
              <TabsTrigger value="admin" className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span>Admin</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Engagement Trends Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Engagement Trends (7 Days)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart
                      data={analyticsData?.engagement_trends || []}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="engagement" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Top Performing Handles */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Top Performing Handles</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData?.top_handles?.slice(0, 5).map((handle, index) => (
                      <div key={handle.handle_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{handle.screen_name}</p>
                            <p className="text-sm text-gray-500">{handle.followers} followers</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-600">{handle.engagement}</p>
                          <p className="text-sm text-gray-500">engagements</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Enhanced Compose Tab */}
          <TabsContent value="compose">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Send className="h-5 w-5" />
                  <span>Compose Tweet</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Handle Selection */}
                {handles.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Select Twitter Handles</label>
                    <div className="flex flex-wrap gap-2">
                      {handles.map(handle => (
                        <Button
                          key={handle.id}
                          variant={selectedHandles.includes(handle.id) ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setSelectedHandles(prev => 
                              prev.includes(handle.id) 
                                ? prev.filter(id => id !== handle.id)
                                : [...prev, handle.id]
                            );
                          }}
                        >
                          {handle.screen_name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

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

          {/* Handles Management Tab */}
          <TabsContent value="handles">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Twitter Handles</h2>
                {(user.role === 'super_admin' || user.role === 'admin') && (
                  <Button onClick={() => setShowHandleModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Handle
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {handles.map(handle => (
                  <Card key={handle.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                            {handle.screen_name.charAt(1)}
                          </div>
                          <div>
                            <h3 className="font-semibold">{handle.screen_name}</h3>
                            <p className="text-sm text-gray-500">{handle.handle_name}</p>
                          </div>
                        </div>
                        <Badge variant={handle.status === 'active' ? 'default' : 'secondary'}>
                          {handle.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold">{handle.followers_count}</p>
                          <p className="text-sm text-gray-500">Followers</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{handle.following_count}</p>
                          <p className="text-sm text-gray-500">Following</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{handle.tweets_count}</p>
                          <p className="text-sm text-gray-500">Tweets</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Enhanced Analytics Tab */}
          <TabsContent value="analytics">
            <div className="space-y-6">
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
            </div>
          </TabsContent>

          {/* Activity Tab */}
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
                            activity.action.includes('tweet') ? 'bg-blue-100' : 
                            activity.action.includes('retweet') ? 'bg-green-100' : 
                            'bg-purple-100'
                          }`}>
                            {activity.action.includes('tweet') ? (
                              <Send className="h-4 w-4 text-blue-600" />
                            ) : activity.action.includes('retweet') ? (
                              <Repeat className="h-4 w-4 text-green-600" />
                            ) : (
                              <Activity className="h-4 w-4 text-purple-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{activity.action.replace('_', ' ')}</p>
                            <p className="text-sm text-gray-500">
                              {activity.user_name} • {new Date(activity.timestamp).toLocaleString()}
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

          {/* Admin Panel Tab */}
          {(user.role === 'super_admin' || user.role === 'admin') && (
            <TabsContent value="admin">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Admin Panel</h2>
                  <Button onClick={() => setShowUserModal(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </div>

                {/* Users Management */}
                <Card>
                  <CardHeader>
                    <CardTitle>Team Members</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {users.map(usr => (
                        <div key={usr.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarFallback>{usr.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{usr.name}</p>
                              <p className="text-sm text-gray-500">{usr.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getRoleColor(usr.role)}>
                              {getRoleLabel(usr.role)}
                            </Badge>
                            <div className="flex items-center space-x-1">
                              {usr.is_active ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedUser(usr)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {user.role === 'super_admin' && usr.id !== user.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteUser(usr.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
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