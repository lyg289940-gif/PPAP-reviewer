
import React, { useState, useRef, useEffect } from 'react';
import { PpapItem, AuditStatus, AuditFeedback, Language, Finding } from '../types';
import { X, Upload, CheckCircle, AlertTriangle, XCircle, FileText, Activity, Search, PlusCircle, CheckSquare, Square, Save, Edit3, Eye } from 'lucide-react';
import { auditPpapItem } from '../geminiService';
import { ChatInterface } from './ChatInterface';

interface Props {
  item: PpapItem;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedItem: PpapItem) => void;
  onAddFindings: (findings: Finding[]) => void;
  language: Language;
}

interface EditableFinding {
  id: string;
  text: string;
  selected: boolean;
  isEditing: boolean;
}

export const ItemAuditModal: React.FC<Props> = ({ item, isOpen, onClose, onUpdate, onAddFindings, language }) => {
  const [isAuditing, setIsAuditing] = useState(false);
  const [localItem, setLocalItem] = useState<PpapItem>(item);
  const [editableFindings, setEditableFindings] = useState<EditableFinding[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const t = {
    id: language === 'zh' ? '编号' : 'ID',
    uploadPrompt: language === 'zh' ? '上传文件供AI审核标准符合性' : 'Upload the document for AI validation against SQE standards.',
    evidence: language === 'zh' ? '文件证据' : 'Document Evidence',
    clickUpload: language === 'zh' ? '点击上传文件' : 'Click to upload document',
    supportText: language === 'zh' ? '支持 PDF, PNG, JPG (最大 10MB)' : 'Supports PDF, PNG, JPG (Max 10MB)',
    agentAnalysis: language === 'zh' ? '智能分析结果' : 'Agent Analysis',
    analyzing: language === 'zh' ? '正在分析文档内容...' : 'Analyzing document content...',
    checkingStandard: language === 'zh' ? '正在核对AIAG/VDA标准' : 'Checking against AIAG standards',
    emptyState: language === 'zh' ? '上传文档并点击分析按钮开始AI审核流程' : 'Upload document and click analyze to start AI audit.',
    keyFindings: language === 'zh' ? '发现项目 (可编辑 & 确认)' : 'Findings (Edit & Confirm)',
    recommendation: language === 'zh' ? '建议' : 'Recommendation',
    reRun: language === 'zh' ? '重新运行 AI 审核' : 'Re-Run AI Audit',
    startAudit: language === 'zh' ? '开始智能分析' : 'Start AI Analysis',
    running: language === 'zh' ? 'AI 正在审核...' : 'AI Agent Auditing...',
    addToReport: language === 'zh' ? '确认并添加到报告' : 'Confirm & Add to Report',
    selectAll: language === 'zh' ? '全选' : 'Select All',
    added: language === 'zh' ? '已添加!' : 'Added!'
  };

  // Sync editable findings when feedback changes
  useEffect(() => {
    if (localItem.feedback?.findings) {
      const initial = localItem.feedback.findings.map((f, i) => ({
        id: `finding-${Date.now()}-${i}`,
        text: f,
        selected: false,
        isEditing: false
      }));
      setEditableFindings(initial);
    }
  }, [localItem.feedback]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert(language === 'zh' ? '文件大小不能超过 10MB' : 'File size cannot exceed 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      
      const newItemState = {
        ...localItem,
        fileName: file.name,
        fileData: base64Data,
        mimeType: file.type,
        status: AuditStatus.PENDING,
        feedback: undefined
      };
      
      setLocalItem(newItemState);
      setEditableFindings([]); // Clear previous findings
      
      // Update parent immediately so the file is considered "uploaded" for consistency checks
      onUpdate(newItemState);
    };
    reader.readAsDataURL(file);
  };

  const toggleSelection = (id: string) => {
    setEditableFindings(prev => prev.map(f => f.id === id ? { ...f, selected: !f.selected } : f));
  };

  const toggleSelectAll = () => {
    const allSelected = editableFindings.every(f => f.selected);
    setEditableFindings(prev => prev.map(f => ({ ...f, selected: !allSelected })));
  };

  const toggleEdit = (id: string) => {
     setEditableFindings(prev => prev.map(f => f.id === id ? { ...f, isEditing: !f.isEditing } : f));
  };

  const updateText = (id: string, newText: string) => {
    setEditableFindings(prev => prev.map(f => f.id === id ? { ...f, text: newText } : f));
  };

  const handleAddToReport = () => {
    const selected = editableFindings.filter(f => f.selected);
    if (selected.length === 0) return;

    const newFindings: Finding[] = selected.map(f => ({
      id: f.id,
      source: language === 'zh' && item.name_zh ? item.name_zh : item.name,
      category: item.name, // Automatic categorization by item name
      description: f.text,
      timestamp: new Date()
    }));

    onAddFindings(newFindings);
    setEditableFindings(prev => prev.map(f => ({...f, selected: false})));
    alert(t.added);
  };

  const displayName = language === 'zh' && item.name_zh ? item.name_zh : item.name;

  const getStatusColor = (status: AuditStatus) => {
    switch (status) {
      case AuditStatus.APPROVED: return "text-green-600 bg-green-50 border-green-200";
      case AuditStatus.REJECTED: return "text-red-600 bg-red-50 border-red-200";
      case AuditStatus.WARNING: return "text-yellow-600 bg-yellow-50 border-yellow-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b flex justify-between items-center bg-gray-50">
          <div>
            <div className="flex items-center space-x-3">
              <span className="bg-slate-800 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">{t.id}: {item.id}</span>
              <h2 className="text-xl font-bold text-gray-800">{displayName}</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-100 hover:text-red-600 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 bg-gray-50/30">
          
          {/* Left Column: Document View */}
          <div className="flex flex-col space-y-4 h-full">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" /> {t.evidence}
              </h3>
              {localItem.fileData && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" /> Re-upload
                </button>
              )}
            </div>
            
            <div className={`flex-1 border-2 border-dashed rounded-xl overflow-hidden relative bg-white transition-all min-h-[500px] ${!localItem.fileData ? 'hover:bg-blue-50/50 hover:border-blue-300 cursor-pointer' : ''}`}
                 onClick={() => !localItem.fileData && fileInputRef.current?.click()}>
              
              {localItem.fileData ? (
                <div className="w-full h-full relative group">
                  {localItem.mimeType === 'application/pdf' ? (
                    <iframe 
                      src={localItem.fileData} 
                      className="w-full h-full" 
                      title="PDF Preview"
                    />
                  ) : localItem.mimeType?.startsWith('image') ? (
                    <img src={localItem.fileData} alt="Evidence" className="w-full h-full object-contain p-4 bg-gray-100" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <FileText className="w-16 h-16 mb-2 opacity-50" />
                      <p className="font-medium">{localItem.fileName}</p>
                      <p className="text-xs">Preview not available for this type</p>
                    </div>
                  )}
                  
                  {/* Overlay for re-upload if needed */}
                  {!localItem.mimeType?.includes('pdf') && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
                  )}
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                     <Upload className="w-8 h-8 text-blue-500" />
                  </div>
                  <p className="text-gray-700 font-bold text-lg">{t.clickUpload}</p>
                  <p className="text-gray-400 text-sm mt-2 max-w-xs">{t.supportText}</p>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
              />
            </div>
            
            <button 
               onClick={() => { 
                 setIsAuditing(true); 
                 auditPpapItem(
                   language === 'zh' && localItem.name_zh ? localItem.name_zh : localItem.name, 
                   localItem.fileData!, 
                   localItem.mimeType!, 
                   language
                 ).then(res => setLocalItem({...localItem, status: res.status, feedback: res})).finally(() => setIsAuditing(false)) 
               }}
               disabled={!localItem.fileData || isAuditing}
               className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 text-lg transform hover:-translate-y-0.5 active:translate-y-0"
             >
               {isAuditing ? <Activity className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
               {isAuditing ? t.running : (localItem.feedback ? t.reRun : t.startAudit)}
             </button>
          </div>

          {/* Right Column: AI Analysis */}
          <div className="flex flex-col space-y-4 h-full">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-600" /> {t.agentAnalysis}
            </h3>

            {isAuditing ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-6 border rounded-xl bg-white shadow-sm min-h-[400px]">
                 <div className="relative">
                   <div className="w-16 h-16 border-4 border-blue-100 rounded-full"></div>
                   <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute inset-0"></div>
                 </div>
                 <div className="text-center">
                   <p className="text-gray-800 font-medium animate-pulse text-lg">{t.analyzing}</p>
                   <p className="text-sm text-gray-400 mt-2">{t.checkingStandard}</p>
                 </div>
              </div>
            ) : localItem.feedback ? (
              <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
                {/* Status Banner */}
                <div className={`p-5 rounded-xl border flex items-center gap-5 shadow-sm ${getStatusColor(localItem.status)}`}>
                  {localItem.status === AuditStatus.APPROVED && <CheckCircle className="w-10 h-10 flex-shrink-0" />}
                  {localItem.status === AuditStatus.REJECTED && <XCircle className="w-10 h-10 flex-shrink-0" />}
                  {localItem.status === AuditStatus.WARNING && <AlertTriangle className="w-10 h-10 flex-shrink-0" />}
                  <div>
                    <p className="font-bold text-xl mb-1">{localItem.status}</p>
                    <p className="text-sm opacity-90 leading-tight">{localItem.feedback.summary}</p>
                  </div>
                </div>

                {/* Findings & Editor */}
                <div className="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col max-h-[400px]">
                  <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
                    <h4 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                      <Eye className="w-4 h-4" /> {t.keyFindings}
                    </h4>
                    {editableFindings.length > 0 && (
                      <button onClick={toggleSelectAll} className="text-xs text-blue-600 hover:text-blue-800 font-medium bg-blue-50 px-2 py-1 rounded">
                        {t.selectAll}
                      </button>
                    )}
                  </div>
                  
                  <div className="overflow-y-auto flex-1 p-2 space-y-2">
                    {editableFindings.map((finding, idx) => (
                      <div key={finding.id} className={`p-3 rounded-lg border transition-all ${finding.selected ? 'bg-blue-50 border-blue-200 shadow-inner' : 'bg-white border-gray-100 hover:border-blue-100 hover:shadow-sm'}`}>
                        <div className="flex items-start gap-3">
                           <button onClick={() => toggleSelection(finding.id)} className="mt-1 flex-shrink-0 text-gray-400 hover:text-blue-600 transition-colors">
                             {finding.selected ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5" />}
                           </button>
                           
                           <div className="flex-1">
                             {finding.isEditing ? (
                               <textarea 
                                 className="w-full text-sm p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                 rows={3}
                                 value={finding.text}
                                 onChange={(e) => updateText(finding.id, e.target.value)}
                               />
                             ) : (
                               <p className="text-sm text-gray-700 leading-relaxed cursor-pointer" onClick={() => toggleSelection(finding.id)}>{finding.text}</p>
                             )}
                           </div>

                           <button onClick={() => toggleEdit(finding.id)} className="mt-1 flex-shrink-0 text-gray-300 hover:text-gray-600 p-1 rounded hover:bg-gray-100">
                             {finding.isEditing ? <Save className="w-4 h-4 text-green-600" /> : <Edit3 className="w-4 h-4" />}
                           </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 border-t bg-gray-50 flex justify-end">
                    <button 
                      onClick={handleAddToReport}
                      disabled={editableFindings.filter(f => f.selected).length === 0}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm rounded-lg font-bold flex items-center gap-2 transition-all shadow-sm"
                    >
                      <PlusCircle className="w-4 h-4" />
                      {t.addToReport} ({editableFindings.filter(f => f.selected).length})
                    </button>
                  </div>
                </div>
                
                {/* Recommendation */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4 shadow-sm">
                  <h4 className="font-bold text-indigo-900 text-sm mb-2">{t.recommendation}</h4>
                  <p className="text-sm text-indigo-800 italic">
                    "{localItem.feedback.recommendation}"
                  </p>
                </div>

                {/* AI Chat Interface */}
                <ChatInterface 
                  language={language}
                  context={{
                    type: 'single_file',
                    summaryOrAnalysis: JSON.stringify(localItem.feedback),
                    imageData: localItem.fileData,
                    mimeType: localItem.mimeType
                  }}
                />

              </div>
            ) : (
              <div className="flex-1 border-2 border-dashed rounded-xl bg-white flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                   <Activity className="w-8 h-8 text-gray-300" />
                </div>
                <p className="font-medium">{t.emptyState}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
