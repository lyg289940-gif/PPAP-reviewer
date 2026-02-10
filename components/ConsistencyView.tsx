
import React, { useState, useEffect } from 'react';
import { PpapItem, ConsistencyResult, ConsistencyRule, Language, Finding } from '../types';
import { runConsistencyCheck } from '../geminiService';
import { Activity, CheckCircle, AlertTriangle, Layers, FileText, RefreshCw, PlusCircle, CheckSquare, Square, Edit3, Save, AlertCircle } from 'lucide-react';
import { ChatInterface } from './ChatInterface';

// Define the critical dependency chains in PPAP based on Expert SQE requirements
const CONSISTENCY_RULES: ConsistencyRule[] = [
  {
    id: 'header_match',
    name: '1. Basic Info & Revision Match',
    name_zh: '1. 基础信息与版本一致性 (Basic Info)',
    description: 'Verifies that Part Name, Part Number, and Revision Level match exactly between the PPA Cover Sheet (0) and the Design Release/Drawing (7).',
    description_zh: '验证PPA报告封面(0)与设计发布/图纸(7)之间的零件名称、零件号和工程版本号是否完全一致。',
    requiredItemIds: [0, 7] 
  },
  {
    id: 'dim_vs_drawing',
    name: '2. Dimension Report Verification',
    name_zh: '2. 尺寸报告 vs 图纸关联 (Dim Verification)',
    description: 'Checks if dimensions marked on the Drawing (7) are fully covered in the Dimension Check Report (1), and validates if Out-of-Tolerance results are flagged.',
    description_zh: '检查图纸(7)上标注的尺寸是否在尺寸检查报告(1)中完全涵盖（全尺寸），并验证超差项是否已被识别。',
    requiredItemIds: [7, 1]
  },
  {
    id: 'sc_traceability',
    name: '3. Special Characteristics "Golden Thread"',
    name_zh: '3. 特殊特性“金线”追溯 (Golden Thread)',
    description: 'Deep dive check: Verifies SC flow (Drawing->ICL->FMEA->CP) AND checks consistency of specs/tolerances across all documents. Includes expert risk assessment.',
    description_zh: '深度审查：1.检查特殊特性在图纸->ICL->FMEA->CP的传递；2.验证各文件中尺寸/技术要求内容的一致性；3.专家级风险评估；4.其它发现。',
    requiredItemIds: [7, 15, 11, 12, 14]
  },
  {
    id: 'process_chain',
    name: '4. Process Logic Alignment',
    name_zh: '4. 过程逻辑一致性 (Process Chain)',
    description: 'Verifies that Operation Numbers (Op 10, 20...) and descriptions match exactly across Flow Chart (13), PFMEA (12), and Control Plan (14).',
    description_zh: '验证过程流程图(13)、PFMEA(12)和控制计划(14)中的工序编号（如Op 10, 20）及工序描述是否完全一致。',
    requiredItemIds: [13, 12, 14] 
  },
  {
    id: 'qa_consistency',
    name: '5. QA System Alignment (MSA & SPC)',
    name_zh: '5. 质量保证系统关联 (MSA & SPC)',
    description: 'Checks if Gauges in Control Plan (14) match MSA studies (18), and if Special Characteristics in Control Plan match SPC studies (17).',
    description_zh: '检查控制计划(14)中的量具是否有对应的MSA分析(18)，以及控制计划中的特殊特性是否进行了SPC初始能力研究(17)。',
    requiredItemIds: [14, 18, 17]
  }
];

interface Props {
  items: PpapItem[];
  language: Language;
  onAddFindings: (findings: Finding[]) => void;
  results: Record<string, ConsistencyResult>;
  onUpdateResult: (ruleId: string, result: ConsistencyResult) => void;
}

interface EditableDiscrepancy {
  id: string;
  text: string;
  selected: boolean;
  isEditing: boolean;
}

