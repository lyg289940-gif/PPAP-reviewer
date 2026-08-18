
import React, { useState, useEffect } from 'react';
import { ProjectInfo, Language, AiModel } from '../types';
import { ShieldCheck, ChevronRight, LayoutTemplate, Box, Truck, FileBadge, Plus, History, Trash2, Calendar, FolderOpen, Zap, BrainCircuit, Rocket } from 'lucide-react';
import { del } from 'idb-keyval';

interface Props {
  onStart: (info: ProjectInfo) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  aiModel: AiModel;
  setAiModel: (model: AiModel) => void;
}

export const LandingPage: React.FC<Props> = ({ onStart, language, setLanguage, aiModel, setAiModel }) => {
  const [activeTab, setActiveTab] = useState<'new' | 'recent'>('new');
  const [recentProjects, setRecentProjects] = useState<ProjectInfo[]>([]);
  const [formData, setFormData] = useState<Omit<ProjectInfo, 'id' | 'createdAt'>>({
    projectName: '',
    partName: '',
    partNumber: '',
    supplierName: '',
  });

  useEffect(() => {
    const saved = localStorage.getItem('ppap_projects_list');
    if (saved) {
      setRecentProjects(JSON.parse(saved));
      setActiveTab('recent'); // Default to recent if available
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.projectName && formData.supplierName) {
      const newProject: ProjectInfo = {
        ...formData,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString()
      };
      onStart(newProject);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm(language === 'zh' ? '确定要删除这个项目吗？所有数据将永久丢失。' : 'Are you sure? All project data will be lost.')) {
      const updated = recentProjects.filter(p => p.id !== id);
      setRecentProjects(updated);
      try {
        localStorage.setItem('ppap_projects_list', JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to update project list in localStorage:", e);
      }
      
      // Cleanup detailed data
      localStorage.removeItem(`ppap_items_${id}`);
      localStorage.removeItem(`ppap_findings_${id}`);
      localStorage.removeItem(`ppap_consistency_${id}`);
      localStorage.removeItem(`ppap_level_${id}`);
      
      try {
        await del(`ppap_items_${id}`);
        await del(`ppap_findings_${id}`);
        await del(`ppap_consistency_${id}`);
        await del(`ppap_level_${id}`);
      } catch (err) {
        console.error("Failed to delete from IndexedDB:", err);
      }
      
      if (updated.length === 0) setActiveTab('new');
    }
  };

  const t = {
    welcome: language === 'zh' ? 'AutoPPAP 智能审核系统' : 'AutoPPAP Audit System',
    subtitle: language === 'zh' ? '专业的 AI 驱动 PPAP 交付物验证平台' : 'Professional AI-Powered PPAP Verification Platform',
    newProject: language === 'zh' ? '新建项目' : 'New Project',
    recentProjects: language === 'zh' ? '最近项目' : 'Recent Projects',
    startProject: language === 'zh' ? '开始审核' : 'Start Audit',
    projectName: language === 'zh' ? '项目名称' : 'Project Name',
    partName: language === 'zh' ? '零件名称' : 'Part Name',
    partNumber: language === 'zh' ? '零件号' : 'Part Number',
    supplier: language === 'zh' ? '供应商名称' : 'Supplier Name',
    enter: language === 'zh' ? '进入系统' : 'Enter System',
    fillRequired: language === 'zh' ? '请填写必要信息' : 'Please fill required fields',
    noRecent: language === 'zh' ? '暂无历史项目' : 'No recent projects found',
    createFirst: language === 'zh' ? '创建您的第一个审核项目' : 'Create your first audit project'
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex overflow-hidden min-h-[600px]">
        
        {/* Left Side - Brand (Hidden on Mobile) */}
        <div className="w-5/12 bg-blue-600 p-12 flex flex-col justify-between relative hidden lg:flex">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-900 opacity-90"></div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-6 backdrop-blur-sm">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{t.welcome}</h1>
            <p className="text-blue-100 text-lg opacity-90">{t.subtitle}</p>
          </div>
          
          <div className="relative z-10 space-y-4 text-sm text-blue-100/80">
             <div className="p-4 bg-white/10 rounded-lg backdrop-blur-sm">
               <h3 className="font-bold text-white mb-1">Multi-Project Support</h3>
               <p className="text-xs">Manage multiple supplier audits simultaneously. Data is saved locally.</p>
             </div>
             <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                 <FileBadge className="w-4 h-4" />
              </div>
              <span>IATF 16949 / VDA 6.3 Standard</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                 <Box className="w-4 h-4" />
              </div>
              <span>AI-Powered Consistency Checks</span>
            </div>
          </div>
        </div>

        {/* Right Side - Workspace */}
        <div className="w-full lg:w-7/12 p-8 lg:p-12 flex flex-col bg-gray-50">
           
           {/* Top Bar */}
           <div className="flex justify-between items-center mb-8">
              <div className="flex gap-2 p-1 bg-gray-200 rounded-lg">
                <button
                  onClick={() => setActiveTab('new')}
                  className={`px-4 py-2 text-sm font-bold rounded-md transition-all flex items-center gap-2 ${activeTab === 'new' ? 'bg-white text-blue-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Plus className="w-4 h-4" /> {t.newProject}
                </button>
                <button
                  onClick={() => setActiveTab('recent')}
                  disabled={recentProjects.length === 0}
                  className={`px-4 py-2 text-sm font-bold rounded-md transition-all flex items-center gap-2 ${activeTab === 'recent' ? 'bg-white text-blue-900 shadow' : 'text-gray-500 hover:text-gray-700 disabled:opacity-50'}`}
                >
                  <History className="w-4 h-4" /> {t.recentProjects}
                  {recentProjects.length > 0 && <span className="ml-1 bg-gray-300 text-gray-700 px-1.5 py-0.5 rounded-full text-[10px]">{recentProjects.length}</span>}
                </button>
              </div>

              <div className="bg-gray-200 rounded-lg p-1 flex">
                <button 
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${language === 'en' ? 'bg-white text-blue-900 shadow' : 'text-gray-500'}`}
                >
                  EN
                </button>
                <button 
                  onClick={() => setLanguage('zh')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${language === 'zh' ? 'bg-white text-blue-900 shadow' : 'text-gray-500'}`}
                >
                  中文
                </button>
              </div>
           </div>

           {/* Global AI Model Selector */}
           <div className="mb-8 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
             <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-blue-600" />
                {language === 'zh' ? 'AI 推理模型选择' : 'AI Reasoning Model'}
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                   onClick={() => setAiModel('gemini-3.5-flash')}
                   className={`p-3 rounded-lg border text-left transition-all relative overflow-hidden ${aiModel === 'gemini-3.5-flash' ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 hover:border-blue-300'}`}
                >
                  <div className="font-bold text-gray-800 text-sm mb-1 flex items-center gap-1"><Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" /> Gemini 3.5 Flash</div>
                  <div className="text-xs text-gray-500 leading-relaxed">
                    {language === 'zh' ? '速度与精度的最佳平衡，适合绝大部分常规文件审核。' : 'Best balance of speed and precision for standard audits.'}
                  </div>
                  {aiModel === 'gemini-3.5-flash' && <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full" />}
                </button>
                <button
                   onClick={() => setAiModel('gemini-3.1-pro-preview')}
                   className={`p-3 rounded-lg border text-left transition-all relative overflow-hidden ${aiModel === 'gemini-3.1-pro-preview' ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 hover:border-blue-300'}`}
                >
                  <div className="font-bold text-gray-800 text-sm mb-1 flex items-center gap-1"><BrainCircuit className="w-4 h-4 text-purple-500" /> Gemini 3.1 Pro</div>
                  <div className="text-xs text-gray-500 leading-relaxed">
                    {language === 'zh' ? '最强深度推理能力，适合复杂的全尺寸和图纸测量关联，耗时略长。' : 'Deepest reasoning for complex dimensions and drawings, slightly slower.'}
                  </div>
                  {aiModel === 'gemini-3.1-pro-preview' && <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full" />}
                </button>
                <button
                   onClick={() => setAiModel('gemini-3.1-flash-lite')}
                   className={`p-3 rounded-lg border text-left transition-all relative overflow-hidden ${aiModel === 'gemini-3.1-flash-lite' ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 hover:border-blue-300'}`}
                >
                  <div className="font-bold text-gray-800 text-sm mb-1 flex items-center gap-1"><Rocket className="w-4 h-4 text-green-500" /> Gemini Flash Lite</div>
                  <div className="text-xs text-gray-500 leading-relaxed">
                    {language === 'zh' ? '响应极快且极具性价比，仅适用于简单的文字抽取与核验。' : 'Extremely fast and cost-effective, best for simple text extraction.'}
                  </div>
                  {aiModel === 'gemini-3.1-flash-lite' && <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full" />}
                </button>
             </div>
           </div>

           {/* Tab Content */}
           <div className="flex-1 overflow-y-auto">
             {activeTab === 'new' ? (
                <div className="animate-in fade-in duration-300">
                  <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <FolderOpen className="w-6 h-6 text-blue-600" /> {t.startProject}
                  </h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t.projectName} *</label>
                        <div className="relative">
                          <LayoutTemplate className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                          <input 
                            name="projectName"
                            required
                            value={formData.projectName}
                            onChange={handleChange}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="e.g. Model X - Braking System"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t.partName}</label>
                          <input 
                            name="partName"
                            value={formData.partName}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="e.g. Brake Caliper"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t.partNumber}</label>
                          <input 
                            name="partNumber"
                            value={formData.partNumber}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="e.g. 123-456-AB"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t.supplier} *</label>
                        <div className="relative">
                          <Truck className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                          <input 
                            name="supplierName"
                            required
                            value={formData.supplierName}
                            onChange={handleChange}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="e.g. Bosch GmbH"
                          />
                        </div>
                      </div>

                      <button 
                        type="submit"
                        className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      >
                        {t.enter} <ChevronRight className="w-4 h-4" />
                      </button>
                  </form>
                </div>
             ) : (
                <div className="space-y-3 animate-in fade-in duration-300">
                  {recentProjects.map((p) => (
                    <div 
                      key={p.id} 
                      onClick={() => onStart(p)}
                      className="group bg-white border border-gray-200 hover:border-blue-400 p-4 rounded-xl cursor-pointer transition-all hover:shadow-md relative"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-gray-800 group-hover:text-blue-700 transition-colors">{p.projectName}</h3>
                          <p className="text-sm text-gray-600 mt-1">{p.supplierName}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-3">
                            <span className="font-mono bg-gray-100 px-1 rounded">{p.partNumber || 'N/A'}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(p.lastAccessedAt || p.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => handleDelete(e, p.id)}
                          className="text-gray-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {recentProjects.length === 0 && (
                     <div className="text-center py-10 text-gray-400">
                       <p>{t.noRecent}</p>
                       <button onClick={() => setActiveTab('new')} className="text-blue-600 text-sm hover:underline mt-2">{t.createFirst}</button>
                     </div>
                  )}
                </div>
             )}
           </div>

        </div>
      </div>
    </div>
  );
};
