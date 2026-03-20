import React, { useState } from 'react';
import { ExemptionRule, Language } from '../types';
import { ShieldOff, Trash2, Calendar, Edit3, Plus, X, Check } from 'lucide-react';
import { PPAP_MASTER_LIST } from '../constants';

interface Props {
  exemptions: ExemptionRule[];
  language: Language;
  onRemoveExemption: (id: string) => void;
  onAddExemption: (rule: ExemptionRule) => void;
  onEditExemption: (rule: ExemptionRule) => void;
}

export const ExemptionsView: React.FC<Props> = ({ exemptions, language, onRemoveExemption, onAddExemption, onEditExemption }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [selectedDoc, setSelectedDoc] = useState<string>('');
  const [summaryText, setSummaryText] = useState<string>('');

  const t = {
    title: language === 'zh' ? '永久豁免清单' : 'Permanent Exemption Rules',
    subtitle: language === 'zh' ? 'AI在审核时将忽略这些已豁免的问题。' : 'The AI will ignore these exempted issues during audits.',
    empty: language === 'zh' ? '暂无豁免规则。您可以在审核文件时添加豁免。' : 'No exemption rules yet. You can add exemptions when auditing documents.',
    document: language === 'zh' ? '适用文件' : 'Document',
    rule: language === 'zh' ? '豁免规则' : 'Exemption Rule',
    date: language === 'zh' ? '创建日期' : 'Date Created',
    remove: language === 'zh' ? '移除' : 'Remove',
    edit: language === 'zh' ? '编辑' : 'Edit',
    add: language === 'zh' ? '添加豁免' : 'Add Exemption',
    save: language === 'zh' ? '保存' : 'Save',
    cancel: language === 'zh' ? '取消' : 'Cancel',
    selectDoc: language === 'zh' ? '选择适用的文件...' : 'Select applicable document...',
    enterRule: language === 'zh' ? '输入豁免规则详情...' : 'Enter exemption rule details...'
  };

  const handleStartAdd = () => {
    setSelectedDoc('');
    setSummaryText('');
    setIsAdding(true);
    setEditingId(null);
  };

  const handleStartEdit = (rule: ExemptionRule) => {
    setSelectedDoc(rule.documentName);
    setSummaryText(rule.summary);
    setEditingId(rule.id);
    setIsAdding(false);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!selectedDoc || !summaryText.trim()) return;

    if (isAdding) {
      onAddExemption({
        id: Date.now().toString(),
        documentName: selectedDoc,
        summary: summaryText.trim(),
        createdAt: new Date().toISOString()
      });
      setIsAdding(false);
    } else if (editingId) {
      const existing = exemptions.find(e => e.id === editingId);
      if (existing) {
        onEditExemption({
          ...existing,
          documentName: selectedDoc,
          summary: summaryText.trim()
        });
      }
      setEditingId(null);
    }
  };

  const renderForm = () => (
    <div className="border-2 border-amber-400 rounded-xl p-4 bg-amber-50/50 flex flex-col gap-4 shadow-sm mb-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-bold text-gray-700">{t.document}</label>
        <select 
          value={selectedDoc}
          onChange={(e) => setSelectedDoc(e.target.value)}
          className="p-2 border rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-none"
        >
          <option value="" disabled>{t.selectDoc}</option>
          {PPAP_MASTER_LIST.map(item => {
            const docName = language === 'zh' && item.name_zh ? item.name_zh : item.name;
            return (
              <option key={item.id} value={docName}>
                {docName}
              </option>
            );
          })}
        </select>
      </div>
      
      <div className="flex flex-col gap-2">
        <label className="text-sm font-bold text-gray-700">{t.rule}</label>
        <textarea 
          value={summaryText}
          onChange={(e) => setSummaryText(e.target.value)}
          placeholder={t.enterRule}
          className="p-3 border rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-none min-h-[100px] resize-y"
        />
      </div>

      <div className="flex items-center justify-end gap-2 mt-2">
        <button 
          onClick={handleCancel}
          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
        >
          {t.cancel}
        </button>
        <button 
          onClick={handleSave}
          disabled={!selectedDoc || !summaryText.trim()}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white rounded-lg transition-colors text-sm font-bold flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          {t.save}
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <ShieldOff className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">{t.title}</h2>
        </div>
        {!isAdding && (
          <button 
            onClick={handleStartAdd}
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-sm font-bold transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t.add}
          </button>
        )}
      </div>
      <p className="text-gray-500 mb-6 ml-13">{t.subtitle}</p>

      {isAdding && renderForm()}

      {exemptions.length === 0 && !isAdding ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed">
          <ShieldOff className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t.empty}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {exemptions.map(rule => {
            if (editingId === rule.id) {
              return <div key={rule.id}>{renderForm()}</div>;
            }

            return (
              <div key={rule.id} className="border rounded-xl p-4 hover:border-amber-200 hover:shadow-sm transition-all bg-white flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md">
                      {rule.documentName}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(rule.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-800 font-medium">{rule.summary}</p>
                </div>
                
                <div className="flex items-center sm:items-start justify-end gap-1">
                  <button 
                    onClick={() => handleStartEdit(rule)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title={t.edit}
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => onRemoveExemption(rule.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title={t.remove}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
