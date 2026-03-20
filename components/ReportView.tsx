
import React from 'react';
import { Finding, Language } from '../types';
import { Download, FileText, ClipboardList, Trash2 } from 'lucide-react';

interface Props {
  findings: Finding[];
  language: Language;
  onRemoveFinding: (id: string) => void;
}

export const ReportView: React.FC<Props> = ({ findings, language, onRemoveFinding }) => {
  const t = {
    title: language === 'zh' ? '审核发现报告' : 'Audit Findings Report',
    subtitle: language === 'zh' ? '汇总所有已确认的审核问题点，并生成整改清单。' : 'Consolidated list of confirmed findings for supplier rectification.',
    noFindings: language === 'zh' ? '暂无确认的发现项目。请在“检查清单”或“关联分析”中添加问题点。' : 'No confirmed findings yet. Add findings from "Checklist" or "Correlation" tabs.',
    export: language === 'zh' ? '导出报告 (HTML)' : 'Export Report (HTML)',
    source: language === 'zh' ? '来源' : 'Source',
    category: language === 'zh' ? '分类' : 'Category',
    description: language === 'zh' ? '问题描述' : 'Description',
    action: language === 'zh' ? '操作' : 'Action'
  };

  const handleExport = () => {
    const date = new Date().toLocaleDateString();
    // Generate a unique ID for this specific export instance to prevent collision with other reports
    const reportId = `ppap_report_${new Date().getTime()}`;
    
    // Group by Source
    const grouped = findings.reduce((acc, finding) => {
      if (!acc[finding.source]) acc[finding.source] = [];
      acc[finding.source].push(finding);
      return acc;
    }, {} as Record<string, Finding[]>);

    const sourceOptions = Object.keys(grouped).map(source => `<option value="${source}">${source}</option>`).join('');

    // Translations for the exported report
    const tr = {
      feedbackTitle: language === 'zh' ? '供应商反馈 (Supplier Use Only)' : 'Supplier Feedback',
      rootCause: language === 'zh' ? '根本原因 / 整改措施' : 'Root Cause / Corrective Action',
      targetDate: language === 'zh' ? '预计完成日期' : 'Target Date',
      statusLabel: language === 'zh' ? '状态确认' : 'Status',
      statusDone: language === 'zh' ? '已完成 (Done)' : 'Completed',
      statusNA: language === 'zh' ? '不涉及 (N/A)' : 'Not Applicable',
      statusPlan: language === 'zh' ? '计划中 (Pending)' : 'Plan Accepted',
      instruction: language === 'zh' 
        ? '填写说明：系统会自动保存您的输入（本地缓存）。刷新页面数据不会丢失。完成后请打印为 PDF。' 
        : 'Instructions: Your inputs are auto-saved locally. Refreshing won\'t lose data. Print to PDF when done.',
      sqeSection: language === 'zh' ? '审核发现' : 'Findings',
      autoSave: language === 'zh' ? '自动保存开启' : 'Auto-save Active',
      clearData: language === 'zh' ? '清除填写数据' : 'Clear Form Data'
    };

    const htmlContent = `
<!DOCTYPE html>
<html lang="${language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PPAP Audit Action Report</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; background-color: #f9fafb; }
      textarea { resize: vertical; min-height: 80px; }
      @media print {
        .no-print { display: none !important; }
        body { background-color: white; padding: 0; }
        .page-break { page-break-inside: avoid; }
        input[type="text"], input[type="date"], textarea {
          border: 1px solid #e5e7eb;
          background: white;
        }
        /* Ensure inputs show values when printed */
        textarea { white-space: pre-wrap; }
      }
      /* Custom Checkbox Style for Print */
      .print-checkbox {
         appearance: none;
         width: 16px;
         height: 16px;
         border: 2px solid #cbd5e1;
         border-radius: 4px;
         display: inline-block;
         vertical-align: middle;
         margin-right: 4px;
      }
      .print-checkbox:checked {
        background-color: #2563eb;
        border-color: #2563eb;
        background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e");
      }
    </style>
</head>
<body class="p-8 min-h-screen">
    <div class="max-w-5xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden print:shadow-none print:max-w-none">
        <!-- Header -->
        <div class="bg-slate-900 text-white p-8 print:bg-slate-900 print:text-white">
            <div class="flex justify-between items-start">
                <div>
                    <h1 class="text-2xl font-bold mb-2">PPAP Corrective Action Report</h1>
                    <p class="opacity-80 text-sm"></p>
                </div>
                <div class="text-right">
                    <p class="font-mono text-blue-200 text-sm">DATE: ${date}</p>
                    <p class="font-mono text-blue-200 text-sm">TOTAL ITEMS: ${findings.length}</p>
                    <p class="font-mono text-gray-500 text-[10px] mt-1 print:hidden">ID: ${reportId}</p>
                </div>
            </div>
        </div>

        <!-- Instructions & Auto-save Status -->
        <div class="bg-blue-50 p-4 border-b border-blue-100 flex justify-between items-center print:bg-gray-50 print:text-gray-600 print:border-gray-200">
            <div class="text-blue-800 text-sm font-medium flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
                ${tr.instruction}
            </div>
            <div class="text-xs font-bold text-green-600 flex items-center gap-1 print:hidden" id="saveStatus">
               <span class="relative flex h-2 w-2">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
               ${tr.autoSave}
            </div>
        </div>

        <!-- Controls (No Print) -->
        <div class="p-6 pb-2 no-print flex items-center justify-between bg-gray-50 border-b">
            <div class="flex items-center gap-3">
                <label for="filterSource" class="text-sm font-semibold text-gray-600">Filter View:</label>
                <select id="filterSource" class="border rounded px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none shadow-sm">
                    <option value="all">Show All Documents</option>
                    ${sourceOptions}
                </select>
            </div>
            <div class="flex gap-2">
                <button onclick="clearData()" class="bg-white hover:bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    ${tr.clearData}
                </button>
                <button onclick="window.print()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print / Save as PDF
                </button>
            </div>
        </div>

        <!-- Findings List -->
        <div class="p-8 space-y-8">
            
            ${Object.keys(grouped).map(source => `
                <div class="finding-group" data-source="${source}">
                    <div class="flex items-center gap-3 mb-4 pb-2 border-b-2 border-slate-200">
                        <div class="p-1.5 bg-slate-800 rounded">
                           <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                           </svg>
                        </div>
                        <h3 class="text-xl font-bold text-slate-800">${source}</h3>
                    </div>

                    <div class="space-y-6">
                        ${grouped[source].map((f, i) => `
                            <div class="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden page-break">
                                <div class="flex flex-col md:flex-row">
                                    <!-- Left: SQE Finding -->
                                    <div class="md:w-5/12 p-5 bg-slate-50 border-b md:border-b-0 md:border-r border-gray-200">
                                        <div class="flex items-center justify-between mb-3">
                                            <span class="bg-slate-200 text-slate-600 px-2 py-1 rounded text-xs font-bold font-mono">#${i + 1}</span>
                                            <span class="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-red-200">${f.category}</span>
                                        </div>
                                        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">${tr.sqeSection}</h4>
                                        <p class="text-gray-800 text-sm leading-relaxed font-medium">${f.description}</p>
                                        <div class="mt-4 text-xs text-gray-400">Reported: ${new Date(f.timestamp).toLocaleString()}</div>
                                    </div>

                                    <!-- Right: Supplier Feedback -->
                                    <div class="md:w-7/12 p-5 bg-white">
                                        <h4 class="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                            </svg>
                                            ${tr.feedbackTitle}
                                        </h4>
                                        
                                        <div class="space-y-4">
                                            <div>
                                                <label class="block text-xs font-semibold text-gray-500 mb-1">${tr.rootCause}</label>
                                                <textarea id="rc_${f.id}" class="save-me w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50" rows="3" placeholder="..."></textarea>
                                            </div>

                                            <div class="flex flex-col sm:flex-row gap-4">
                                                <div class="flex-1">
                                                    <label class="block text-xs font-semibold text-gray-500 mb-1">${tr.targetDate}</label>
                                                    <input type="date" id="date_${f.id}" class="save-me w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50">
                                                </div>
                                                <div class="flex-1">
                                                    <label class="block text-xs font-semibold text-gray-500 mb-2">${tr.statusLabel}</label>
                                                    <div class="flex flex-col gap-2">
                                                        <label class="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                                                            <input type="checkbox" id="chk_done_${f.id}" class="save-me print-checkbox">
                                                            <span class="text-gray-700 text-xs font-medium">${tr.statusDone}</span>
                                                        </label>
                                                        <label class="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                                                            <input type="checkbox" id="chk_na_${f.id}" class="save-me print-checkbox">
                                                            <span class="text-gray-700 text-xs font-medium">${tr.statusNA}</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
            
            <div id="noResults" class="hidden text-center text-gray-400 py-10 border-2 border-dashed rounded-xl">
                No findings match the selected filter.
            </div>
        </div>

        <!-- Footer -->
        <div class="bg-gray-50 p-8 text-center border-t border-gray-200">
             <div class="flex justify-center gap-8 text-xs text-gray-400 mb-4">
                <div class="border-t border-gray-300 w-32 pt-1">Supplier Signature</div>
                <div class="border-t border-gray-300 w-32 pt-1">Date</div>
                <div class="border-t border-gray-300 w-32 pt-1">SQE Confirmation</div>
             </div>
            <p class="text-[10px] text-gray-300 uppercase tracking-widest">AutoSQE AI • Professional Audit Report</p>
        </div>
    </div>

    <script>
        const REPORT_ID = "${reportId}"; // Unique ID generated at export time
        const STORAGE_KEY = 'ppap_report_data_' + REPORT_ID;
        const saveStatusEl = document.getElementById('saveStatus');

        // Restore data on load
        window.addEventListener('DOMContentLoaded', () => {
            const savedData = localStorage.getItem(STORAGE_KEY);
            if (savedData) {
                try {
                    const data = JSON.parse(savedData);
                    Object.keys(data).forEach(id => {
                        const el = document.getElementById(id);
                        if (el) {
                            if (el.type === 'checkbox') el.checked = data[id];
                            else el.value = data[id];
                        }
                    });
                } catch(e) { console.error('Error loading save', e); }
            }
        });

        // Save data on input
        const inputs = document.querySelectorAll('.save-me');
        inputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
                const el = e.target;
                if (el.type === 'checkbox') {
                    data[el.id] = el.checked;
                    // Logic to ensure mutual exclusivity if needed, for now allow both
                    if (el.id.startsWith('chk_done_') && el.checked) {
                        const naId = el.id.replace('chk_done_', 'chk_na_');
                        const naEl = document.getElementById(naId);
                        if (naEl) { naEl.checked = false; data[naId] = false; }
                    }
                     if (el.id.startsWith('chk_na_') && el.checked) {
                        const doneId = el.id.replace('chk_na_', 'chk_done_');
                        const doneEl = document.getElementById(doneId);
                        if (doneEl) { doneEl.checked = false; data[doneId] = false; }
                    }
                } else {
                    data[el.id] = el.value;
                }
                
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
                } catch (e) {
                    console.error("Failed to save report data to localStorage:", e);
                }
                
                // Visual feedback
                saveStatusEl.style.opacity = '1';
                setTimeout(() => { saveStatusEl.style.opacity = '0.5'; }, 500);
            });
        });

        function clearData() {
            if(confirm('Are you sure you want to clear all entered data for this report?')) {
                localStorage.removeItem(STORAGE_KEY);
                location.reload();
            }
        }

        // Filter Logic
        const filterSelect = document.getElementById('filterSource');
        const groups = document.querySelectorAll('.finding-group');
        const noResults = document.getElementById('noResults');

        filterSelect.addEventListener('change', (e) => {
            const selected = e.target.value;
            let visibleCount = 0;

            groups.forEach(group => {
                const source = group.getAttribute('data-source');
                if (selected === 'all' || source === selected) {
                    group.style.display = 'block';
                    visibleCount++;
                } else {
                    group.style.display = 'none';
                }
            });

            if (visibleCount === 0) {
                noResults.classList.remove('hidden');
            } else {
                noResults.classList.add('hidden');
            }
        });
    </script>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PPAP_Action_Report_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Group findings for display
  const groupedFindings = findings.reduce((acc, finding) => {
    const key = finding.source;
    if (!acc[key]) acc[key] = [];
    acc[key].push(finding);
    return acc;
  }, {} as Record<string, Finding[]>);

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-600" />
            {t.title}
          </h2>
          <p className="text-gray-500 text-sm mt-1">{t.subtitle}</p>
        </div>
        <button
          onClick={handleExport}
          disabled={findings.length === 0}
          className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm
            ${findings.length > 0 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
        >
          <Download className="w-5 h-5" />
          {t.export}
        </button>
      </div>

      {findings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <FileText className="w-16 h-16 text-gray-200 mb-4" />
          <p className="text-gray-400 font-medium">{t.noFindings}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(groupedFindings).map(source => (
            <div key={source} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex items-center gap-2">
                <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
                <h3 className="font-bold text-gray-800">{source}</h3>
                <span className="ml-auto text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                  {groupedFindings[source].length}
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {groupedFindings[source].map((finding, idx) => (
                  <div key={finding.id} className="p-4 hover:bg-gray-50 transition-colors flex items-start gap-4 group">
                    <span className="text-gray-400 text-sm font-mono mt-0.5 w-6">{idx + 1}.</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                         <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                           {finding.category}
                         </span>
                         <span className="text-xs text-gray-400">
                           {new Date(finding.timestamp).toLocaleTimeString()}
                         </span>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">{finding.description}</p>
                    </div>
                    <button 
                      onClick={() => onRemoveFinding(finding.id)}
                      className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
