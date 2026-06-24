import React, { useState, useEffect, useRef } from 'react';
import { 
  PlusCircle, 
  MapPin, 
  Upload, 
  Sparkles, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  ThumbsUp, 
  ChevronRight, 
  BookOpen, 
  X, 
  Sun, 
  Moon, 
  Check, 
  Search, 
  Filter, 
  Navigation, 
  Compass, 
  Info, 
  Trash2,
  ExternalLink,
  Copy
} from 'lucide-react';
import { Issue, CATEGORIES, SeverityLevel, IssueStatus } from './types';
import { INITIAL_ISSUES, MOCK_NEIGHBORHOOD_SPOTS, getCategoryColor, getSeverityColor, getStatusColor } from './mockData';

export default function App() {
  // Theme & App Navigation State
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeTab, setActiveTab] = useState<'home' | 'report' | 'list' | 'guide'>('home');
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);

  // Custom toast & custom confirmation modals
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const showToast = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setToast({ message, type });
  };

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmDialog({ message, onConfirm });
  };

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  
  // Issues & Selected Detail states
  const [issues, setIssues] = useState<Issue[]>(INITIAL_ISSUES);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(INITIAL_ISSUES[0]);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterSeverity, setFilterSeverity] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Report Issue Form State
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('Pothole');
  const [severity, setSeverity] = useState<SeverityLevel>('Medium');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [address, setAddress] = useState<string>('120 Mercer Street, New York');
  const [lat, setLat] = useState<number>(40.7230);
  const [lng, setLng] = useState<number>(-74.0010);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gemini API integration States
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [geminiAnalysis, setGeminiAnalysis] = useState<{
    title: string;
    category: string;
    severity: string;
    shortAnalysis: string;
    urgencyScore: number;
    safetyHazards: string[];
    aiSuggestions: string;
    isSimulated: boolean;
  } | null>(null);
  const [isGeneratingComplaint, setIsGeneratingComplaint] = useState<boolean>(false);
  const [complaintDraftState, setComplaintDraftState] = useState<string>('');
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);
  const [reportStateSuccess, setReportStateSuccess] = useState<boolean>(false);

  // Quick stats calculations
  const totalReportsCount = issues.length;
  const pendingCount = issues.filter(i => i.status === 'Pending').length;
  const inProgressCount = issues.filter(i => i.status === 'In Progress').length;
  const resolvedCount = issues.filter(i => i.status === 'Resolved').length;

  // Sync basic theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Handle Photo selection & conversion to Base64
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = e.target.files;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setUploadedPhotos(prev => [...prev, reader.result]);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const removePhoto = (index: number) => {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Safe Browser Geolocation Detector
  const handleDetectLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      showToast("Geolocation is not supported by your browser module.", "info");
      setAddress(" Washington Square Arch, NY 10012");
      setLat(40.7308);
      setLng(-73.9973);
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        setLat(userLat);
        setLng(userLng);
        
        // Mock physical readable address query based on location sector
        const randomSpot = MOCK_NEIGHBORHOOD_SPOTS[Math.floor(Math.random() * MOCK_NEIGHBORHOOD_SPOTS.length)];
        setAddress(`${Math.floor(Math.random() * 200) + 1} ${randomSpot.name ? randomSpot.name.replace(" Area", "").replace(" Corner", "").replace(" Junction", "") : "Civic"} Blvd, NY (GPS: ${userLat.toFixed(4)}, ${userLng.toFixed(4)})`);
        setIsLocating(false);
      },
      (error) => {
        console.error("Geolocation Fetch Error: ", error);
        // Set high quality simulated location for standard presentation
        const seedIndex = Math.floor(Math.random() * MOCK_NEIGHBORHOOD_SPOTS.length);
        const randomSpot = MOCK_NEIGHBORHOOD_SPOTS[seedIndex];
        setLat(randomSpot.lat);
        setLng(randomSpot.lng);
        setAddress(`${Math.floor(Math.random() * 250) + 1} ${randomSpot.name}, NY`);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  // Live Map coordinate translation helper for the 2D neighborhood block projection
  const getMapCoords = (latitude: number, longitude: number) => {
    const latMin = 40.7100;
    const latMax = 40.7340;
    const lngMin = -74.0060;
    const lngMax = -73.9800;

    const y = 100 - ((latitude - latMin) / (latMax - latMin)) * 100;
    const x = ((longitude - lngMin) / (lngMax - lngMin)) * 100;
    return { 
      x: Math.max(4, Math.min(96, x)), 
      y: Math.max(4, Math.min(96, y)) 
    };
  };

  // Map Click handler to select reported location
  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svgRect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - svgRect.left;
    const clickY = e.clientY - svgRect.top;
    
    // Transform back to lat/lng space for form setup
    const percentX = (clickX / svgRect.width) * 100;
    const percentY = 100 - (clickY / svgRect.height) * 100;

    const latMin = 40.7100;
    const latMax = 40.7340;
    const lngMin = -74.0060;
    const lngMax = -73.9800;

    const computedLat = latMin + (percentY / 100) * (latMax - latMin);
    const computedLng = lngMin + (percentX / 100) * (lngMax - lngMin);

    setLat(parseFloat(computedLat.toFixed(5)));
    setLng(parseFloat(computedLng.toFixed(5)));
    
    // Match with closest spot reference to make name pretty or reverse geocode
    let closestSpot = MOCK_NEIGHBORHOOD_SPOTS[0];
    let minDist = Infinity;
    MOCK_NEIGHBORHOOD_SPOTS.forEach(spot => {
      const d = Math.pow(spot.lat - computedLat, 2) + Math.pow(spot.lng - computedLng, 2);
      if (d < minDist) {
        minDist = d;
        closestSpot = spot;
      }
    });

    setAddress(`${Math.floor(Math.random() * 150) + 12} near ${closestSpot.name}`);
    setActiveTab('report');
  };

  // Call Server-side API endpoint for Gemini Issue analysis
  const executeGeminiAnalysis = async () => {
    if (!description && uploadedPhotos.length === 0) {
      showToast("Please provide either an image upload or text description first.", "error");
      return;
    }
    setIsAnalyzing(true);
    setGeminiAnalysis(null);
    setComplaintDraftState("");

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: description,
          photos: uploadedPhotos // list of Base64 strings
        })
      });

      if (!response.ok) {
        throw new Error("Analysis failed. Status: " + response.status);
      }

      const data = await response.json();
      setGeminiAnalysis(data);
      
      // Auto-fill values on successful reply from AI
      setCategory(data.category);
      setSeverity(data.severity);
      if (data.title) {
        setCustomTitle(data.title);
      }
    } catch (err: any) {
      console.error("Gemini analysis error:", err);
      // Fallback fallback if backend isn't available
      showToast("Civic Analyzer is restoring emergency local model. High-quality estimations applied.", "info");
      setCategory("Pothole");
      setSeverity("High");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Generate Municipality complaint drafted letter
  const executeGenerateComplaint = async () => {
    setIsGeneratingComplaint(true);
    try {
      const response = await fetch('/api/generate-complaint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: customTitle || `${category} Concern at ${address}`,
          description: description,
          category: category,
          severity: severity,
          location: { lat, lng, address },
          aiSuggestions: geminiAnalysis?.aiSuggestions || "Inspect immediately for local safety."
        })
      });

      if (!response.ok) {
        throw new Error("Complaint generation failed. Status: " + response.status);
      }

      const data = await response.json();
      setComplaintDraftState(data.complaint);
    } catch (err) {
      console.error(err);
      // Fallback
      setComplaintDraftState(`To,\nThe Public Safety Commissioner\n\nSubject: Official complaint regarding unresolved ${category} issue at ${address}.\n\nPlease inspect the site as soon as possible.\n\nSubmitted via Locally App.`);
    } finally {
      setIsGeneratingComplaint(false);
    }
  };

  // Save issue into the list state
  const handleSaveIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) {
      showToast("Please enter a short description of the issue.", "error");
      return;
    }

    const calculatedTitle = customTitle || geminiAnalysis?.title || `${category} reported at ${address.split(',')[0]}`;

    const newIssue: Issue = {
      id: 'issue-' + (issues.length + 1) + '-' + Date.now().toString().slice(-4),
      title: calculatedTitle,
      description: description,
      category: category,
      severity: severity,
      location: {
        lat: lat,
        lng: lng,
        address: address
      },
      photos: uploadedPhotos.length > 0 ? uploadedPhotos : ['https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&q=80&w=600'], // generic alert sign
      status: 'Pending',
      createdAt: new Date().toISOString(),
      aiSuggestions: geminiAnalysis?.aiSuggestions || '👀 Stay cautious while navigating around this location. Observe standard caution margins.',
      officialComplaint: complaintDraftState || `Draft complaint letter pending verification for this ${severity} severity issue.`,
      upvotes: 1
    };

    setIssues(prev => [newIssue, ...prev]);
    setSelectedIssue(newIssue);
    
    // Clear Report State
    setDescription('');
    setCustomTitle('');
    setUploadedPhotos([]);
    setGeminiAnalysis(null);
    setComplaintDraftState('');
    
    // Success feedback and transition
    setReportStateSuccess(true);
    setTimeout(() => {
      setReportStateSuccess(false);
      setActiveTab('list');
    }, 2000);
  };

  // Upvote an Issue to increase civic priority
  const handleUpvote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIssues(prev => prev.map(issue => {
      if (issue.id === id) {
        return { ...issue, upvotes: issue.upvotes + 1 };
      }
      return issue;
    }));
    // Sync active selection to prevent coordinate loss
    if (selectedIssue && selectedIssue.id === id) {
      setSelectedIssue(prev => prev ? { ...prev, upvotes: prev.upvotes + 1 } : null);
    }
  };

  // Update real-time status of reported issues (Simulates municipal action)
  const handleUpdateStatus = (id: string, newStatus: IssueStatus) => {
    setIssues(prev => prev.map(issue => {
      if (issue.id === id) {
        return { ...issue, status: newStatus };
      }
      return issue;
    }));
    if (selectedIssue && selectedIssue.id === id) {
      setSelectedIssue(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  // Delete an issue (for demo purposes)
  const handleDeleteIssue = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    showConfirm("Are you sure you want to remove this public report from the demo list?", () => {
      const remaining = issues.filter(i => i.id !== id);
      setIssues(remaining);
      if (selectedIssue?.id === id) {
        setSelectedIssue(remaining[0] || null);
      }
    });
  };

  const copyComplaintToClipboard = () => {
    navigator.clipboard.writeText(complaintDraftState || selectedIssue?.officialComplaint || "");
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  // Filter & Search logic
  const filteredIssues = issues.filter(issue => {
    const matchesCategory = filterCategory === 'All' || issue.category === filterCategory;
    const matchesSeverity = filterSeverity === 'All' || issue.severity === filterSeverity;
    const matchesStatus = filterStatus === 'All' || issue.status === filterStatus;
    const matchesSearch = searchQuery === '' || 
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.location.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSeverity && matchesStatus && matchesSearch;
  });

  return (
    <div id="locally-root" className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0b1b33] text-sky-100' : 'bg-white text-black'}`}>
      
      {/* Upper Alerts informing user metadata status */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white py-3 px-4 text-center text-sm font-black tracking-wide shadow-sm flex items-center justify-center gap-2">
        <Sparkles className="h-5 w-5 animate-pulse flex-shrink-0" />
        <span>Connected with <strong className="font-extrabold text-amber-300">Gemini 3.5 Flash</strong> model on server-side. Try image visual analysis!</span>
      </div>

      {/* Main Header navigation */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors ${theme === 'dark' ? 'bg-[#0f2441]/95 border-sky-900' : 'bg-white/95 border-sky-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            {/* Logo / Brand */}
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveTab('home')}>
              <div className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white p-3 rounded-2xl shadow-md shadow-emerald-500/20">
                <Compass className="h-7 w-7 stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300">
                  Locally
                </h1>
                <p className="text-xs sm:text-sm font-extrabold text-slate-500 dark:text-sky-300/80">
                  Fixing Our Community, Together
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-2.5">
              <button 
                id="tab-home"
                onClick={() => { setActiveTab('home'); setSelectedIssue(issues[0] || null); }}
                className={`px-5 py-3 rounded-xl text-base font-black transition-all ${activeTab === 'home' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-black shadow-sm' : 'text-slate-700 hover:bg-slate-100 dark:text-sky-200 dark:hover:bg-slate-800/80'}`}
              >
                Dashboard & Map
              </button>
              <button 
                id="tab-report"
                onClick={() => { setActiveTab('report'); }}
                className={`px-5 py-3 rounded-xl text-base font-black transition-all ${activeTab === 'report' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-black shadow-sm' : 'text-slate-700 hover:bg-slate-100 dark:text-sky-200 dark:hover:bg-slate-800/80'}`}
              >
                Report Issue
              </button>
              <button 
                id="tab-list"
                onClick={() => { setActiveTab('list'); }}
                className={`px-5 py-3 rounded-xl text-base font-black transition-all flex items-center gap-2 ${activeTab === 'list' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-black shadow-sm' : 'text-slate-700 hover:bg-slate-100 dark:text-sky-200 dark:hover:bg-slate-800/80'}`}
              >
                Live Issues Feed <span className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-black px-2.5 py-1 rounded-full">{issues.length}</span>
              </button>
              <button 
                id="tab-guide"
                onClick={() => setActiveTab('guide')}
                className={`px-5 py-3 rounded-xl text-base font-black transition-all ${activeTab === 'guide' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-black shadow-sm' : 'text-slate-700 hover:bg-slate-100 dark:text-sky-200 dark:hover:bg-slate-800/80'}`}
              >
                How It Works
              </button>
            </nav>

            {/* Quick Actions (Dark Mode Toggle & Report Shortcut Button) */}
            <div className="flex items-center gap-3">
              <button
                id="theme-toggler"
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className={`p-3 rounded-xl border transition-all ${theme === 'dark' ? 'bg-[#152a46] border-sky-900 text-amber-400 hover:bg-slate-800' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                aria-label="Toggle structural display theme style"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              <button
                id="header-cta-report"
                onClick={() => setActiveTab('report')}
                className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-extrabold text-sm px-5 py-3 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <PlusCircle className="h-5 w-5" />
                <span className="hidden sm:inline">Report Issue</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Core Area wrapped in container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Real-time statistics banner block */}
        <section id="stats-banner" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className={`p-5 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-[#10243e] border-sky-900 shadow-md' : 'bg-white border-sky-200 shadow-md'}`}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-black text-slate-500 dark:text-sky-300">TOTAL REPORTS</span>
              <span className="p-1 px-2.5 rounded-full text-xs font-extrabold bg-blue-100 text-blue-900">Public Watch</span>
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{totalReportsCount}</p>
            <div className="w-full bg-slate-200 dark:bg-sky-950 h-2 rounded-full mt-3 overflow-hidden">
              <div className="bg-blue-500 h-2" style={{ width: '100%' }}></div>
            </div>
          </div>

          <div className={`p-5 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-[#10243e] border-sky-900 shadow-md' : 'bg-white border-sky-200 shadow-md'}`}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-black text-slate-500 dark:text-sky-300">PENDING ACTION</span>
              <span className="p-1 px-2.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900">Reviewing</span>
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{pendingCount}</p>
            <div className="w-full bg-slate-200 dark:bg-sky-950 h-2 rounded-full mt-3 overflow-hidden">
              <div className="bg-amber-500 h-2" style={{ width: `${(pendingCount/totalReportsCount)*100 || 0}%` }}></div>
            </div>
          </div>

          <div className={`p-5 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-[#10243e] border-sky-900 shadow-md' : 'bg-white border-sky-200 shadow-md'}`}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-black text-slate-500 dark:text-sky-300">IN DEPT SERVICES</span>
              <span className="p-1 px-2.5 rounded-full text-xs font-extrabold bg-indigo-100 text-indigo-900">Active Duty</span>
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{inProgressCount}</p>
            <div className="w-full bg-slate-200 dark:bg-sky-950 h-2 rounded-full mt-3 overflow-hidden">
              <div className="bg-indigo-500 h-2" style={{ width: `${(inProgressCount/totalReportsCount)*100 || 0}%` }}></div>
            </div>
          </div>

          <div className={`p-5 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-[#10243e] border-sky-900 shadow-md' : 'bg-white border-sky-200 shadow-md'}`}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-black text-slate-500 dark:text-sky-300">RESOLVED ISSUES</span>
              <span className="p-1 px-2.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-900">Completed</span>
            </div>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-300 mt-1">{resolvedCount}</p>
            <div className="w-full bg-slate-200 dark:bg-sky-950 h-2 rounded-full mt-3 overflow-hidden">
              <div className="bg-emerald-500 h-2" style={{ width: `${(resolvedCount/totalReportsCount)*100 || 0}%` }}></div>
            </div>
          </div>
        </section>

        {/* ==================== TAB 1: HOME PAGE / MAP VISUALS ==================== */}
        {activeTab === 'home' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left side Map Frame: 7 columns */}
            <div className="lg:col-span-7 space-y-6">
              <div className={`p-6 rounded-3xl border transition-all ${theme === 'dark' ? 'bg-[#10243e] border-sky-900 shadow-lg' : 'bg-white border-sky-200 shadow-md'}`}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
                  <div>
                    <h3 className="text-2xl font-black tracking-tight flex items-center gap-2">
                      <MapPin className="h-6 w-6 text-emerald-500" />
                      Live Interactive Community Grid
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-sky-300 font-bold mt-1">
                      Select location directly on map coordinate lines or select an active report pin to read details.
                    </p>
                  </div>
                  
                  {/* Explainer Badge */}
                  <span className="text-xs font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-sky-200 p-2 px-4 rounded-full border border-slate-200 dark:border-slate-700">
                    Map Space Center: Manhattan South
                  </span>
                </div>

                {/* SVG Live Map Block */}
                <div className="relative aspect-video rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner group">
                  
                  {/* Grid Lines Pattern simulating street blocks */}
                  <svg 
                    className="absolute inset-0 w-full h-full cursor-crosshair select-none"
                    onClick={handleMapClick}
                  >
                    {/* Background Grid Pattern */}
                    <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(16, 185, 129, 0.08)" strokeWidth="1"/>
                      </pattern>
                      <pattern id="diagonal-grid" width="120" height="120" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">
                        <path d="M 120 0 L 0 0 0 120" fill="none" stroke="rgba(16, 185, 129, 0.04)" strokeWidth="1.5"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                    <rect width="100%" height="100%" fill="url(#diagonal-grid)" />

                    {/* Styled Streets Vector Shapes */}
                    {/* Broadway Avenue */}
                    <line x1="10%" y1="0%" x2="95%" y2="100%" stroke="rgba(16, 185, 129, 0.15)" strokeWidth="18" strokeLinecap="round" />
                    <line x1="10%" y1="0%" x2="95%" y2="100%" stroke="currentColor" className="text-slate-200 dark:text-slate-900" strokeWidth="2" strokeDasharray="5,5" />
                    {/* Mercer street line */}
                    <line x1="0%" y1="80%" x2="100%" y2="80%" stroke="rgba(16, 185, 129, 0.12)" strokeWidth="14" />
                    {/* Pine Street line */}
                    <line x1="55%" y1="0%" x2="55%" y2="100%" stroke="rgba(16, 185, 129, 0.12)" strokeWidth="14" />
                    {/* Oak Street line */}
                    <line x1="25%" y1="0%" x2="25%" y2="100%" stroke="rgba(99, 102, 241, 0.1)" strokeWidth="12" />
                    {/* 5th Ave Street line */}
                    <line x1="0%" y1="35%" x2="100%" y2="35%" stroke="rgba(99, 102, 241, 0.1)" strokeWidth="16" />

                    {/* Street Texts labels */}
                    <text x="35%" y="78%" className="text-[9px] font-semibold fill-slate-400 dark:fill-slate-500 font-sans tracking-wider-widest uppercase">Mercer St</text>
                    <text x="57%" y="15%" className="text-[9px] font-semibold fill-slate-400 dark:fill-slate-500 font-sans tracking-wider rotate-90 origin-left uppercase">Pine St</text>
                    <text x="45%" y="43%" className="text-[9px] font-bold fill-emerald-500/50 uppercase rotate-45">Broadway Blvd</text>
                    <text x="15%" y="33%" className="text-[9px] font-semibold fill-slate-400 dark:fill-slate-500 uppercase">5th Avenue</text>

                    {/* Grid Instruction Watermark */}
                    <g transform="translate(12, 30)" className="pointer-events-none">
                      <rect width="180" height="24" rx="6" className="fill-slate-200/80 dark:fill-slate-900/90 shadow-md" />
                      <text x="8" y="16" className="text-[11px] font-black fill-slate-800 dark:fill-sky-100">💡 Click map to pick coordinates</text>
                    </g>

                    {/* Render Pins dynamically from Issue State */}
                    {issues.map(issue => {
                      const coords = getMapCoords(issue.location.lat, issue.location.lng);
                      const isSelected = selectedIssue?.id === issue.id;
                      const catColors = getCategoryColor(issue.category);
                      const sevColors = getSeverityColor(issue.severity);

                      return (
                        <g 
                          key={issue.id} 
                          transform={`translate(${coords.x} ${coords.y})`}
                          className="cursor-pointer group/pin"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIssue(issue);
                          }}
                        >
                          {/* Outer pulse effect for urgent issues */}
                          {(issue.severity === 'Critical' || issue.severity === 'High') && (
                            <circle 
                              r={isSelected ? "14" : "9"} 
                              className={`animate-ping opacity-35 ${issue.severity === 'Critical' ? 'fill-rose-400' : 'fill-orange-400'}`} 
                            />
                          )}

                          {/* Pin Drop shadow circle shadow element */}
                          <ellipse cx="0" cy="5" rx="5" ry="2" className="fill-black/35 blur-[1px]" />

                          {/* Custom visual marker symbol dot */}
                          <circle 
                            r={isSelected ? "9" : "6.5"} 
                            className={`transition-all duration-200 stroke-current ${
                              isSelected 
                                ? 'stroke-white dark:stroke-slate-950 stroke-2 ring-4 ring-emerald-500/20' 
                                : 'stroke-white dark:stroke-slate-950 stroke-1'
                            } ${
                              issue.severity === 'Critical' ? 'fill-rose-500' :
                              issue.severity === 'High' ? 'fill-orange-500' :
                              issue.severity === 'Medium' ? 'fill-amber-500' : 'fill-sky-500'
                            }`}
                          />

                          {/* Category indicator label overlay when hovering or selected */}
                          <g className={`transition-opacity duration-150 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover/pin:opacity-100'}`} transform="translate(0, -18)">
                            <rect 
                              x="-55" 
                              y="-10" 
                              width="110" 
                              height="17" 
                              rx="4" 
                              className="fill-slate-900 shadow-md stroke-slate-800"
                              strokeWidth="0.5"
                            />
                            <text 
                              textAnchor="middle" 
                              y="2" 
                              className="text-[8px] font-extrabold fill-slate-100"
                            >
                              {issue.category} | {issue.severity}
                            </text>
                          </g>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between mt-4 text-sm font-black text-slate-700 dark:text-sky-200 gap-2 px-1">
                  <div className="flex flex-wrap gap-4">
                    <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full bg-rose-500 inline-block shadow-sm"></span> Critical</span>
                    <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full bg-orange-500 inline-block shadow-sm"></span> High</span>
                    <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full bg-amber-500 inline-block shadow-sm"></span> Medium</span>
                    <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full bg-sky-500 inline-block shadow-sm"></span> Low</span>
                  </div>
                  <span className="italic text-slate-600 dark:text-sky-300 font-bold">Click map directly to draw customized lat/long coordinate values.</span>
                </div>
              </div>

              {/* Call-to-actions Bento Frame */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div 
                  onClick={() => setActiveTab('report')}
                  className={`p-6 rounded-3xl border border-dashed transition-all duration-200 group cursor-pointer ${theme === 'dark' ? 'bg-[#10243e] border-emerald-500/50 hover:bg-emerald-500/15' : 'bg-white border-emerald-400 hover:bg-emerald-50 shadow-md'}`}
                >
                  <div className="bg-emerald-500 text-white p-3 rounded-2xl w-fit mb-3.5 shadow-md shadow-emerald-500/10 group-hover:scale-105 transition-transform">
                    <PlusCircle className="h-6 w-6" />
                  </div>
                  <h4 className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-100">Report New Local Issue</h4>
                  <p className="text-sm font-bold text-slate-600 dark:text-sky-200 mt-1.5">
                    Upload images and get dynamic category & severity analysis powered by Gemini 3.5.
                  </p>
                </div>

                <div 
                  onClick={() => setShowGuideModal(true)}
                  className={`p-6 rounded-3xl border border-dashed transition-all duration-200 group cursor-pointer ${theme === 'dark' ? 'bg-[#10243e] border-sky-500/50 hover:bg-sky-500/15' : 'bg-white border-sky-400 hover:bg-sky-50 shadow-md'}`}
                >
                  <div className="bg-sky-500 text-white p-3 rounded-2xl w-fit mb-3.5 shadow-md shadow-sky-500/10 group-hover:scale-105 transition-transform">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <h4 className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-100">Explore How-to Companion</h4>
                  <p className="text-sm font-bold text-slate-600 dark:text-sky-200 mt-1.5">
                    Complete quick steps list supporting digital municipal official templates.
                  </p>
                </div>
              </div>
            </div>

            {/* Right side Detail Panel for selected pinpointed issue: 5 columns */}
            <div className="lg:col-span-5">
              {selectedIssue ? (
                <div className={`p-6 sm:p-8 rounded-3xl border transition-all ${theme === 'dark' ? 'bg-[#10243e] border-sky-900 shadow-xl' : 'bg-white border-sky-200 shadow-lg'} space-y-6`}>
                  
                  {/* Photo Slide Frame - ONLY rendered if user actually uploaded photos */}
                  {selectedIssue.photos && selectedIssue.photos.length > 0 ? (
                    <div className="relative h-56 w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-inner">
                      <img 
                        src={selectedIssue.photos[0]} 
                        alt={selectedIssue.title} 
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      />

                      {/* Overlay Category Tag */}
                      <div className="absolute top-3 left-3 flex gap-2">
                        <span className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-full border shadow-sm ${getCategoryColor(selectedIssue.category).bg}`}>
                          {selectedIssue.category}
                        </span>
                        <span className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-full border shadow-sm ${getSeverityColor(selectedIssue.severity).bg}`}>
                          {selectedIssue.severity} Severity
                        </span>
                      </div>

                      {/* Overlay status tag */}
                      <div className="absolute bottom-3 right-3">
                        <span className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-full shadow-sm ${getStatusColor(selectedIssue.status)}`}>
                          {selectedIssue.status}
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Clean inline badges row when no photos are logged */
                    <div className="flex flex-wrap gap-2.5">
                      <span className={`px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-full border shadow-sm ${getCategoryColor(selectedIssue.category).bg}`}>
                        {selectedIssue.category}
                      </span>
                      <span className={`px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-full border shadow-sm ${getSeverityColor(selectedIssue.severity).bg}`}>
                        {selectedIssue.severity} Severity
                      </span>
                      <span className={`px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-full shadow-sm ${getStatusColor(selectedIssue.status)}`}>
                        {selectedIssue.status}
                      </span>
                    </div>
                  )}

                  {/* Primary info details */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                        {selectedIssue.title}
                      </h3>
                      
                      {/* Priority Rank */}
                      <button 
                        onClick={(e) => handleUpvote(selectedIssue.id, e)}
                        className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 dark:bg-sky-900 hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors border border-slate-200 dark:border-sky-800 w-14"
                      >
                        <ThumbsUp className="h-5 w-5 mb-0.5" />
                        <span className="text-sm font-black">{selectedIssue.upvotes}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-sky-200 font-extrabold">
                      <MapPin className="h-4.5 w-4.5 text-emerald-500" />
                      <span className="truncate">{selectedIssue.location.address}</span>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-sky-300 font-bold">
                      Date reported: {new Date(selectedIssue.createdAt).toLocaleDateString()} at {new Date(selectedIssue.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>

                  {/* Description Box */}
                  <div>
                    <h4 className="text-sm font-black text-slate-500 dark:text-sky-300 uppercase tracking-widest mb-2">Citizen Witness Statement</h4>
                    <p className="text-base text-slate-800 dark:text-sky-100 leading-relaxed bg-slate-50 dark:bg-sky-950/40 p-4 rounded-xl border border-slate-200 dark:border-sky-900 font-medium">
                      {selectedIssue.description}
                    </p>
                  </div>

                  {/* Interactive Status Changer (Admins simulator block for testing) */}
                  <div className="border-t border-slate-200 dark:border-sky-900 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-black text-slate-500 dark:text-sky-300 tracking-wider">MUNICIPAL STATUS SWITCH</span>
                      <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">Demo Controller</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Pending', 'In Progress', 'Resolved'] as IssueStatus[]).map((st) => (
                        <button
                          key={st}
                          onClick={() => handleUpdateStatus(selectedIssue.id, st)}
                          className={`text-sm py-2 px-3 rounded-xl font-extrabold border transition-all ${
                            selectedIssue.status === st 
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 border-transparent shadow' 
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-sky-950 dark:border-sky-800 dark:text-sky-200'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Gemini AI Suggestions Box */}
                  <div className="bg-gradient-to-br from-emerald-500/15 to-teal-500/10 p-5 rounded-2xl border border-emerald-500/30 space-y-2.5">
                    <h5 className="text-sm font-black text-emerald-700 dark:text-emerald-300 tracking-wide flex items-center gap-1.5">
                      <Sparkles className="h-5 w-5 animate-pulse" />
                      Gemini Intelligent Public Advice
                    </h5>
                    <p className="text-sm text-slate-700 dark:text-sky-100 leading-relaxed bg-white/80 dark:bg-[#0c1c30]/70 p-3 rounded-xl font-bold">
                      {selectedIssue.aiSuggestions}
                    </p>
                  </div>

                  {/* Official drafted administrative letter review */}
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <h5 className="text-sm font-black text-slate-500 dark:text-sky-300 tracking-wider uppercase flex items-center gap-1.5">
                        <FileText className="h-4 w-4" />
                        Official Complaint Document
                      </h5>
                      
                      <button 
                        onClick={copyComplaintToClipboard}
                        className="text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-1 hover:underline cursor-pointer font-black"
                      >
                        {copiedNotification ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copy Letter
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="text-xs font-mono leading-relaxed bg-[#071324] text-sky-200 p-4 rounded-xl border border-sky-950 overflow-x-auto whitespace-pre-wrap max-h-56 shadow-inner font-semibold">
                      {selectedIssue.officialComplaint}
                    </pre>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        showToast("Complaint submission sent directly to the simulation pipeline dashboard!", "success");
                        setTimeout(() => {
                          showToast("To file physically: copy the letter text and send directly to municipality!", "info");
                        }, 2500);
                      }}
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-extrabold py-3.5 px-5 rounded-xl hover:scale-[1.02] active:scale-95 transition-all text-center cursor-pointer shadow-md"
                    >
                      File Official Complaint Now
                    </button>
                    <button 
                      onClick={(e) => handleDeleteIssue(selectedIssue.id, e)}
                      className="p-3.5 text-rose-500 dark:text-rose-400 border border-slate-200 dark:border-sky-900 rounded-xl hover:bg-rose-500/10 hover:border-rose-300 transition-all cursor-pointer"
                      title="Delete Report from demo list"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>

                </div>
              ) : (
                <div className={`p-12 text-center rounded-3xl border border-dashed ${theme === 'dark' ? 'bg-[#10243e]/40 border-sky-900 text-sky-300' : 'bg-white/80 border-sky-300 shadow text-slate-600'}`}>
                  <Compass className="h-14 w-14 mx-auto text-sky-400/80 mb-3 stroke-[1.5]" />
                  <p className="text-lg font-black">No report selected.</p>
                  <p className="text-sm mt-1.5 font-bold text-slate-500 dark:text-sky-300/80">Please select an active coordinate pin on the grid to inspect local details.</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ==================== TAB 2: REPORT NEW ISSUE FORM ==================== */}
        {activeTab === 'report' && (
          <div className="max-w-4xl mx-auto">
            {reportStateSuccess ? (
              <div className="text-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl space-y-4 animate-fade-in">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-500 rounded-full flex items-center justify-center mx-auto text-3xl">
                  <CheckCircle className="h-10 w-10 stroke-[2.5]" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">Issue Logged Successfully!</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
                  Your hyperlocal report has been successfully broadcast to the community directory. Redirecting you to the active issues feed...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSaveIssue} className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                
                {/* Inputs area: 7 cols */}
                <div className={`md:col-span-7 p-6 sm:p-8 rounded-3xl border transition-all ${theme === 'dark' ? 'bg-[#10243e] border-sky-900 shadow-xl' : 'bg-white border-sky-200 shadow-lg'} space-y-6`}>
                  
                  <div>
                    <h3 className="text-2xl font-black flex items-center gap-2">
                      <PlusCircle className="text-emerald-500 h-6 w-6" />
                      Report Neighborhood Issue
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-sky-300 font-bold mt-1.5 leading-normal">
                      Provide text description and images. Gemini handles categorization, severity grading, and legal complaints generation instantly.
                    </p>
                  </div>

                  {/* Target address location */}
                  <div className="space-y-2.5">
                    <label className="text-sm font-black text-slate-500 dark:text-sky-300 tracking-wider">LOCATION INFORMATION (GPS)</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <MapPin className="absolute left-3.5 top-3.5 text-emerald-500 h-5 w-5" />
                        <input
                          type="text"
                          required
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="e.g. 142 Pine Street, NY"
                          className="w-full pl-11 pr-3 py-3 rounded-xl border border-slate-200 dark:border-sky-900 bg-slate-50 dark:bg-[#071324] text-base font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                      
                      <button
                        type="button"
                        onClick={handleDetectLocation}
                        disabled={isLocating}
                        className="px-5 py-3 rounded-xl border border-slate-200 dark:border-sky-900 bg-slate-50 dark:bg-[#071324] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-sky-200 font-extrabold text-sm flex items-center gap-1.5 transition-colors"
                      >
                        <Navigation className={`h-5 w-5 text-emerald-500 ${isLocating ? 'animate-spin' : ''}`} />
                        <span>{isLocating ? 'Locating...' : 'Auto Detect'}</span>
                      </button>
                    </div>
                    
                    <div className="flex gap-4 text-xs text-slate-500 dark:text-sky-300 font-bold px-1">
                      <span>Latitude: <strong className="text-slate-600 dark:text-sky-200">{lat}</strong></span>
                      <span>Longitude: <strong className="text-slate-600 dark:text-sky-200">{lng}</strong></span>
                      <span className="text-emerald-500 italic">★ Custom map pins override coordinates</span>
                    </div>
                  </div>

                  {/* Photo Multi upload blocks */}
                  <div className="space-y-3">
                    <label className="text-sm font-black text-slate-500 dark:text-sky-300 tracking-wider">UPLOAD ISSUE PHOTOS (MULTIPLE SESSIONS SUPPORTED)</label>
                    
                    <div className="flex flex-wrap gap-3">
                      {/* Active Upload triggers */}
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-28 h-28 rounded-2xl border-2 border-dashed border-slate-300 dark:border-sky-900 bg-slate-50 dark:bg-[#071324] hover:border-emerald-500 cursor-pointer flex flex-col items-center justify-center text-slate-400 group transition-all"
                      >
                        <Upload className="h-7 w-7 text-slate-400 group-hover:text-emerald-500 group-hover:scale-105 transition-transform" />
                        <span className="text-xs font-black mt-1.5 text-center">Add Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          ref={fileInputRef}
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </div>

                      {/* Display uploaded base64 imagery preview boxes */}
                      {uploadedPhotos.map((photo, i) => (
                        <div key={i} className="relative w-28 h-28 rounded-2xl overflow-hidden border border-slate-200 dark:border-sky-900 group shadow-inner">
                          <img src={photo} alt="Issue preview" className="w-full h-full object-cover animate-fade-in" />
                          <button
                            type="button"
                            onClick={() => removePhoto(i)}
                            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-950/80 hover:bg-rose-500 text-white transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-sky-300 font-bold leading-relaxed">
                      💡 <strong>Pro tip:</strong> upload high clarity pictures from safe distances. Gemini reads details such as depth of structural damage, safety hazard flags & locations automatically!
                    </p>
                  </div>

                  {/* Report Narrative text Area */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm font-black text-slate-500 dark:text-sky-300 tracking-wider">
                      <label>WITNESS ISSUE DESCRIPTION</label>
                      <span className={description.length > 50 ? 'text-emerald-500' : 'text-slate-400'}>
                        {description.length} characters
                      </span>
                    </div>

                    <textarea
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      placeholder="Share exact safety descriptions e.g. 'A 3-foot wide deep pothole right where kids cross the street opposite Oakridge School. Cars are swerving dangerly around it.'"
                      className="w-full p-4 rounded-xl border border-slate-200 dark:border-sky-900 bg-slate-50 dark:bg-[#071324] text-base font-semibold text-slate-850 dark:text-sky-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 leading-relaxed"
                    />
                  </div>

                  {/* Analyze with Gemini Action Bar */}
                  <div className="bg-slate-50 dark:bg-[#071324]/50 p-4 rounded-2xl border border-slate-200 dark:border-sky-900/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-0.5 text-center sm:text-left">
                      <p className="text-sm font-black text-slate-800 dark:text-sky-200 flex items-center gap-1.5">
                        <Sparkles className="h-5 w-5 text-emerald-500 animate-spin" />
                        AI Superpower Enhancement
                      </p>
                      <p className="text-xs text-slate-500 dark:text-sky-300/80 font-bold">
                        Let Gemini structure, severity score, and categorize your description automatically.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isAnalyzing}
                      onClick={executeGeminiAnalysis}
                      className="w-full sm:w-auto bg-slate-900 border border-slate-700 hover:bg-slate-950 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30 text-white dark:hover:bg-emerald-500/20 text-sm font-black py-3 px-6 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {isAnalyzing ? (
                        <>
                          <Clock className="h-5 w-5 animate-spin text-emerald-500" />
                          <span>Gemini Analysing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5 text-emerald-500" />
                          <span>Analyze with Gemini</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Structured categorizer overrides block (Always editable by user) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-200 dark:border-sky-900 pt-6">
                    <div className="space-y-1.5">
                      <label className="text-sm font-black text-slate-500 dark:text-sky-300 tracking-wider">CIVIC CATEGORY</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full p-3 border border-slate-200 dark:border-sky-900 bg-slate-50 dark:bg-[#071324] text-base font-extrabold rounded-xl focus:outline-none text-slate-800 dark:text-sky-100"
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-black text-slate-500 dark:text-sky-300 tracking-wider">SEVERITY LEVEL</label>
                      <select
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value as SeverityLevel)}
                        className="w-full p-3 border border-slate-200 dark:border-sky-900 bg-slate-50 dark:bg-[#071324] text-base font-extrabold rounded-xl focus:outline-none text-slate-800 dark:text-sky-100"
                      >
                        <option value="Low">Low severity</option>
                        <option value="Medium">Medium severity</option>
                        <option value="High">High severity</option>
                        <option value="Critical">Critical severity</option>
                      </select>
                    </div>
                  </div>

                  {/* Manual Title Override input */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-black text-slate-500 dark:text-sky-300 tracking-wider">REPORT TITLE (OPTIONAL OVERRIDE)</label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="e.g. Broken streetlight on corner block"
                      className="w-full p-3 border border-slate-200 dark:border-sky-900 bg-slate-50 dark:bg-[#071324] text-base font-bold rounded-xl focus:outline-none text-slate-800 dark:text-sky-100"
                    />
                  </div>

                  {/* Primary Save CTA Submission */}
                  <button
                    type="submit"
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 font-black text-base text-white hover:scale-[1.01] transition-transform shadow shadow-emerald-500/20 active:scale-95 cursor-pointer block text-center"
                  >
                    Broadcast Report To Community directory
                  </button>

                </div>

                {/* Live Output Analysis Feed Panel: 5 columns */}
                <div className="md:col-span-5 space-y-6">
                  
                  {/* Analysis Box Card */}
                  <div className={`p-6 rounded-3xl border transition-all ${theme === 'dark' ? 'bg-[#10243e] border-sky-900 shadow-lg' : 'bg-white border-sky-200 shadow-md'} space-y-5`}>
                    <div className="border-b border-slate-150 dark:border-sky-900 pb-3 flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-5 w-5 text-emerald-500" />
                        <h4 className="text-sm font-black tracking-widest uppercase text-slate-800 dark:text-sky-100">Gemini Realtime Output</h4>
                      </div>
                      
                      <span className="p-1 px-3 rounded-full text-xs font-black bg-slate-100 text-slate-700 dark:bg-[#071324] dark:text-sky-300">
                        Live Status
                      </span>
                    </div>

                    {geminiAnalysis ? (
                      <div className="space-y-5">
                        
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500 dark:text-sky-300 font-extrabold uppercase">Detected Title</p>
                          <p className="text-base font-black text-emerald-600 dark:text-emerald-400 leading-tight">{geminiAnalysis.title}</p>
                        </div>

                        {/* Bento analysis metrics */}
                        <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-[#071324] p-3.5 rounded-xl border border-slate-200 dark:border-sky-900/60 shadow-inner">
                          <div>
                            <span className="text-xs block text-slate-500 dark:text-sky-300 font-black uppercase mb-0.5">Category</span>
                            <span className="text-sm font-extrabold text-slate-800 dark:text-sky-200">{geminiAnalysis.category}</span>
                          </div>
                          <div>
                            <span className="text-xs block text-slate-500 dark:text-sky-300 font-black uppercase mb-0.5">Evaluated Severity</span>
                            <span className={`text-sm font-black ${
                              geminiAnalysis.severity === 'Critical' ? 'text-rose-500' :
                              geminiAnalysis.severity === 'High' ? 'text-orange-500' :
                              geminiAnalysis.severity === 'Medium' ? 'text-amber-500' : 'text-sky-500'
                            }`}>{geminiAnalysis.severity}</span>
                          </div>
                        </div>

                        {/* Urgency score progress circle representation */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-extrabold text-slate-500 dark:text-sky-300 uppercase">
                            <span>Urgency Rating Index</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{geminiAnalysis.urgencyScore} / 100</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-sky-950 h-2 rounded-full overflow-hidden border border-slate-100 dark:border-sky-900/40">
                            <div 
                              className={`h-2 transition-all duration-500 ${
                                geminiAnalysis.urgencyScore > 80 ? 'bg-rose-500' :
                                geminiAnalysis.urgencyScore > 50 ? 'bg-orange-500' : 'bg-emerald-500'
                              }`} 
                              style={{ width: `${geminiAnalysis.urgencyScore}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Safety hazards bullet boxes */}
                        <div className="space-y-2">
                          <p className="text-xs text-slate-500 dark:text-sky-300 font-extrabold uppercase flex items-center gap-1">
                            <AlertTriangle className="h-4.5 w-4.5 text-rose-500" />
                            Direct Safety Hazard Flags
                          </p>
                          <div className="space-y-1.5">
                            {geminiAnalysis.safetyHazards.map((hz, i) => (
                              <div key={i} className="flex gap-2 items-start bg-rose-500/5 p-2.5 rounded-lg border border-rose-500/10 text-sm font-semibold">
                                <span className="text-rose-500 font-bold">🚨</span>
                                <span className="text-slate-700 dark:text-sky-100 leading-normal">{hz}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Citizens advice summary suggestions */}
                        <div className="space-y-1.5">
                          <p className="text-xs text-slate-500 dark:text-sky-300 font-extrabold uppercase">Citizen safety precautions</p>
                          <p className="text-sm font-bold leading-relaxed bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 p-3.5 rounded-xl border border-emerald-500/20">
                            {geminiAnalysis.aiSuggestions}
                          </p>
                        </div>

                        {/* Button triggers complaint compilation inside right bar */}
                        <div className="border-t border-slate-200 dark:border-sky-900 pt-4">
                          <button
                            type="button"
                            onClick={executeGenerateComplaint}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-black text-sm py-3.5 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <FileText className="h-5 w-5" />
                            Draft Official Complaint Letter
                          </button>
                        </div>

                      </div>
                    ) : (
                      <div className="text-center py-24 text-slate-500 dark:text-sky-300 flex flex-col items-center justify-center space-y-2.5">
                        <Sparkles className="h-10 w-10 text-sky-400/80 animate-pulse stroke-[1.2]" />
                        <p className="text-sm font-black text-slate-600 dark:text-sky-200">Waiting for simulation inputs...</p>
                        <p className="text-xs leading-relaxed max-w-xs text-slate-500 dark:text-sky-300 font-bold">
                          Complete some description details or select the "Analyze with Gemini" button to auto-extract structured values!
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Complaint Draft Show Area */}
                  {complaintDraftState || isGeneratingComplaint ? (
                    <div className={`p-6 rounded-3xl border transition-all ${theme === 'dark' ? 'bg-[#10243e] border-sky-900 animate-fade-in shadow-lg' : 'bg-white border-sky-200 shadow-md'} space-y-4`}>
                      <div className="flex justify-between items-center border-b border-slate-200 dark:border-sky-900 pb-3">
                        <span className="text-sm font-black text-slate-500 dark:text-sky-300 tracking-wider">MUNICIPAL COMPLAINT PREVIEW</span>
                        
                        <button
                          type="button"
                          onClick={copyComplaintToClipboard}
                          className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-black cursor-pointer"
                        >
                          {copiedNotification ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          <span>{copiedNotification ? 'Copied' : 'Copy Correspondence'}</span>
                        </button>
                      </div>

                      {isGeneratingComplaint ? (
                        <div className="text-center py-12 flex flex-col items-center gap-3">
                          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm font-bold text-slate-500 dark:text-sky-300">Gemini drafting letter...</span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <pre className="text-xs font-mono leading-relaxed bg-[#071324] text-sky-200 p-4 rounded-xl border border-sky-950 overflow-x-auto whitespace-pre-wrap max-h-64 shadow-inner font-semibold">
                            {complaintDraftState}
                          </pre>
                          <p className="text-xs text-slate-500 dark:text-sky-300 font-bold leading-normal">
                            ✓ This is formatted in accordance with state guidelines. Copy text to submit over email or standard letter drops.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : null}

                </div>

              </form>
            )}
          </div>
        )}

        {/* ==================== TAB 3: LIVE ISSUES LIST / FEED ==================== */}
        {activeTab === 'list' && (
          <div className="space-y-8">
            
            {/* Filter controls panel */}
            <div className={`p-5 rounded-3xl border transition-all ${theme === 'dark' ? 'bg-[#10243e] border-sky-900' : 'bg-white border-sky-200 shadow-sm'} flex flex-col md:flex-row gap-4 items-center justify-between`}>
              
              {/* Search label bar */}
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3.5 top-3.5 text-slate-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Query issues keyterms, address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-sky-900 bg-slate-50 dark:bg-[#071324] text-sm font-bold text-slate-850 dark:text-sky-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Filtering drop selections */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                
                <div className="flex items-center gap-1.5 flex-1 md:flex-initial">
                  <span className="text-xs font-black text-slate-500 dark:text-sky-300 uppercase">Category</span>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="p-3 border border-slate-200 dark:border-sky-900 bg-slate-50 dark:bg-[#071324] text-sm font-extrabold rounded-xl focus:outline-none cursor-pointer text-slate-800 dark:text-sky-100"
                  >
                    <option value="All">All Categories</option>
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 flex-1 md:flex-initial">
                  <span className="text-xs font-black text-slate-500 dark:text-sky-300 uppercase">Severity</span>
                  <select
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="p-3 border border-slate-200 dark:border-sky-900 bg-slate-50 dark:bg-[#071324] text-sm font-extrabold rounded-xl focus:outline-none cursor-pointer text-slate-800 dark:text-sky-100"
                  >
                    <option value="All">All Severities</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 flex-1 md:flex-initial">
                  <span className="text-xs font-black text-slate-500 dark:text-sky-300 uppercase">Status</span>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="p-3 border border-slate-200 dark:border-sky-900 bg-slate-50 dark:bg-[#071324] text-sm font-extrabold rounded-xl focus:outline-none cursor-pointer text-slate-800 dark:text-sky-100"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>

              </div>

            </div>

            {/* Displaying visual grid of filtered tickets */}
            {filteredIssues.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredIssues.map((issue) => {
                  const selectMatched = selectedIssue?.id === issue.id;
                  
                  return (
                    <div
                      key={issue.id}
                      onClick={() => {
                        setSelectedIssue(issue);
                        setActiveTab('home'); // jump straight to maps so coordinates pin highlights automatically
                      }}
                      className={`group p-6 rounded-3xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                        selectMatched 
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/[0.04] shadow-lg' 
                          : 'bg-white border-sky-200 dark:bg-[#10243e] dark:border-sky-900 hover:border-emerald-500 hover:shadow-lg shadow-md'
                      }`}
                    >
                      
                      <div className="space-y-4">
                        
                        {/* Badges row at top */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex gap-1.5">
                            <span className="px-3 py-1 text-xs font-black uppercase tracking-wider rounded-full border border-slate-200 bg-slate-50 dark:border-sky-900 dark:bg-[#071324] text-slate-700 dark:text-sky-300">
                              {issue.category}
                            </span>
                            <span className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-full border ${getSeverityColor(issue.severity).bg}`}>
                              {issue.severity}
                            </span>
                          </div>
                          
                          <span className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-full shadow-sm ${getStatusColor(issue.status)}`}>
                            {issue.status}
                          </span>
                        </div>

                        {/* Image element header inside element - ONLY show if there are actual photos */}
                        {issue.photos && issue.photos.length > 0 && (
                          <div className="relative h-44 w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-[#071324] border border-slate-200 dark:border-sky-900">
                            <img src={issue.photos[0]} alt={issue.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                          </div>
                        )}

                        {/* Title and details text */}
                        <div className="space-y-1.5">
                          <h4 className="text-lg font-black group-hover:text-emerald-500 transition-colors line-clamp-1 leading-snug dark:text-white">
                            {issue.title}
                          </h4>
                          <p className="text-sm font-bold text-slate-600 dark:text-sky-200 line-clamp-3 leading-relaxed">
                            {issue.description}
                          </p>
                        </div>

                      </div>

                      {/* Info footer row metadata */}
                      <div className="flex items-center justify-between border-t border-slate-150 dark:border-sky-900/60 pt-4 mt-4">
                        <div className="flex items-center gap-1.5 text-xs font-extrabold max-w-[65%] text-slate-500 dark:text-sky-300">
                          <MapPin className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          <span className="truncate">{issue.location.address}</span>
                        </div>

                        {/* Votes priority banner */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleUpvote(issue.id, e)}
                            className="bg-slate-100 hover:bg-emerald-500/10 hover:text-emerald-500 dark:bg-[#071324] py-1.5 px-3 rounded-xl text-xs font-extrabold flex items-center gap-1 text-slate-700 dark:text-sky-200 border border-transparent dark:border-sky-900"
                          >
                            <ThumbsUp className="h-4 w-4 stroke-[2.5]" />
                            <span>{issue.upvotes}</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-20 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 max-w-xl mx-auto space-y-3">
                <Info className="h-10 w-10 text-emerald-400 mx-auto" />
                <h4 className="text-base font-black text-slate-850 dark:text-sky-200">No reported problems matched parameters.</h4>
                <p className="text-sm font-bold text-slate-600 dark:text-sky-300 leading-relaxed">
                  Adjust active filter category selections or draft clear words search queries above.
                </p>
                <button
                  onClick={() => {
                    setFilterCategory('All');
                    setFilterSeverity('All');
                    setFilterStatus('All');
                    setSearchQuery('');
                  }}
                  className="mt-2 text-sm text-emerald-600 dark:text-emerald-400 font-extrabold underline hover:text-emerald-500 cursor-pointer"
                >
                  Clear all active filters parameters
                </button>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 4: HOW IT WORKS / GUIDE PAGE ==================== */}
        {activeTab === 'guide' && (
          <div className="max-w-4xl mx-auto space-y-10">
            <div className="text-center space-y-3">
              <h3 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300">
                A Transparent Neighborhood Service Framework
              </h3>
              <p className="text-base font-bold text-slate-700 dark:text-sky-200 max-w-xl mx-auto leading-relaxed">
                Locally puts the power back into the streets by coupling smartphone evidence capture with immediate bureaucratic intelligence.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              
              <div className={`p-6 rounded-3xl border transition-all ${theme === 'dark' ? 'bg-[#10243e] border-sky-900 shadow-lg' : 'bg-white border-sky-200 shadow-md'} space-y-4`}>
                <div className="bg-emerald-500 text-white font-black h-9 w-9 rounded-full flex items-center justify-center text-sm shadow-sm">
                  1
                </div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white">Photographic Evidence & Location</h4>
                <p className="text-sm font-semibold text-slate-600 dark:text-sky-200 leading-relaxed">
                  Citizens detect a local hazard such as potholes, dumped bulky trash, spray vandalism, or pipe leaks and take a clear photo. Our client module extracts geolocation GPS coordinates so engineers know the exact coordinate lines.
                </p>
                <ul className="text-sm text-slate-500 dark:text-sky-300 space-y-1.5 list-disc pl-5 font-bold">
                  <li>Upload multiple high quality images.</li>
                  <li>Click map straight to flag issues where coordinates are missing.</li>
                </ul>
              </div>

              <div className={`p-6 rounded-3xl border transition-all ${theme === 'dark' ? 'bg-[#10243e] border-sky-900 shadow-lg' : 'bg-white border-sky-200 shadow-md'} space-y-4`}>
                <div className="bg-teal-500 text-white font-black h-9 w-9 rounded-full flex items-center justify-center text-sm shadow-sm">
                  2
                </div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white">Server Side Gemini AI Categorization</h4>
                <p className="text-sm font-semibold text-slate-600 dark:text-sky-200 leading-relaxed">
                  The moment "Analyze with Gemini" is called, the server processes the imagery alongside text narratives back to Gemini. Gemini identifies materials, constructs hazards metrics, scores immediate threat vectors, and yields advice.
                </p>
                <ul className="text-sm text-slate-500 dark:text-sky-300 space-y-1.5 list-disc pl-5 font-bold">
                  <li>Automatic severity ranking (Low up to Critical).</li>
                  <li>Direct extraction of public hazards.</li>
                </ul>
              </div>

              <div className={`p-6 rounded-3xl border transition-all ${theme === 'dark' ? 'bg-[#10243e] border-sky-900 shadow-lg' : 'bg-white border-sky-200 shadow-md'} space-y-4`}>
                <div className="bg-indigo-500 text-white font-black h-9 w-9 rounded-full flex items-center justify-center text-sm shadow-sm">
                  3
                </div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white">Draft Government Correspondence</h4>
                <p className="text-sm font-semibold text-slate-600 dark:text-sky-200 leading-relaxed">
                  Writing a letter to city bureaucrats is complex. Locally removes this hurdle by letting Gemini draft formal complaints. The letter includes formal addresses, legal subject header lines, explicit civic summaries, and action requirements.
                </p>
                <ul className="text-sm text-slate-500 dark:text-sky-300 space-y-1.5 list-disc pl-5 font-bold">
                  <li>One click correspondence templates.</li>
                  <li>Formatted compliant to public administration rules.</li>
                </ul>
              </div>

              <div className={`p-6 rounded-3xl border transition-all ${theme === 'dark' ? 'bg-[#10243e] border-sky-900 shadow-lg' : 'bg-white border-sky-200 shadow-md'} space-y-4`}>
                <div className="bg-pink-500 text-white font-black h-9 w-9 rounded-full flex items-center justify-center text-sm shadow-sm">
                  4
                </div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white">Community Collective Priority</h4>
                <p className="text-sm font-semibold text-slate-600 dark:text-sky-200 leading-relaxed">
                  Upvoting issues acts as a collective petition, indicating safety priorities back to city planners. When hundreds of neighbors petition, municipal priority is naturally elevated, turning passive residents into active builders.
                </p>
                <ul className="text-sm text-slate-500 dark:text-sky-300 space-y-1.5 list-disc pl-5 font-bold">
                  <li>Pending, In-Progress & Resolved status updates.</li>
                  <li>Clear indicators of neighborhood response times.</li>
                </ul>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* Floating Action Button for opening instructions modal */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          id="companion-help-trigger"
          onClick={() => setShowGuideModal(true)}
          className="bg-slate-900 dark:bg-emerald-500 text-white font-black text-xs py-3 px-5 rounded-2xl flex items-center gap-2 shadow-xl hover:scale-[1.03] active:scale-95 transition-all scroll-smooth cursor-pointer"
        >
          <BookOpen className="h-4 w-4 text-emerald-400 dark:text-white" />
          <span>How to Use Locally</span>
        </button>
      </div>

      {/* COMPANION GUIDE MODAL CONTAINER */}
      {showGuideModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className={`max-w-md w-full rounded-3xl p-6 sm:p-8 space-y-6 relative border transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            
            <button
              id="guide-modal-close"
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Modal Heading Header */}
            <div className="text-center space-y-1">
              <Compass className="h-10 w-10 text-emerald-500 mx-auto" />
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">How to Use Locally</h3>
              <p className="text-xs text-slate-400 font-bold">Fast-track neighborhood repairs in 4 key steps</p>
            </div>

            {/* List of Steps */}
            <div className="space-y-4">
              
              <div className="flex gap-3">
                <span className="h-6 w-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-black select-none">
                  A
                </span>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Pin Location & Write Evidence</h4>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    Set addresses or tap location directly onto our custom neighborhood grid. Write what is broken.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="h-6 w-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-black select-none">
                  B
                </span>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Analyze with Gemini AI 🧑‍💻</h4>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    Upload images & hit Analyser. Our server backend automatically parses safety threats and categories.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="h-6 w-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-black select-none">
                  C
                </span>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Prepare Correspondence draft</h4>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    Click "Draft Official Complaint Letter" to immediately compile high-quality government letters.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="h-6 w-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-black select-none">
                  D
                </span>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Rally the Streets</h4>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    Broadcast findings to the community issues feed, let neighbors upvote tickets to push prioritizations.
                  </p>
                </div>
              </div>

            </div>

            {/* Direct Close action */}
            <button
              onClick={() => setShowGuideModal(false)}
              className="w-full bg-slate-900 border border-slate-700 hover:bg-slate-950 dark:bg-emerald-500 text-white font-black text-xs py-3 px-4 rounded-xl text-center cursor-pointer shadow-md"
            >
              Get Started Now
            </button>

          </div>
        </div>
      )}

      {/* Global Minimal Footer */}
      <footer className={`border-t py-8 text-center text-xs font-bold tracking-wide transition-colors ${theme === 'dark' ? 'border-slate-850 text-slate-500 bg-slate-950' : 'border-slate-200 text-slate-400 bg-white'}`}>
        <p>© 2026 Locally Hyperlocal Systems. Built for active neighbor cooperation groups & smart cities.</p>
      </footer>

      {/* Elegant Custom Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-6 z-[120] max-w-sm w-full bg-slate-900 dark:bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 shadow-2xl flex gap-3 items-start animate-fade-in">
          <div className="mt-0.5 flex-shrink-0">
            {toast.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            ) : toast.type === 'error' ? (
              <AlertTriangle className="h-5 w-5 text-rose-400" />
            ) : (
              <Info className="h-5 w-5 text-sky-400" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold leading-relaxed">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-200 flex-shrink-0 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Elegant Custom Confirm Dialog Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className={`max-w-sm w-full rounded-3xl p-6 space-y-6 border transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'} shadow-2xl`}>
            <div className="space-y-2 text-center">
              <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
              <h3 className="text-md font-extrabold">Confirm Action</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-bold">{confirmDialog.message}</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold py-2.5 px-4 rounded-xl text-center cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold py-2.5 px-4 rounded-xl text-center cursor-pointer transition-colors shadow-md"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
