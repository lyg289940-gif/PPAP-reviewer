
import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Settings, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  ChevronRight,
  Filter,
  PieChart,
  Layers,
  Globe,
  ClipboardList,
  PlayCircle,
  Loader2,
  LogOut,
  ShieldOff,
  Target,
  Upload
} from 'lucide-react';
import { PpapLevel, PpapItem, AuditStatus, Language, Finding, ConsistencyResult, ProjectInfo, ExemptionRule, FocusRule } from './types';
import { INITIAL_ITEMS } from './constants';
import { StatsCard } from './components/StatsCard';
import { ItemAuditModal } from './components/ItemAuditModal';
import { ConsistencyView } from './components/ConsistencyView';
import { ReportView } from './components/ReportView';
import { ExemptionsView } from './components/ExemptionsView';
import { FocusRulesView } from './components/FocusRulesView';
import { LandingPage } from './components/LandingPage';
import { BatchUploadModal } from './components/BatchUploadModal';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip } from 'recharts';
import { auditPpapItem } from './geminiService';
import { get, set } from 'idb-keyval';

// Define chart colors
const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#E5E7EB'];

// UI Translations
const TRANSLATIONS = {
  en: {
    title: "AutoPPAP AI",
    subtitle: "PPAP Audit Assistant",
    dashboard: "Dashboard",
    checklist: "Checklist",
    correlation: "Correlation",
    report: "Report",
    level: "PPAP Level",
    settings: "Settings",
    auditOverview: "Audit Overview",
    deliverablesChecklist: "Deliverables Checklist",
    consistencyAnalysis: "Consistency Analysis",
    findingsReport: "Findings Report",
    project: "Project Context",
    levelActive: "Level Active",
    pendingReview: "Pending Review",
    approved: "Approved",
    warnings: "Warnings",
    rejected: "Rejected",
    completionStatus: "Completion Status",
    priorityItems: "Priority Action Items",
    noIssues: "No critical issues found yet.",
    startAuditing: "Start Auditing",
    showing: "Showing",
    requiredItems: "required items for Level",
    pendingUpload: "Pending Upload",
    uploaded: "Uploaded",
    batchAudit: "Batch Audit Pending",
    auditing: "Auditing...",
    switchProject: "Switch Project",
    exemptions: "Exemptions",
    exemptionsList: "Exemption Rules"
  },
  zh: {
    title: "AutoPPAP 智能助手",
    subtitle: "PPAP 审核专家",
    dashboard: "仪表盘",
    checklist: "检查清单",
    correlation: "关联分析",
    report: "报告生成",
    level: "PPAP 等级",
    settings: "设置",
    auditOverview: "审核概览",
    deliverablesChecklist: "交付物清单",
    consistencyAnalysis: "一致性分析",
    findingsReport: "发现项目报告",
    project: "项目上下文",
    levelActive: "当前等级",
    pendingReview: "待审核",
    approved: "已批准",
    warnings: "警告",
    rejected: "已拒绝",
    completionStatus: "完成状态",
    priorityItems: "优先处理项",
    noIssues: "暂未发现严重问题。",
    startAuditing: "开始审核",
    showing: "显示",
    requiredItems: "项必要文件，当前等级",
    pendingUpload: "待上传",
    uploaded: "已上传",
    batchAudit: "一键审核待办",
    auditing: "正在批量审核...",
    switchProject: "切换项目",
    exemptions: "豁免规则",
    exemptionsList: "永久豁免清单",
    focus: "关注问题",
    focusList: "关注问题清单"
  }
};

