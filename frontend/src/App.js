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
  TrendingUp,
  Plus,
  UserPlus,
  Shield,
  Link,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Target,
  Zap,
  Download,
  Smartphone,
  Crown
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
  const [activeTab, setActiveTab] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('tab') || 'dashboard';
  });
  
  // New state for enhanced features
  const [users, setUsers] = useState([]);
  const [handles, setHandles] = useState([]);
  const [selectedHandles, setSelectedHandles] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [detailedAnalytics, setDetailedAnalytics] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showHandleModal, setShowHandleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPWAInfo, setShowPWAInfo] = useState(false);

  // PWA state
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // Auth forms
  const [isLogin, setIsLogin] = useState(true);
  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'poster'
  });

  // PWA Installation handling
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      setMessage('🎉 WithRG X Dashboard installed successfully! Welcome to True Leadership!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Handle PWA installation
  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setMessage('📱 Installing WithRG X Dashboard... Be Part of True Leadership!');
      } else {
        setMessage('Installation cancelled. You can install later from browser settings.');
      }
      
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

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

  // Update URL when tab changes
  useEffect(() => {
    const url = new URL(window.location);
    url.searchParams.set('tab', activeTab);
    window.history.replaceState({}, '', url);
  }, [activeTab]);

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
      
      // Check if we're offline
      if (!navigator.onLine) {
        throw new Error('You are offline. Some features may be limited.');
      }
      
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
      const usersData = await apiCall('/team/members');
      setUsers(usersData.members || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      // Fallback to old endpoint if new one fails
      try {
        const fallbackData = await apiCall('/users');
        setUsers(fallbackData);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
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
      setMessage('🎉 Welcome to WithRG X Dashboard! Be Part of True Leadership.');
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
    setMessage('👋 Logged out successfully. Thank you for being part of WithRG!');
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
      
      setMessage(`🚀 Tweet posted successfully for WithRG campaign!`);
      setTweetText('');
      setSelectedHandles([]);
      fetchDashboardStats();
      fetchActivities();
    } catch (error) {
      setMessage(`❌ Failed to post tweet: ${error.message}`);
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
      
      setMessage(`🔄 Retweeted successfully for WithRG!`);
      setRetweetId('');
      fetchDashboardStats();
      fetchActivities();
    } catch (error) {
      setMessage(`❌ Failed to retweet: ${error.message}`);
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
      setMessage('📊 Analytics fetched successfully!');
    } catch (error) {
      setMessage(`❌ Failed to get analytics: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userId, updates) => {
    try {
      await apiCall(`/team/members/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      fetchUsers();
      setMessage('✅ Team member updated successfully!');
    } catch (error) {
      setMessage(`❌ Failed to update team member: ${error.message}`);
    }
  };

  const assignHandleToUser = async (userId, handleId) => {
    try {
      await apiCall('/team/assign-handle', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, handle_id: handleId })
      });
      fetchUsers();
      setMessage('✅ Handle assigned successfully!');
    } catch (error) {
      setMessage(`❌ Failed to assign handle: ${error.message}`);
    }
  };

  const revokeHandleFromUser = async (userId, handleId) => {
    try {
      await apiCall('/team/assign-handle', {
        method: 'DELETE',
        body: JSON.stringify({ user_id: userId, handle_id: handleId })
      });
      fetchUsers();
      setMessage('✅ Handle access revoked successfully!');
    } catch (error) {
      setMessage(`❌ Failed to revoke handle access: ${error.message}`);
    }
  };

  const deleteUser = async (userId) => {
    try {
      await apiCall(`/team/members/${userId}`, {
        method: 'DELETE'
      });
      fetchUsers();
      setMessage('✅ Team member removed successfully!');
    } catch (error) {
      setMessage(`❌ Failed to remove team member: ${error.message}`);
    }
  };

  const addHandle = async (handleData) => {
    try {
      await apiCall('/handles/add', {
        method: 'POST',
        body: JSON.stringify(handleData)
      });
      fetchHandles();
      setMessage('✅ X/Twitter handle added successfully!');
    } catch (error) {
      setMessage(`❌ Failed to add handle: ${error.message}`);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'super_admin': return 'bg-gradient-to-r from-blue-600 to-blue-700 text-white';
      case 'admin': return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white';
      case 'poster': return 'bg-gradient-to-r from-blue-400 to-blue-500 text-white';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role) => {
    return role.replace('_', ' ').toUpperCase();
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'super_admin': return <Crown className="h-3 w-3" />;
      case 'admin': return <Shield className="h-3 w-3" />;
      case 'poster': return <Users className="h-3 w-3" />;
      default: return null;
    }
  };

  // Login/Register Form
  if (!token || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center p-4">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url("https://customer-assets.emergentagent.com/job_withrg-x-dash/artifacts/vwh89cbe_Cover-Pic.jpeg")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}></div>
        
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <img 
                src="https://customer-assets.emergentagent.com/job_withrg-x-dash/artifacts/t2uvs7gh_WithRG%20logo.png" 
                alt="WithRG Logo" 
                className="h-12 w-auto"
              />
            </div>
            <h1 className="text-2xl font-bold text-white">WithRG X Dashboard</h1>
            <p className="text-gray-200">Be Part of True Leadership</p>
            <p className="text-sm text-yellow-200">📱 Install as app for easy campaign access</p>
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
                  className="bg-white/10 border-white/20 text-white placeholder-gray-300"
                  required
                />
              )}
              
              <Input
                type="email"
                placeholder="Email"
                value={authData.email}
                onChange={(e) => setAuthData({...authData, email: e.target.value})}
                className="bg-white/10 border-white/20 text-white placeholder-gray-300"
                required
              />
              
              <Input
                type="password"
                placeholder="Password"
                value={authData.password}
                onChange={(e) => setAuthData({...authData, password: e.target.value})}
                className="bg-white/10 border-white/20 text-white placeholder-gray-300"
                required
              />

              {!isLogin && (
                <select
                  value={authData.role}
                  onChange={(e) => setAuthData({...authData, role: e.target.value})}
                  className="w-full p-2 rounded-md bg-white/10 border border-white/20 text-white"
                >
                  <option value="poster" className="text-black">Campaign Poster</option>
                  <option value="admin" className="text-black">Campaign Admin</option>
                  <option value="super_admin" className="text-black">Campaign Leader</option>
                </select>
              )}

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold" 
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading...</span>
                  </div>
                ) : (isLogin ? 'Join the Movement' : 'Register for WithRG')}
              </Button>
            </form>

            {message && (
              <Alert className="bg-orange-500/20 border-orange-500/30">
                <AlertDescription className="text-orange-100">{message}</AlertDescription>
              </Alert>
            )}

            {/* PWA Info */}
            <div className="text-center pt-4 border-t border-white/20">
              <p className="text-xs text-gray-300 mb-2">💡 Install this app for better campaign management</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPWAInfo(true)}
                className="text-blue-200 hover:text-blue-100"
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Learn More
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* PWA Info Modal */}
        {showPWAInfo && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Smartphone className="h-5 w-5" />
                  <span>Install WithRG X Dashboard</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">Install this campaign management app for:</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Quick access from home screen</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Works offline during campaigns</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Real-time campaign notifications</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Native app experience</span>
                  </li>
                </ul>
                <div className="flex space-x-2">
                  <Button onClick={() => setShowPWAInfo(false)} variant="outline" className="flex-1">
                    Later
                  </Button>
                  <Button 
                    onClick={() => {
                      setShowPWAInfo(false);
                    }} 
                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600"
                  >
                    Got it!
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <img 
                src="https://customer-assets.emergentagent.com/job_withrg-x-dash/artifacts/t2uvs7gh_WithRG%20logo.png" 
                alt="WithRG Logo" 
                className="h-8 w-auto"
              />
              <h1 className="text-xl font-bold text-gray-900">WithRG X Dashboard</h1>
              {!navigator.onLine && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  Offline
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {/* PWA Install Button */}
              {isInstallable && (
                <Button
                  onClick={handleInstallPWA}
                  size="sm"
                  variant="outline"
                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Install App
                </Button>
              )}
              
              <Badge className={`${getRoleColor(user.role)} flex items-center space-x-1`}>
                {getRoleIcon(user.role)}
                <span>{getRoleLabel(user.role)}</span>
              </Badge>
              <Avatar>
                <AvatarFallback className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  {user.name.charAt(0)}
                </AvatarFallback>
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
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100">Campaign Tweets</p>
                    <p className="text-3xl font-bold">{dashboardStats.total_tweets}</p>
                    <p className="text-xs text-blue-200">This month</p>
                  </div>
                  <Send className="h-8 w-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100">Retweets</p>
                    <p className="text-3xl font-bold">{dashboardStats.total_retweets}</p>
                    <p className="text-xs text-green-200">This month</p>
                  </div>
                  <Repeat className="h-8 w-8 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100">X Handles</p>
                    <p className="text-3xl font-bold">{dashboardStats.total_handles}</p>
                    <p className="text-xs text-purple-200">Connected</p>
                  </div>
                  <Link className="h-8 w-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100">Campaign Team</p>
                    <p className="text-3xl font-bold">{dashboardStats.total_users}</p>
                    <p className="text-xs text-blue-200">Active members</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Enhanced Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-white shadow-sm h-12">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2 text-sm">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="compose" className="flex items-center space-x-2 text-sm">
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Compose</span>
            </TabsTrigger>
            <TabsTrigger value="handles" className="flex items-center space-x-2 text-sm">
              <Link className="h-4 w-4" />
              <span className="hidden sm:inline">X Handles</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2 text-sm">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center space-x-2 text-sm">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
            {(user.role === 'super_admin' || user.role === 'admin') && (
              <TabsTrigger value="admin" className="flex items-center space-x-2 text-sm">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Engagement Trends Chart */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Campaign Engagement Trends (7 Days)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analyticsData?.engagement_trends?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart
                        data={analyticsData.engagement_trends}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="engagement" 
                          stroke="#f97316" 
                          fill="#f97316" 
                          fillOpacity={0.3}
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No engagement data yet</p>
                        <p className="text-sm">Start posting to see campaign trends</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Performing Handles */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Top Performing X Handles</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData?.top_handles?.length > 0 ? (
                      analyticsData.top_handles.slice(0, 5).map((handle, index) => (
                        <div key={handle.handle_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                              index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' : 
                              index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400' : 
                              index === 2 ? 'bg-gradient-to-r from-amber-500 to-amber-600' : 'bg-gradient-to-r from-orange-500 to-red-600'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{handle.screen_name}</p>
                              <p className="text-sm text-gray-500">{handle.followers} followers</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-orange-600">{handle.engagement}</p>
                            <p className="text-sm text-gray-500">engagements</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No X handles connected yet</p>
                        <p className="text-sm">Connect campaign X accounts to see performance</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>Quick Campaign Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button 
                    onClick={() => setActiveTab('compose')} 
                    className="h-20 flex-col space-y-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                  >
                    <Send className="h-6 w-6" />
                    <span>New Campaign Tweet</span>
                  </Button>
                  <Button 
                    onClick={() => setActiveTab('analytics')} 
                    className="h-20 flex-col space-y-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                  >
                    <BarChart3 className="h-6 w-6" />
                    <span>View Analytics</span>
                  </Button>
                  <Button 
                    onClick={() => setActiveTab('handles')} 
                    className="h-20 flex-col space-y-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                  >
                    <Link className="h-6 w-6" />
                    <span>Manage X Handles</span>
                  </Button>
                  {(user.role === 'super_admin' || user.role === 'admin') && (
                    <Button 
                      onClick={() => setActiveTab('admin')} 
                      className="h-20 flex-col space-y-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                    >
                      <Shield className="h-6 w-6" />
                      <span>Campaign Admin</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Compose Tab */}
          <TabsContent value="compose">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Send className="h-5 w-5" />
                  <span>Compose Campaign Tweet</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Handle Selection */}
                {handles.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Select X/Twitter Handles</label>
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
                          className={`transition-all ${selectedHandles.includes(handle.id) ? 'bg-gradient-to-r from-blue-500 to-blue-600' : ''}`}
                        >
                          <Twitter className="h-3 w-3 mr-1" />
                          {handle.screen_name}
                        </Button>
                      ))}
                    </div>
                    {selectedHandles.length === 0 && (
                      <p className="text-sm text-gray-500">No handles selected - will post to main WithRG account</p>
                    )}
                  </div>
                )}

                <Textarea
                  placeholder="What's happening in your WithRG campaign today? Share your message for true leadership..."
                  value={tweetText}
                  onChange={(e) => setTweetText(e.target.value)}
                  className="min-h-[120px] resize-none text-lg"
                  maxLength={280}
                />
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <span className={`text-sm ${
                      tweetText.length > 260 ? 'text-red-500' : 
                      tweetText.length > 240 ? 'text-yellow-500' : 'text-gray-500'
                    }`}>
                      {tweetText.length}/280 characters
                    </span>
                    {selectedHandles.length > 0 && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        Posting to {selectedHandles.length} handle{selectedHandles.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <Button 
                    onClick={postTweet} 
                    disabled={loading || !tweetText.trim()}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 min-w-[120px]"
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Posting...</span>
                      </div>
                    ) : 'Post Campaign Tweet'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Retweet Section */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Repeat className="h-5 w-5" />
                  <span>Retweet for Campaign</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter Tweet ID or URL to retweet"
                    value={retweetId}
                    onChange={(e) => setRetweetId(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleRetweet} 
                    disabled={loading || !retweetId.trim()}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 min-w-[100px]"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Repeat className="h-4 w-4 mr-2" />
                        Retweet
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  💡 Tip: You can paste either a tweet ID (numbers only) or a full X/Twitter URL
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Handles Management Tab */}
          <TabsContent value="handles">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Campaign X/Twitter Handles</h2>
                {(user.role === 'super_admin' || user.role === 'admin') && (
                  <Button onClick={() => setShowHandleModal(true)} className="bg-gradient-to-r from-blue-500 to-blue-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Add X Handle
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {handles.map(handle => (
                  <Card key={handle.id} className="hover:shadow-lg transition-all duration-200">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold">
                            {handle.screen_name.charAt(1)}
                          </div>
                          <div>
                            <h3 className="font-semibold">{handle.screen_name}</h3>
                            <p className="text-sm text-gray-500">{handle.handle_name}</p>
                          </div>
                        </div>
                        <Badge variant={handle.status === 'active' ? 'default' : 'secondary'} className={
                          handle.status === 'active' ? 'bg-green-100 text-green-800' : ''
                        }>
                          {handle.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-center mb-4">
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
                          <p className="text-sm text-gray-500">Posts</p>
                        </div>
                      </div>

                      {handle.last_sync && (
                        <p className="text-xs text-gray-400 text-center">
                          Last synced: {new Date(handle.last_sync).toLocaleDateString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {handles.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <Link className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-500 mb-2">No X handles connected</h3>
                    <p className="text-gray-400 mb-4">Connect your campaign X handles to start managing your social presence</p>
                    {(user.role === 'super_admin' || user.role === 'admin') && (
                      <Button onClick={() => setShowHandleModal(true)} className="bg-gradient-to-r from-blue-500 to-blue-600">
                        <Plus className="h-4 w-4 mr-2" />
                        Connect First X Handle
                      </Button>
                    )}
                  </div>
                )}
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
                    <span>Campaign Tweet Analytics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Enter Tweet ID for detailed campaign analytics"
                      value={analyticsId}
                      onChange={(e) => setAnalyticsId(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={getAnalytics} 
                      disabled={loading || !analyticsId.trim()}
                      className="min-w-[120px] bg-gradient-to-r from-purple-500 to-purple-600"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : 'Get Analytics'}
                    </Button>
                  </div>

                  {analytics && (
                    <div className="mt-6 p-6 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg border border-orange-200">
                      <h3 className="font-semibold mb-4 text-lg">Campaign Tweet Performance</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                          <Heart className="h-6 w-6 text-red-500 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-red-600">{analytics.likes}</p>
                          <p className="text-sm text-gray-600">Likes</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                          <Repeat className="h-6 w-6 text-green-500 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-green-600">{analytics.retweets}</p>
                          <p className="text-sm text-gray-600">Retweets</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                          <MessageSquare className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-blue-600">{analytics.replies}</p>
                          <p className="text-sm text-gray-600">Replies</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                          <TrendingUp className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-purple-600">{analytics.impressions || 0}</p>
                          <p className="text-sm text-gray-600">Impressions</p>
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-lg border">
                        <p className="text-sm text-gray-600 font-medium mb-2">Tweet Content:</p>
                        <p className="text-gray-800">{analytics.text}</p>
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
                  <span>Campaign Activity Log</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activities.length === 0 ? (
                    <div className="text-center py-12">
                      <Activity className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500 text-lg mb-2">No campaign activities yet</p>
                      <p className="text-gray-400">Your team's campaign actions will appear here</p>
                    </div>
                  ) : (
                    activities.slice(0, 20).map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full ${
                            activity.action.includes('tweet') ? 'bg-blue-100' : 
                            activity.action.includes('retweet') ? 'bg-green-100' : 
                            activity.action.includes('login') ? 'bg-purple-100' :
                            activity.action.includes('registered') ? 'bg-orange-100' :
                            'bg-gray-100'
                          }`}>
                            {activity.action.includes('tweet') ? (
                              <Send className="h-4 w-4 text-blue-600" />
                            ) : activity.action.includes('retweet') ? (
                              <Repeat className="h-4 w-4 text-green-600" />
                            ) : activity.action.includes('login') ? (
                              <LogOut className="h-4 w-4 text-purple-600" />
                            ) : activity.action.includes('registered') ? (
                              <UserPlus className="h-4 w-4 text-orange-600" />
                            ) : (
                              <Activity className="h-4 w-4 text-gray-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium capitalize">
                              {activity.action.replace('_', ' ')}
                            </p>
                            <p className="text-sm text-gray-500">
                              <span className="font-medium">{activity.user_name}</span>
                              {activity.handle_name && ` • ${activity.handle_name}`}
                              {' • '}
                              {new Date(activity.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {activity.tweet_id && (
                            <Badge variant="outline" className="text-xs">
                              ID: {activity.tweet_id}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Admin Panel Tab */}
          {(user.role === 'super_admin' || user.role === 'admin') && (
            <TabsContent value="admin">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Campaign Administration</h2>
                  <Button onClick={() => setShowUserModal(true)} className="bg-gradient-to-r from-blue-500 to-blue-600">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Team Member
                  </Button>
                </div>

                {/* Users Management */}
                <Card>
                  <CardHeader>
                    <CardTitle>Campaign Team Members</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {users.map(usr => (
                        <div key={usr.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
                                {usr.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{usr.name}</p>
                              <p className="text-sm text-gray-500">{usr.email}</p>
                              {usr.last_login && (
                                <p className="text-xs text-gray-400">
                                  Last login: {new Date(usr.last_login).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Badge className={`${getRoleColor(usr.role)} flex items-center space-x-1`}>
                              {getRoleIcon(usr.role)}
                              <span>{getRoleLabel(usr.role)}</span>
                            </Badge>
                            <div className="flex items-center space-x-1">
                              {usr.is_active ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span className="text-xs text-gray-500">
                                {usr.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedUser(usr)}
                                title="Edit team member"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {user.role === 'super_admin' && usr.id !== user.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (window.confirm(`Are you sure you want to remove ${usr.name} from the campaign team?`)) {
                                      deleteUser(usr.id);
                                    }
                                  }}
                                  title="Remove from team"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {users.length === 0 && (
                        <div className="text-center py-8">
                          <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-gray-500">No campaign team members yet</p>
                          <p className="text-sm text-gray-400">Add team members to get started</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Campaign Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Users className="h-5 w-5 text-orange-500" />
                        <div>
                          <p className="text-sm text-gray-600">Team Members</p>
                          <p className="text-xl font-bold">{users.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Link className="h-5 w-5 text-purple-500" />
                        <div>
                          <p className="text-sm text-gray-600">Connected X Handles</p>
                          <p className="text-xl font-bold">{handles.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Activity className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-sm text-gray-600">Recent Activities</p>
                          <p className="text-xl font-bold">{activities.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>

        {/* Message Alert */}
        {message && (
          <Alert className="mt-6 border-orange-200 bg-orange-50">
            <AlertDescription className="text-orange-800">{message}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Add Handle Modal - Twitter OAuth */}
      {showHandleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md bg-white">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Twitter className="h-5 w-5" />
                <span>Connect X/Twitter Account</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <Twitter className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Authorize X/Twitter Account</h3>
                  <p className="text-sm text-gray-600 mt-2">
                    You'll be redirected to X/Twitter to authorize this application to manage your account.
                  </p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg text-sm">
                  <div className="flex items-start space-x-2">
                    <Shield className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-blue-800">
                      <p className="font-medium">Secure OAuth Process</p>
                      <p>We only request the minimum permissions needed for posting and analytics.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button 
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const result = await apiCall('/handles/connect', {
                          method: 'POST'
                        });
                        
                        if (result.authorization_url) {
                          // Open Twitter OAuth in new window
                          window.open(result.authorization_url, 'twitter_oauth', 'width=600,height=600');
                          setMessage('🔄 Please complete authorization in the popup window...');
                        } else {
                          setMessage('⚠️ Twitter OAuth is configured but requires approved callback URL. Handle will be added with demo data.');
                          // Fallback to manual addition for demo
                          const demoHandle = {
                            handle_name: `demo_handle_${Date.now()}`,
                            screen_name: `@demo_${Date.now()}`,
                            twitter_id: `demo_${Date.now()}`,
                            followers_count: Math.floor(Math.random() * 1000),
                            following_count: Math.floor(Math.random() * 500),
                            tweets_count: Math.floor(Math.random() * 2000)
                          };
                          
                          await addHandle(demoHandle);
                        }
                        
                        setShowHandleModal(false);
                      } catch (error) {
                        if (error.message.includes('callback URL')) {
                          setMessage('⚠️ Twitter OAuth requires approved callback. Adding demo handle instead...');
                          
                          // Add demo handle when OAuth isn't fully configured
                          const demoHandle = {
                            handle_name: `demo_handle_${Date.now()}`,
                            screen_name: `@demo_${Date.now()}`,
                            twitter_id: `demo_${Date.now()}`,
                            followers_count: Math.floor(Math.random() * 1000),
                            following_count: Math.floor(Math.random() * 500),
                            tweets_count: Math.floor(Math.random() * 2000)
                          };
                          
                          await addHandle(demoHandle);
                          setShowHandleModal(false);
                        } else {
                          setMessage(`❌ Failed to initiate OAuth: ${error.message}`);
                        }
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Connecting...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Twitter className="h-4 w-4" />
                        <span>Connect with X/Twitter</span>
                      </div>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={() => setShowHandleModal(false)}
                    variant="outline"
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add User Modal - Team Management */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md bg-white">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5" />
                <span>Add Campaign Team Member</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={async (e) => {
                e.preventDefault();
                setLoading(true);
                
                try {
                  const formData = new FormData(e.target);
                  const userData = {
                    name: formData.get('name'),
                    email: formData.get('email'),
                    password: formData.get('password'),
                    role: formData.get('role')
                  };
                  
                  // Use the new team management endpoint
                  await apiCall('/team/members', {
                    method: 'POST',
                    body: JSON.stringify(userData)
                  });
                  
                  setMessage('✅ Team member added successfully!');
                  fetchUsers();
                  setShowUserModal(false);
                } catch (error) {
                  setMessage(`❌ Failed to add team member: ${error.message}`);
                } finally {
                  setLoading(false);
                }
              }} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Full Name</label>
                  <Input
                    name="name"
                    placeholder="e.g., Campaign Volunteer Name"
                    required
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <Input
                    name="email"
                    type="email"
                    placeholder="e.g., volunteer@withrg.org"
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Password</label>
                  <Input
                    name="password"
                    type="password"
                    placeholder="Temporary password (user should change)"
                    required
                    className="mt-1"
                    minLength="8"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Campaign Role</label>
                  <select
                    name="role"
                    required
                    className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="poster">Campaign Poster</option>
                    <option value="admin">Campaign Admin</option>
                    {user?.role === 'super_admin' && (
                      <option value="super_admin">Campaign Leader</option>
                    )}
                  </select>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg text-sm">
                  <div className="flex items-start space-x-2">
                    <Shield className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-blue-800">
                      <div className="font-medium">Role Permissions:</div>
                      <ul className="mt-1 text-xs space-y-1">
                        <li>• <strong>Campaign Poster:</strong> Post tweets, view assigned handles</li>
                        <li>• <strong>Campaign Admin:</strong> Manage users, assign handles, view analytics</li>
                        <li>• <strong>Campaign Leader:</strong> Full system access</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button 
                    type="button" 
                    onClick={() => setShowUserModal(false)} 
                    variant="outline" 
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600"
                    disabled={loading}
                  >
                    {loading ? 'Adding...' : 'Add Team Member'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Enhanced Edit User Modal with Handle Assignment */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Edit className="h-5 w-5" />
                <span>Manage Team Member</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const updates = {
                    name: formData.get('name'),
                    role: formData.get('role'),
                    is_active: formData.get('is_active') === 'on'
                  };
                  
                  updateUser(selectedUser.id, updates);
                  setSelectedUser(null);
                }} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Full Name</label>
                      <Input
                        name="name"
                        defaultValue={selectedUser.name}
                        required
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-700">Email</label>
                      <Input
                        value={selectedUser.email}
                        disabled
                        className="mt-1 bg-gray-100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Campaign Role</label>
                      <select
                        name="role"
                        defaultValue={selectedUser.role}
                        required
                        className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="poster">Campaign Poster</option>
                        <option value="admin">Campaign Admin</option>
                        {user?.role === 'super_admin' && (
                          <option value="super_admin">Campaign Leader</option>
                        )}
                      </select>
                    </div>

                    <div className="flex items-center space-x-2 mt-6">
                      <input
                        type="checkbox"
                        id="is_active"
                        name="is_active"
                        defaultChecked={selectedUser.is_active}
                        className="rounded"
                      />
                      <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                        Active team member
                      </label>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button 
                      type="submit" 
                      className="bg-gradient-to-r from-blue-500 to-blue-600"
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Update Member'}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Handle Assignment Section */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">X/Twitter Handle Access</h3>
                
                {/* Current Handles */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Currently Assigned Handles</label>
                  {selectedUser.handles && selectedUser.handles.length > 0 ? (
                    <div className="space-y-2">
                      {selectedUser.handles.map(handle => (
                        <div key={handle.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Twitter className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">{handle.screen_name}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (window.confirm(`Remove access to ${handle.screen_name}?`)) {
                                revokeHandleFromUser(selectedUser.id, handle.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                      No handles assigned yet
                    </div>
                  )}
                </div>

                {/* Available Handles */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Available Handles</label>
                  {handles.filter(handle => 
                    !selectedUser.handles?.some(userHandle => userHandle.id === handle.id)
                  ).length > 0 ? (
                    <div className="space-y-2">
                      {handles.filter(handle => 
                        !selectedUser.handles?.some(userHandle => userHandle.id === handle.id)
                      ).map(handle => (
                        <div key={handle.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Twitter className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">{handle.screen_name}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => assignHandleToUser(selectedUser.id, handle.id)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Assign
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                      All handles are already assigned to this member
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-4 border-t">
                <Button 
                  type="button" 
                  onClick={() => setSelectedUser(null)} 
                  variant="outline" 
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Offline Indicator */}
      {!navigator.onLine && (
        <div className="fixed bottom-4 left-4 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg">
          ⚡ You're offline - campaign data may be limited
        </div>
      )}
    </div>
  );
}

export default App;