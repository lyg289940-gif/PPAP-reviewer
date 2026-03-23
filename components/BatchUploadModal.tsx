import React, { useState, useRef, useEffect } from 'react';
import { PpapItem, Language } from '../types';
import { X, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items: PpapItem[];
  onUpload: (uploadedFiles: { item: PpapItem; fileData: string; mimeType: string }[]) => void;
  language: Language;
}

interface FileMatch {
  file: File;
  matchedItem: PpapItem | null;
  base64Data: string | null;
  mimeType: string | null;
  error: string | null;
}

const matchFileToItem = (fileName: string, items: PpapItem[]): PpapItem | null => {
  const lowerName = fileName.toLowerCase();
  
  const abbreviations: Record<string, number> = {
    'dfmea': 11,
    'pfmea': 12,
    'cpk': 17,
    'ppk': 17,
    'msa': 18,
    'bom': 20,
    'imds': 9,
    'pds': 22,
    'tmm': 23,
    'icl': 15,
    'cover': 0,
    '封面': 0,
    'dimension': 1,
    '尺寸': 1,
    'test plan': 2,
    '试验计划': 2,
    'functional': 3,
    '功能': 3,
    'material': 4,
    '材料': 4,
    'appearance': 5,
    '外观': 5,
    'spec': 6,
    '规范': 6,
    'drawing': 7,
    '图纸': 7,
    'legal': 8,
    '法规': 8,
    'flow': 13,
    '流程': 13,
    'control plan': 14,
    '控制计划': 14,
    'equipment': 16,
    '设备': 16,
    'tooling': 19,
    '工装': 19,
    'self assessment': 21,
    '自评': 21
  };

  for (const [abbr, id] of Object.entries(abbreviations)) {
    if (lowerName.includes(abbr)) {
      const matchedItem = items.find(i => i.id === id);
      if (matchedItem) return matchedItem;
    }
  }

  for (const item of items) {
    if (lowerName.includes(item.name.toLowerCase()) || 
        (item.name_zh && lowerName.includes(item.name_zh.toLowerCase()))) {
      return item;
    }
  }

  return null;
};

export const BatchUploadModal: React.FC<Props> = ({ isOpen, onClose, items, onUpload, language }) => {
  const [fileMatches, setFileMatches] = useState<FileMatch[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    setIsProcessing(true);
    const newMatches: FileMatch[] = [];

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        newMatches.push({
          file,
          matchedItem: null,
          base64Data: null,
          mimeType: null,
          error: language === 'zh' ? '文件超过10MB限制' : 'File exceeds 10MB limit'
        });
        continue;
      }

      const matchedItem = matchFileToItem(file.name, items);
      
      try {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        newMatches.push({
          file,
          matchedItem,
          base64Data,
          mimeType: file.type,
          error: null
        });
      } catch (error) {
        newMatches.push({
          file,
          matchedItem: null,
          base64Data: null,
          mimeType: null,
          error: language === 'zh' ? '读取文件失败' : 'Failed to read file'
        });
      }
    }

    setFileMatches(prev => [...prev, ...newMatches]);
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleItemChange = (index: number, itemId: string) => {
    const selectedItem = items.find(i => i.id.toString() === itemId) || null;
    setFileMatches(prev => {
      const newMatches = [...prev];
      newMatches[index].matchedItem = selectedItem;
      return newMatches;
    });
  };

  const handleRemoveFile = (index: number) => {
    setFileMatches(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    const validUploads = fileMatches
      .filter(m => m.matchedItem && m.base64Data && !m.error)
      .map(m => ({
        item: m.matchedItem!,
        fileData: m.base64Data!,
        mimeType: m.mimeType!
      }));

    if (validUploads.length > 0) {
      onUpload(validUploads);
    }
    setFileMatches([]);
    onClose();
  };

  const t = {
    title: language === 'zh' ? '批量上传文件' : 'Batch Upload Files',
    dragDrop: language === 'zh' ? '点击或拖拽多个文件到此处' : 'Click or drag multiple files here',
    support: language === 'zh' ? '支持 PDF, PNG, JPG (每个最大 10MB)' : 'Supports PDF, PNG, JPG (Max 10MB each)',
    fileName: language === 'zh' ? '文件名' : 'File Name',
    matchedItem: language === 'zh' ? '匹配的交付物' : 'Matched Deliverable',
    unmatched: language === 'zh' ? '未识别，请手动选择' : 'Unrecognized, please select manually',
    confirm: language === 'zh' ? '确认上传' : 'Confirm Upload',
    cancel: language === 'zh' ? '取消' : 'Cancel',
    processing: language === 'zh' ? '处理中...' : 'Processing...',
    noFiles: language === 'zh' ? '暂无文件' : 'No files selected',
  };

  const allMatched = fileMatches.length > 0 && fileMatches.every(m => m.matchedItem && !m.error);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">{t.title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div 
            className="border-2 border-dashed border-blue-200 rounded-xl p-8 text-center bg-blue-50/50 hover:bg-blue-50 transition-colors cursor-pointer mb-6"
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              multiple 
              accept=".pdf,image/png,image/jpeg"
              onChange={handleFileSelect}
            />
            <Upload className="w-10 h-10 text-blue-500 mx-auto mb-3" />
            <p className="text-blue-900 font-medium mb-1">{t.dragDrop}</p>
            <p className="text-blue-600/70 text-sm">{t.support}</p>
          </div>

          {fileMatches.length > 0 ? (
            <div className="space-y-3">
              {fileMatches.map((match, index) => (
                <div key={index} className={`flex items-center gap-4 p-4 rounded-xl border ${match.error ? 'border-red-200 bg-red-50' : match.matchedItem ? 'border-green-200 bg-green-50/30' : 'border-amber-200 bg-amber-50/30'}`}>
                  <FileText className={`w-6 h-6 flex-shrink-0 ${match.error ? 'text-red-500' : match.matchedItem ? 'text-green-500' : 'text-amber-500'}`} />
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate" title={match.file.name}>
                      {match.file.name}
                    </p>
                    {match.error && (
                      <p className="text-xs text-red-600 mt-1">{match.error}</p>
                    )}
                  </div>

                  <div className="w-64 flex-shrink-0">
                    <select
                      className={`w-full text-sm rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${!match.matchedItem && !match.error ? 'border-amber-400 ring-1 ring-amber-400' : ''}`}
                      value={match.matchedItem?.id.toString() || ''}
                      onChange={(e) => handleItemChange(index, e.target.value)}
                      disabled={!!match.error}
                    >
                      <option value="" disabled>{t.unmatched}</option>
                      {items.map(item => (
                        <option key={item.id} value={item.id}>
                          {language === 'zh' ? item.name_zh || item.name : item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button 
                    onClick={() => handleRemoveFile(index)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              {isProcessing ? t.processing : t.noFiles}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-200 rounded-xl transition-colors"
          >
            {t.cancel}
          </button>
          <button 
            onClick={handleConfirm}
            disabled={fileMatches.length === 0 || isProcessing || !allMatched}
            className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isProcessing ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            {t.confirm}
          </button>
        </div>
      </div>
    </div>
  );
};