function App() {
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [currentLevel, setCurrentLevel] = useState<PpapLevel>(PpapLevel.LEVEL_3);
  const [items, setItems] = useState<PpapItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<PpapItem | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'list' | 'correlation' | 'report' | 'exemptions' | 'focus'>('dashboard');
  const [language, setLanguage] = useState<Language>('zh'); 
  const [masterFindings, setMasterFindings] = useState<Finding[]>([]);
  const [consistencyResults, setConsistencyResults] = useState<Record<string, ConsistencyResult>>({});
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [exemptions, setExemptions] = useState<ExemptionRule[]>([]);
  const [focusRules, setFocusRules] = useState<FocusRule[]>([]);
  const [showWarning, setShowWarning] = useState(true);
  const [isBatchUploadOpen, setIsBatchUploadOpen] = useState(false);

  const t = TRANSLATIONS[language];

  // Load Global Settings (Language, Exemptions) and Last Project on Mount
  useEffect(() => {
    const savedLang = localStorage.getItem('ppap_global_lang');
    if (savedLang) setLanguage(savedLang as Language);

    const hasAccepted = sessionStorage.getItem('ppap_warning_accepted');
    if (hasAccepted) {
      setShowWarning(false);
    }

    const lastPid = localStorage.getItem('ppap_last_project_id');
    const allProjectsStr = localStorage.getItem('ppap_projects_list');
    if (lastPid && allProjectsStr) {
      const allProjects: ProjectInfo[] = JSON.parse(allProjectsStr);
      const lastProject = allProjects.find(p => p.id === lastPid);
      if (lastProject) setProjectInfo(lastProject);
    }
    
    setIsInitialized(true);
  }, []);

  // Save Language globally
  useEffect(() => {
    try {
      localStorage.setItem('ppap_global_lang', language);
    } catch (e) {
      console.error("Failed to save language to localStorage:", e);
    }
  }, [language]);

  // Load Project Specific Data when projectInfo is set
  useEffect(() => {
    if (projectInfo) {
      const pid = projectInfo.id;
      setIsDataLoaded(false); // Reset when switching projects
      setIsLoading(true);
      
      const loadData = async () => {
        // Migration helper: check idb-keyval first, fallback to localStorage
        const getWithMigration = async (key: string) => {
          let val = await get(key);
          if (!val) {
            val = localStorage.getItem(key);
            if (val) {
              // If it's a string, it might be JSON.stringify-ed
              // We store as string in IndexedDB too for consistency with the current logic
              await set(key, val);
              localStorage.removeItem(key);
            }
          }
          return val;
        };

        try {
          const savedLevel = await getWithMigration(`ppap_level_${pid}`);
          const level = savedLevel ? Number(savedLevel) : 3;
          setCurrentLevel(level);

          const savedItems = await getWithMigration(`ppap_items_${pid}`);
          const savedFindings = await getWithMigration(`ppap_findings_${pid}`);
          const savedConsistency = await getWithMigration(`ppap_consistency_${pid}`);
          const savedExemptions = await getWithMigration(`ppap_exemptions_${pid}`);
          const savedFocusRules = await getWithMigration(`ppap_focus_${pid}`);

          if (savedItems) {
            try {
              setItems(JSON.parse(savedItems));
            } catch (e) {
              console.error("Failed to parse items:", e);
              setItems(INITIAL_ITEMS(level));
            }
          } else {
            // Initialize new project items based on level
            setItems(INITIAL_ITEMS(level));
          }

          if (savedFindings) {
            try {
              const parsed = JSON.parse(savedFindings);
              // Hydrate timestamps (string -> Date)
              setMasterFindings(parsed.map((f: any) => ({
                ...f,
                timestamp: new Date(f.timestamp)
              })));
            } catch (e) {
              console.error("Failed to parse findings:", e);
              setMasterFindings([]);
            }
          } else {
            setMasterFindings([]);
          }

          if (savedConsistency) {
            try {
              const parsed = JSON.parse(savedConsistency);
              // Hydrate lastRun dates
              const hydrated = Object.entries(parsed).reduce((acc, [key, val]: [string, any]) => {
                acc[key] = { ...val, lastRun: new Date(val.lastRun) };
                return acc;
              }, {} as Record<string, ConsistencyResult>);
              setConsistencyResults(hydrated);
            } catch (e) {
               console.error("Failed to parse consistency results:", e);
               setConsistencyResults({});
            }
          } else {
            setConsistencyResults({});
          }

          if (savedExemptions) {
            try {
              setExemptions(JSON.parse(savedExemptions));
            } catch (e) {
              console.error("Failed to parse exemptions:", e);
              setExemptions([]);
            }
          } else {
            setExemptions([]);
          }

          if (savedFocusRules) {
            try {
              setFocusRules(JSON.parse(savedFocusRules));
            } catch (e) {
              console.error("Failed to parse focus rules:", e);
              setFocusRules([]);
            }
          } else {
            setFocusRules([]);
          }
          
          setIsDataLoaded(true);
        } catch (error) {
          console.error("Error loading project data:", error);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadData();
      localStorage.setItem('ppap_last_project_id', pid);
    } else {
      setIsLoading(false);
      setIsDataLoaded(false);
    }
  }, [projectInfo?.id]);

  // Save Project Specific Data on Change
  useEffect(() => {
    if (!projectInfo || !isDataLoaded) return;
    const pid = projectInfo.id;
    
    const saveData = async () => {
      try {
        // Strip fileData to save space and prevent quota issues, as requested by user
        const itemsToSave = items.map(item => {
          const { fileData, ...rest } = item;
          return rest;
        });

        await set(`ppap_items_${pid}`, JSON.stringify(itemsToSave));
        await set(`ppap_findings_${pid}`, JSON.stringify(masterFindings));
        await set(`ppap_consistency_${pid}`, JSON.stringify(consistencyResults));
        await set(`ppap_exemptions_${pid}`, JSON.stringify(exemptions));
        await set(`ppap_focus_${pid}`, JSON.stringify(focusRules));
        await set(`ppap_level_${pid}`, String(currentLevel));
        
        // Also update the lastAccessedAt in the main project list
        const allProjectsStr = localStorage.getItem('ppap_projects_list');
        if (allProjectsStr) {
          const allProjects: ProjectInfo[] = JSON.parse(allProjectsStr);
          const updatedList = allProjects.map(p => 
            p.id === pid ? { ...p, lastAccessedAt: new Date().toISOString() } : p
          );
          localStorage.setItem('ppap_projects_list', JSON.stringify(updatedList));
        }
      } catch (e) {
        console.error("Failed to save to IndexedDB:", e);
        alert(language === 'zh' ? '保存到本地数据库失败。' : 'Failed to save to local database.');
      }
    };
    
    saveData();
  }, [items, masterFindings, consistencyResults, exemptions, focusRules, currentLevel, projectInfo, language, isDataLoaded]);

  const handleStartProject = (info: ProjectInfo) => {
    // Save to global project list if it doesn't exist
    const allProjectsStr = localStorage.getItem('ppap_projects_list');
    let allProjects: ProjectInfo[] = allProjectsStr ? JSON.parse(allProjectsStr) : [];
    
    const existingIndex = allProjects.findIndex(p => p.id === info.id);
    if (existingIndex === -1) {
      // New project
      allProjects.unshift(info); // Add to top
      
      // Reset data for the new project
      setItems(INITIAL_ITEMS(PpapLevel.LEVEL_3));
      setMasterFindings([]);
      setConsistencyResults({});
      setCurrentLevel(PpapLevel.LEVEL_3);
      setIsDataLoaded(true); // New project, ready to save
    } else {
      // Update access time and move to top
      const existing = allProjects[existingIndex];
      allProjects.splice(existingIndex, 1);
      allProjects.unshift({ ...existing, lastAccessedAt: new Date().toISOString() });
      
      // For existing projects, we don't reset state here.
      // The loadData useEffect will trigger because we call setProjectInfo
      setIsDataLoaded(false); 
    }
    
    try {
      localStorage.setItem('ppap_projects_list', JSON.stringify(allProjects));
      localStorage.setItem('ppap_last_project_id', info.id);
    } catch (e) {
      console.error("Failed to save project list to localStorage:", e);
      if (e instanceof DOMException && (e.code === 22 || e.name === 'QuotaExceededError')) {
        alert(language === 'zh' ? '存储空间已满，无法保存新项目。请清理其他项目。' : 'Storage quota exceeded. Cannot save new project. Please clear other projects.');
      }
    }
    
    setProjectInfo(info);
  };

  const handleSwitchProject = () => {
    // Just clear the current project info state, do NOT clear localStorage
    setProjectInfo(null);
    setItems([]);
    setMasterFindings([]);
    setConsistencyResults({});
    setIsDataLoaded(false);
    localStorage.removeItem('ppap_last_project_id');
  };

  const handleLevelChange = (level: PpapLevel) => {
    setCurrentLevel(level);
    const newDefaults = INITIAL_ITEMS(level);
    setItems(prevItems => {
      return newDefaults.map(defItem => {
        const existing = prevItems.find(p => p.id === defItem.id);
        return existing ? { ...defItem, ...existing } : defItem;
      });
    });
  };

  const handleItemUpdate = (updatedItem: PpapItem) => {
    setItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
  };

  const handleAddFindings = (newFindings: Finding[]) => {
    setMasterFindings(prev => [...prev, ...newFindings]);
  };

  const handleRemoveFinding = (id: string) => {
    setMasterFindings(prev => prev.filter(f => f.id !== id));
  };

  const handleUpdateConsistencyResult = (ruleId: string, result: ConsistencyResult) => {
    setConsistencyResults(prev => ({ ...prev, [ruleId]: result }));
  };

  const handleBatchAudit = async () => {
    const toAudit = items.filter(i => i.fileData && i.status === AuditStatus.PENDING);
    if (toAudit.length === 0) return;

    setIsBatchProcessing(true);
    
    for (const item of toAudit) {
      try {
        const docName = language === 'zh' && item.name_zh ? item.name_zh : item.name;
        const docExemptions = exemptions.filter(e => e.documentName === docName).map(e => e.summary);
        
        const result = await auditPpapItem(
          docName,
          item.fileData!,
          item.mimeType || 'application/pdf',
          language,
          docExemptions
        );

        const updatedItem = {
           ...item,
           status: result.status,
           feedback: result
        };
        setItems(currentItems => currentItems.map(i => i.id === updatedItem.id ? updatedItem : i));
      } catch (e) {
        console.error(`Failed to audit item ${item.id}`, e);
      }
    }

    setIsBatchProcessing(false);
  };

  const stats = useMemo(() => {
    return {
      total: items.length,
      approved: items.filter(i => i.status === AuditStatus.APPROVED).length,
      rejected: items.filter(i => i.status === AuditStatus.REJECTED).length,
      warning: items.filter(i => i.status === AuditStatus.WARNING).length,
      pending: items.filter(i => i.status === AuditStatus.PENDING).length,
    };
  }, [items]);

  const pieData = [
    { name: t.approved, value: stats.approved },
    { name: t.warnings, value: stats.warning },
    { name: t.rejected, value: stats.rejected },
    { name: t.pendingReview, value: stats.pending },
  ];

  const handleBatchUpload = (uploadedFiles: { item: PpapItem; fileData: string; mimeType: string }[]) => {
    setItems(currentItems => {
      const newItems = [...currentItems];
      uploadedFiles.forEach(upload => {
        const index = newItems.findIndex(i => i.id === upload.item.id);
        if (index !== -1) {
          newItems[index] = {
            ...newItems[index],
            fileData: upload.fileData,
            mimeType: upload.mimeType,
            status: AuditStatus.PENDING,
            feedback: undefined
          };
        }
      });
      return newItems;
    });
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return t.auditOverview;
      case 'list': return t.deliverablesChecklist;
      case 'correlation': return t.consistencyAnalysis;
      case 'report': return t.findingsReport;
      default: return '';
    }
  };

  const handleAcceptWarning = () => {
    sessionStorage.setItem('ppap_warning_accepted', 'true');
    setShowWarning(false);
  };

  const WarningModal = showWarning ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 text-amber-600 mb-4">
          <AlertTriangle className="w-8 h-8" />
          <h2 className="text-xl font-bold">
            {language === 'zh' ? '测试阶段警告' : 'Beta Testing Warning'}
          </h2>
        </div>
        <p className="text-gray-600 mb-6 leading-relaxed">
          {language === 'zh' 
            ? '此应用程序目前处于测试阶段。请不要输入或上传任何机密信息、敏感数据或真实的保密文件。This application is currently in the testing phase. Please do not input or upload any confidential information, sensitive data, or real classified files.' 
            : 'This application is currently in the testing phase. Please do not input or upload any confidential information, sensitive data, or real classified files.'}
        </p>
        <button 
          onClick={handleAcceptWarning}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors"
        >
          {language === 'zh' ? '我已了解' : 'I Understand'}
        </button>
      </div>
    </div>
  ) : null;

  if (!isInitialized) return null;

  if (!projectInfo) {
    return (
      <>
        {WarningModal}
        <LandingPage onStart={handleStartProject} language={language} setLanguage={setLanguage} />
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        {WarningModal}
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">Loading project data...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-900 font-sans">
      {WarningModal}
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 transition-all duration-300">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white mb-1">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="font-bold text-lg">A</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>
          </div>
          <p className="text-xs text-slate-500">{t.subtitle}</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>{t.dashboard}</span>
          </button>
          <button 
             onClick={() => setActiveTab('list')}
             className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'list' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <FileText className="w-5 h-5" />
            <span>{t.checklist}</span>
            <span className="ml-auto bg-slate-700 text-xs py-0.5 px-2 rounded-full text-white">{items.length}</span>
          </button>
          <button 
             onClick={() => setActiveTab('correlation')}
             className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'correlation' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <Layers className="w-5 h-5" />
            <span>{t.correlation}</span>
            {Object.keys(consistencyResults).length > 0 && <span className="ml-auto bg-blue-500 text-xs py-0.5 px-2 rounded-full text-white">{Object.keys(consistencyResults).length}</span>}
          </button>
          <button 
             onClick={() => setActiveTab('report')}
             className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'report' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <ClipboardList className="w-5 h-5" />
            <span>{t.report}</span>
            {masterFindings.length > 0 && <span className="ml-auto bg-red-500 text-xs py-0.5 px-2 rounded-full text-white">{masterFindings.length}</span>}
          </button>
          <button 
             onClick={() => setActiveTab('exemptions')}
             className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'exemptions' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <ShieldOff className="w-5 h-5" />
            <span>{t.exemptions}</span>
            {exemptions.length > 0 && <span className="ml-auto bg-amber-500 text-xs py-0.5 px-2 rounded-full text-white">{exemptions.length}</span>}
          </button>
          <button 
             onClick={() => setActiveTab('focus')}
             className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'focus' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <Target className="w-5 h-5" />
            <span>{t.focus}</span>
            {focusRules.length > 0 && <span className="ml-auto bg-indigo-500 text-xs py-0.5 px-2 rounded-full text-white">{focusRules.length}</span>}
          </button>

          <div className="pt-8">
             <button 
                onClick={handleSwitchProject}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
             >
                <LogOut className="w-5 h-5" />
                <span>{t.switchProject}</span>
             </button>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-4">
           {/* Language Switcher */}
           <div className="bg-slate-800 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Globe className="w-4 h-4" />
                <span>Language</span>
              </div>
              <div className="flex bg-slate-900 rounded-lg p-1">
                <button 
                  onClick={() => setLanguage('en')}
                  className={`px-2 py-1 text-xs rounded-md transition-all ${language === 'en' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  EN
                </button>
                <button 
                  onClick={() => setLanguage('zh')}
                  className={`px-2 py-1 text-xs rounded-md transition-all ${language === 'zh' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  中
                </button>
              </div>
           </div>

           <div className="bg-slate-800 rounded-xl p-4">
             <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">{t.level}</label>
             <select 
              value={currentLevel}
              onChange={(e) => handleLevelChange(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
             >
               <option value={1}>Level 1 - PSW Only</option>
               <option value={2}>Level 2 - PSW + Limited</option>
               <option value={3}>Level 3 - Standard</option>
               <option value={4}>Level 4 - Custom</option>
               <option value={5}>Level 5 - On-site</option>
             </select>
           </div>
           
           <div className="flex items-center gap-2 text-xs text-slate-500">
              <Settings className="w-3 h-3" />
              <span>v2.0.0 • Pro</span>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Header */}
        <header className="bg-white border-b px-8 py-4 flex justify-between items-center flex-shrink-0 shadow-sm z-10">
           <div>
             <h2 className="text-2xl font-bold text-gray-800">
               {getPageTitle()}
             </h2>
             <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
               <span className="font-semibold text-blue-700">{projectInfo.projectName}</span>
               <span className="text-gray-300">|</span>
               <span>{projectInfo.supplierName}</span>
               <span className="text-gray-300">|</span>
               <span className="font-mono bg-gray-100 px-1 rounded">{projectInfo.partNumber}</span>
             </div>
           </div>
           <div className="flex items-center gap-3">
              <div className="px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200 shadow-sm">
                {t.levelActive} {currentLevel}
              </div>
           </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-auto p-8">
          
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard title={t.pendingReview} value={stats.pending} color="bg-gray-400" icon={<Clock className="w-6 h-6" />} />
                <StatsCard title={t.approved} value={stats.approved} color="bg-green-500" icon={<CheckCircle className="w-6 h-6" />} />
                <StatsCard title={t.warnings} value={stats.warning} color="bg-yellow-500" icon={<AlertTriangle className="w-6 h-6" />} />
                <StatsCard title={t.rejected} value={stats.rejected} color="bg-red-500" icon={<AlertTriangle className="w-6 h-6" />} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-1 min-h-[300px] flex flex-col">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-gray-500" /> {t.completionStatus}
                  </h3>
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={pieData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ReTooltip />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 text-xs text-gray-500 mt-4">
                     <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> {t.approved}</div>
                     <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500"></div> {t.warnings}</div>
                     <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> {t.rejected}</div>
                  </div>
                </div>

                {/* Recent Activity / Priority List */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
                  <h3 className="font-bold text-gray-800 mb-4">{t.priorityItems}</h3>
                  {items.filter(i => i.status === AuditStatus.REJECTED || i.status === AuditStatus.WARNING).length > 0 ? (
                    <div className="space-y-3">
                      {items.filter(i => i.status === AuditStatus.REJECTED || i.status === AuditStatus.WARNING).slice(0, 5).map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg cursor-pointer hover:bg-red-100 transition-colors" onClick={() => setSelectedItem(item)}>
                          <div className="flex items-center gap-3">
                             <AlertTriangle className={`w-5 h-5 ${item.status === AuditStatus.REJECTED ? 'text-red-500' : 'text-yellow-500'}`} />
                             <span className="font-medium text-gray-800">{language === 'zh' && item.name_zh ? item.name_zh : item.name}</span>
                          </div>
                          <span className="text-sm font-semibold text-gray-600">{item.status}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-gray-400 flex flex-col items-center">
                       <CheckCircle className="w-12 h-12 mb-2 text-green-200" />
                       <p>{t.noIssues}</p>
                       <button className="text-blue-600 text-sm mt-2 hover:underline" onClick={() => setActiveTab('list')}>{t.startAuditing}</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'list' && (
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
               <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                 <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-600">{t.showing} {items.length} {t.requiredItems} {currentLevel}</span>
                 </div>
                 
                 {/* Batch Actions */}
                 <div className="flex items-center gap-3">
                   <button
                      onClick={() => setIsBatchUploadOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm"
                   >
                      <Upload className="w-4 h-4" />
                      {language === 'zh' ? '批量上传' : 'Batch Upload'}
                   </button>
                   <button
                      onClick={handleBatchAudit}
                      disabled={isBatchProcessing || items.filter(i => i.fileData && i.status === AuditStatus.PENDING).length === 0}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                        ${(isBatchProcessing || items.filter(i => i.fileData && i.status === AuditStatus.PENDING).length === 0)
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                        }`}
                   >
                      {isBatchProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                      {isBatchProcessing ? t.auditing : t.batchAudit}
                   </button>
                 </div>
               </div>
               <div className="divide-y divide-gray-100">
                 {items.map((item) => (
                   <div 
                     key={item.id} 
                     onClick={() => setSelectedItem(item)}
                     className="p-4 hover:bg-blue-50 transition-colors cursor-pointer group flex items-center justify-between"
                   >
                     <div className="flex items-center gap-4">
                       <div className="w-8 text-sm font-mono text-gray-400">#{item.id}</div>
                       <div>
                         <h4 className="font-semibold text-gray-800">{language === 'zh' && item.name_zh ? item.name_zh : item.name}</h4>
                         {item.fileName && <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><FileText className="w-3 h-3" /> {item.fileName}</p>}
                       </div>
                     </div>
                     
                     <div className="flex items-center gap-4">
                        {item.status === AuditStatus.PENDING && !item.fileData && (
                          <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium border border-gray-200">{t.pendingUpload}</span>
                        )}
                        {item.status === AuditStatus.PENDING && item.fileData && (
                           <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-medium border border-blue-100">{t.uploaded}</span>
                        )}
                        {item.status === AuditStatus.APPROVED && (
                          <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium border border-green-200 flex items-center gap-1">
                             <CheckCircle className="w-3 h-3" /> {t.approved}
                          </span>
                        )}
                        {item.status === AuditStatus.REJECTED && (
                          <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium border border-red-200 flex items-center gap-1">
                             <AlertTriangle className="w-3 h-3" /> {t.rejected}
                          </span>
                        )}
                         {item.status === AuditStatus.WARNING && (
                          <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium border border-yellow-200 flex items-center gap-1">
                             <AlertTriangle className="w-3 h-3" /> {t.warnings}
                          </span>
                        )}
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500" />
                     </div>
                   </div>
                 ))}
               </div>
             </div>
          )}

          {activeTab === 'correlation' && (
            <ConsistencyView 
              items={items} 
              language={language}
              onAddFindings={handleAddFindings} 
              results={consistencyResults}
              onUpdateResult={handleUpdateConsistencyResult}
            />
          )}

          {activeTab === 'report' && (
            <ReportView 
              findings={masterFindings} 
              language={language} 
              onRemoveFinding={handleRemoveFinding}
            />
          )}

          {activeTab === 'exemptions' && (
            <ExemptionsView
              exemptions={exemptions}
              language={language}
              onRemoveExemption={(id) => setExemptions(prev => prev.filter(e => e.id !== id))}
              onAddExemption={(rule) => setExemptions(prev => [...prev, rule])}
              onEditExemption={(rule) => setExemptions(prev => prev.map(e => e.id === rule.id ? rule : e))}
            />
          )}

          {activeTab === 'focus' && (
            <FocusRulesView
              focusRules={focusRules}
              language={language}
              onRemoveFocusRule={(id) => setFocusRules(prev => prev.filter(e => e.id !== id))}
              onAddFocusRule={(rule) => setFocusRules(prev => [...prev, rule])}
              onEditFocusRule={(rule) => setFocusRules(prev => prev.map(e => e.id === rule.id ? rule : e))}
            />
          )}
        </div>
      </main>

      {/* Audit Modal */}
      {selectedItem && (
        <ItemAuditModal 
          item={selectedItem}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={handleItemUpdate}
          onAddFindings={handleAddFindings}
          language={language}
          exemptions={exemptions.filter(e => e.documentName === (language === 'zh' && selectedItem.name_zh ? selectedItem.name_zh : selectedItem.name))}
          focusRules={focusRules.filter(e => e.documentName === (language === 'zh' && selectedItem.name_zh ? selectedItem.name_zh : selectedItem.name))}
          onAddExemption={(rule) => setExemptions(prev => [...prev, rule])}
        />
      )}

      {/* Batch Upload Modal */}
      <BatchUploadModal
        isOpen={isBatchUploadOpen}
        onClose={() => setIsBatchUploadOpen(false)}
        items={items}
        onUpload={handleBatchUpload}
        language={language}
      />
    </div>
  );
}

export default App;