export const ConsistencyView: React.FC<Props> = ({ items, language, onAddFindings, results, onUpdateResult }) => {
  const [loadingRuleId, setLoadingRuleId] = useState<string | null>(null);
  const [editableDiscrepancies, setEditableDiscrepancies] = useState<Record<string, EditableDiscrepancy[]>>({});
  const [ignoredMissing, setIgnoredMissing] = useState<Record<string, boolean>>({});

  // Sync initial discrepancies from props if available and not yet in local state
  useEffect(() => {
    Object.keys(results).forEach(ruleId => {
       if (results[ruleId] && !editableDiscrepancies[ruleId]) {
         const initials = results[ruleId].discrepancies.map((d, i) => ({
           id: `${ruleId}-disc-${Date.now()}-${i}`,
           text: d,
           selected: false,
           isEditing: false
         }));
         setEditableDiscrepancies(prev => ({...prev, [ruleId]: initials}));
       }
    });
  }, [results, editableDiscrepancies]);

  const t = {
    title: language === 'zh' ? '多文档关联 & 一致性分析' : 'Cross-Document Correlation Analysis',
    subtitle: language === 'zh' ? '基于专家经验的五维深度审核模型。本 Agent 会交叉对比图纸、FMEA、控制计划、MSA等核心文件，捕捉人工审核容易遗漏的逻辑断层。' : 'Expert-level 5-dimensional audit model. The agent cross-references Drawings, FMEA, Control Plans, MSA, etc., to catch logical disconnects often missed by manual review.',
    agentFindings: language === 'zh' ? '智能分析发现' : 'Agent Findings',
    score: language === 'zh' ? '一致性得分' : 'Score',
    discrepancies: language === 'zh' ? '差异点 (可编辑 & 确认)' : 'Discrepancies (Edit & Confirm)',
    noDiscrepancies: language === 'zh' ? '逻辑严密，未发现明显差异。' : 'Logic is sound. No discrepancies found.',
    reRun: language === 'zh' ? '重新分析' : 'Re-run Analysis',
    analyzing: language === 'zh' ? '正在进行深度关联分析...' : 'Performing Deep Correlation Analysis...',
    runCheck: language === 'zh' ? '运行检查' : 'Run Check',
    runPartial: language === 'zh' ? '运行部分分析' : 'Run Partial Analysis',
    ignoreMissing: language === 'zh' ? '忽略未上传文件，强制运行' : 'Ignore missing files, force run',
    missingDocs: language === 'zh' ? '没有可用的文档进行分析。请至少上传一个相关文档。' : 'No available documents for analysis. Please upload at least one related document.',
    failed: language === 'zh' ? '分析失败' : 'Failed to run consistency check.',
    addToReport: language === 'zh' ? '确认并添加到报告' : 'Confirm & Add to Report',
    added: language === 'zh' ? '已添加!' : 'Added!',
    partialWarning: language === 'zh' ? '缺少文档可能导致分析不完整。' : 'Missing documents may lead to incomplete analysis.'
  };

  const getItem = (id: number) => items.find(i => i.id === id);

  const handleRunCheck = async (rule: ConsistencyRule) => {
    // Gather relevant items
    const relevantItems = rule.requiredItemIds.map(id => getItem(id));
    // Filter for uploaded items (even if still PENDING audit)
    const uploadedItems = relevantItems.filter(i => i?.fileData);
    
    // Allow running if at least 1 document is present
    if (uploadedItems.length === 0) {
      alert(t.missingDocs);
      return;
    }

    setLoadingRuleId(rule.id);
    try {
      const documents = (uploadedItems as PpapItem[]).map(i => ({
        name: language === 'zh' && i.name_zh ? i.name_zh : i.name,
        data: i.fileData!,
        mimeType: i.mimeType || 'application/pdf'
      }));

      const result = await runConsistencyCheck(rule.id, documents, language);
      onUpdateResult(rule.id, result);
      
      // Initialize editable discrepancies (force reset on new run)
      const initials = result.discrepancies.map((d, i) => ({
        id: `${rule.id}-disc-${Date.now()}-${i}`,
        text: d,
        selected: false,
        isEditing: false
      }));
      setEditableDiscrepancies(prev => ({...prev, [rule.id]: initials}));

    } catch (e) {
      console.error(e);
      alert(t.failed);
    } finally {
      setLoadingRuleId(null);
    }
  };

  // Helper functions for interactivity
  const toggleSelection = (ruleId: string, discId: string) => {
    setEditableDiscrepancies(prev => ({
      ...prev,
      [ruleId]: prev[ruleId].map(d => d.id === discId ? { ...d, selected: !d.selected } : d)
    }));
  };

  const toggleEdit = (ruleId: string, discId: string) => {
    setEditableDiscrepancies(prev => ({
      ...prev,
      [ruleId]: prev[ruleId].map(d => d.id === discId ? { ...d, isEditing: !d.isEditing } : d)
    }));
  };

  const updateText = (ruleId: string, discId: string, newText: string) => {
    setEditableDiscrepancies(prev => ({
      ...prev,
      [ruleId]: prev[ruleId].map(d => d.id === discId ? { ...d, text: newText } : d)
    }));
  };

  const toggleIgnoreMissing = (ruleId: string) => {
    setIgnoredMissing(prev => ({ ...prev, [ruleId]: !prev[ruleId] }));
  };

  const handleAddToReport = (rule: ConsistencyRule) => {
    const list = editableDiscrepancies[rule.id];
    const selected = list.filter(d => d.selected);
    if (selected.length === 0) return;

    const newFindings: Finding[] = selected.map(d => ({
      id: d.id,
      source: language === 'zh' && rule.name_zh ? rule.name_zh : rule.name,
      category: "Consistency Check",
      description: d.text,
      timestamp: new Date()
    }));

    onAddFindings(newFindings);
    
    // Unselect after adding
    setEditableDiscrepancies(prev => ({
        ...prev,
        [rule.id]: prev[rule.id].map(d => ({...d, selected: false}))
    }));
    alert(t.added);
  };

  const getStatusColor = (status?: string) => {
    switch(status) {
      case 'PASS': return 'bg-green-100 text-green-700 border-green-200';
      case 'FAIL': return 'bg-red-100 text-red-700 border-red-200';
      case 'WARNING': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      
      {/* Intro Header */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-800 rounded-xl p-8 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Layers className="w-8 h-8 opacity-80" />
              {t.title}
            </h2>
            <p className="mt-2 text-blue-100 max-w-3xl leading-relaxed opacity-90">
              {t.subtitle}
            </p>
          </div>
          <div className="hidden lg:block opacity-20">
            <Activity className="w-32 h-32" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {CONSISTENCY_RULES.map(rule => {
          const result = results[rule.id];
          const requiredItems = rule.requiredItemIds.map(id => getItem(id));
          const ruleName = language === 'zh' && rule.name_zh ? rule.name_zh : rule.name;
          const ruleDesc = language === 'zh' && rule.description_zh ? rule.description_zh : rule.description;
          
          // Determine readiness
          const uploadedCount = requiredItems.filter(i => i?.fileData).length;
          const totalRequired = requiredItems.length;
          const isFullReady = uploadedCount === totalRequired;
          const isPartialReady = uploadedCount > 0 && uploadedCount < totalRequired;
          const isMissingIgnored = ignoredMissing[rule.id];

          const discrepancies = editableDiscrepancies[rule.id] || [];

          return (
            <div key={rule.id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col md:flex-row transition-all hover:shadow-lg">
              
              {/* Left Side: Rule Info & Action */}
              <div className="p-6 md:w-1/3 bg-gray-50 border-r border-gray-100 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-gray-800 leading-tight">{ruleName}</h3>
                  </div>
                  <p className="text-gray-500 text-sm mb-6">{ruleDesc}</p>
                  
                  {/* Document Dependency Status */}
                  <div className="space-y-2 mb-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{language === 'zh' ? '所需文件' : 'Required Documents'}</p>
                    {requiredItems.map((item, idx) => (
                      <div key={idx} className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border ${item?.fileData ? 'bg-white text-gray-700 border-gray-200 shadow-sm' : 'bg-gray-100 text-gray-400 border-gray-200 border-dashed'}`}>
                        <div className="flex items-center gap-2">
                           <FileText className="w-3 h-3" />
                           <span className="truncate max-w-[150px]">{language === 'zh' && item?.name_zh ? item.name_zh : item?.name}</span>
                        </div>
                        {item?.fileData ? <CheckCircle className="w-4 h-4 text-green-500" /> : <div className="w-2 h-2 rounded-full bg-gray-300"></div>}
                      </div>
                    ))}
                  </div>

                  {/* Missing File Override Checkbox */}
                  {isPartialReady && (
                    <div className="mb-4 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      <label className="flex items-start gap-2 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={isMissingIgnored}
                          onChange={() => toggleIgnoreMissing(rule.id)}
                          className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-gray-300" 
                        />
                        <div className="flex-1">
                           <span className="text-xs font-bold text-gray-700 block">{t.ignoreMissing}</span>
                           <span className="text-[10px] text-gray-500 leading-tight block mt-0.5">{t.partialWarning}</span>
                        </div>
                      </label>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleRunCheck(rule)}
                  disabled={(isPartialReady && !isMissingIgnored) || (!isPartialReady && !isFullReady) || loadingRuleId === rule.id}
                  className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all
                    ${(isFullReady || (isPartialReady && isMissingIgnored))
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md' 
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                >
                  {loadingRuleId === rule.id ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> {t.analyzing}
                    </>
                  ) : (isFullReady || (isPartialReady && isMissingIgnored)) ? (
                    <>
                      <Activity className="w-4 h-4" /> 
                      {isPartialReady ? t.runPartial : t.runCheck}
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" /> {language === 'zh' ? `缺少文件` : `Missing docs`}
                    </>
                  )}
                </button>
              </div>

              {/* Right Side: Analysis Results */}
              <div className="p-6 md:w-2/3 flex flex-col justify-center min-h-[300px]">
                {result ? (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b">
                       <h4 className="font-bold text-gray-800 flex items-center gap-2">
                         <Layers className="w-5 h-5 text-blue-600" /> {t.agentFindings}
                       </h4>
                       <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(result.status)}`}>
                            {result.status}
                          </span>
                          <div className="text-xs text-gray-500">{t.score}: <span className="font-bold text-gray-800 text-lg">{result.score}</span></div>
                       </div>
                    </div>
                    
                    <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 mb-6">
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {result.analysis}
                      </p>
                    </div>

                    <div className="flex-1 flex flex-col">
                       <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                         {t.discrepancies} 
                         <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full text-[10px]">{discrepancies.length}</span>
                       </h5>
                       
                       {discrepancies.length > 0 ? (
                         <div className="space-y-2 mb-4">
                           {discrepancies.map((d, i) => (
                             <div key={d.id} className={`flex items-start gap-3 text-sm p-3 rounded-lg border transition-all ${d.selected ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
                               <button onClick={() => toggleSelection(rule.id, d.id)} className="mt-0.5 text-gray-400 hover:text-blue-600">
                                 {d.selected ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5" />}
                               </button>
                               <div className="flex-1">
                                  {d.isEditing ? (
                                    <textarea 
                                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                      value={d.text}
                                      onChange={(e) => updateText(rule.id, d.id, e.target.value)}
                                      rows={2}
                                    />
                                  ) : (
                                    <span className="text-gray-700 cursor-pointer" onClick={() => toggleSelection(rule.id, d.id)}>{d.text}</span>
                                  )}
                               </div>
                               <button onClick={() => toggleEdit(rule.id, d.id)} className="text-gray-300 hover:text-gray-600">
                                 {d.isEditing ? <Save className="w-4 h-4 text-green-600" /> : <Edit3 className="w-4 h-4" />}
                               </button>
                             </div>
                           ))}
                         </div>
                       ) : (
                         <div className="flex items-center gap-2 text-green-700 bg-green-50 p-4 rounded-lg border border-green-100 text-sm mb-4">
                           <CheckCircle className="w-5 h-5" />
                           {t.noDiscrepancies}
                         </div>
                       )}

                       {discrepancies.length > 0 && (
                         <div className="flex justify-end">
                           <button 
                             onClick={() => handleAddToReport(rule)}
                             disabled={discrepancies.filter(d => d.selected).length === 0}
                             className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm rounded-lg font-medium flex items-center gap-2 transition-colors"
                           >
                             <PlusCircle className="w-4 h-4" />
                             {t.addToReport} ({discrepancies.filter(d => d.selected).length})
                           </button>
                         </div>
                       )}

                       {/* New Chat Interface for Consistency */}
                       <ChatInterface 
                         language={language}
                         context={{
                           type: 'consistency',
                           summaryOrAnalysis: result.analysis
                         }}
                       />

                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-300">
                    <Layers className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-sm font-medium">{language === 'zh' ? '准备就绪。点击左侧按钮开始分析。' : 'Ready to analyze. Click the button on the left.'}</p>
                    <p className="text-xs mt-2 opacity-60">{language === 'zh' ? '这可能需要几秒钟时间。' : 'This may take a few seconds.'}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
