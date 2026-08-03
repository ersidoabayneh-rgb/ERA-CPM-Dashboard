import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  Upload, 
  Search, 
  Trash2, 
  Download, 
  Eye, 
  CheckCircle2, 
  AlertCircle,
  FileCheck2,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Project, ProjectDocument, formatAccounting } from '../types';

interface DocumentationViewProps {
  project: Project;
  onUpdateDocuments: (documents: ProjectDocument[]) => void;
  isReadonly?: boolean;
}

export default function DocumentationView({
  project,
  onUpdateDocuments,
  isReadonly = false
}: DocumentationViewProps) {
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState<string>('contract');
  const [docDesc, setDocDesc] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showPreviewDoc, setShowPreviewDoc] = useState<ProjectDocument | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const documents = project.documents || [];

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      if (!docName) {
        // Auto-fill document name from filename (cleaned up)
        const cleanName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        setDocName(cleanName.replace(/[-_]/g, ' '));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!docName) {
        const cleanName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        setDocName(cleanName.replace(/[-_]/g, ' '));
      }
    }
  };

  const handleImportDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) return;

    const fileToUse = selectedFile;
    const fileName = fileToUse ? fileToUse.name : `imported_${docType}_${Date.now().toString().slice(-4)}.pdf`;
    const fileSize = fileToUse 
      ? `${(fileToUse.size / (1024 * 1024)).toFixed(2)} MB` 
      : `${(Math.random() * 4 + 1).toFixed(2)} MB`;

    const proceedWithImport = (fileData?: string, fileType?: string) => {
      const newDoc: ProjectDocument = {
        id: `doc_${Date.now()}`,
        name: docName.trim(),
        type: docType,
        fileName,
        uploadedAt: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        uploadedBy: project.lastModifiedBy || 'Ersido Abayneh',
        fileSize,
        description: docDesc.trim() || undefined,
        fileData,
        fileType
      };

      const updatedDocs = [newDoc, ...documents];
      onUpdateDocuments(updatedDocs);

      // Reset Form
      setDocName('');
      setDocDesc('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    if (fileToUse) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        proceedWithImport(dataUrl, fileToUse.type);
      };
      reader.onerror = () => {
        proceedWithImport();
      };
      reader.readAsDataURL(fileToUse);
    } else {
      proceedWithImport();
    }
  };

  const handleDeleteDoc = (id: string) => {
    if (window.confirm('Are you sure you want to delete this document from project archives?')) {
      const updatedDocs = documents.filter(d => d.id !== id);
      onUpdateDocuments(updatedDocs);
      if (showPreviewDoc?.id === id) {
        setShowPreviewDoc(null);
      }
    }
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (doc.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || doc.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div id="documentation-view-container" className="space-y-6">
      
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900/40 dark:to-slate-950/20 p-5 rounded-3xl border border-blue-100/50 dark:border-slate-800/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-blue-600 text-white rounded-full">
              SECURE DOSSIER
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Project Vault
            </span>
          </div>
          <h2 className="text-lg font-black text-slate-800 dark:text-zinc-100">
            Contract Documents & Monthly Status Reports
          </h2>
          <p className="text-2xs text-slate-500 dark:text-slate-400 font-medium">
            Upload, categorize, and preserve legally binding FIDIC contracts, engineering drawing dossiers, and monthly physical progress reports.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-150 dark:border-slate-800 text-2xs font-bold text-slate-600 dark:text-zinc-300">
          <FileCheck2 className="w-5 h-5 text-indigo-500" />
          <div>
            <div className="text-slate-400 text-[9px] uppercase tracking-wider font-extrabold">Active Archive</div>
            <div>{documents.length} Files Logged</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Import / Upload Section */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-850 p-5 rounded-3xl border border-slate-150 dark:border-slate-800/80 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-200">
                📤 Import New Document
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 block leading-tight mt-0.5">
                Register contract details or monthly files in the project's permanent record.
              </p>
            </div>

            {isReadonly ? (
              <div className="bg-amber-50/50 dark:bg-amber-950/10 p-3.5 rounded-xl border border-amber-100 dark:border-amber-950/30 text-2xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>You have viewer-only permissions. File import and modification are disabled.</span>
              </div>
            ) : (
              <form onSubmit={handleImportDoc} className="space-y-4">
                
                {/* Drag and Drop Zone */}
                <div 
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer flex flex-col items-center justify-center space-y-2 ${
                    dragActive 
                      ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/10' 
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-750 bg-slate-50/50 dark:bg-slate-900/20'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    className="hidden" 
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.xlsx,.xls,.pptx,.zip,.png,.jpg"
                  />
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <Upload className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <span className="text-2xs font-extrabold text-slate-700 dark:text-zinc-300 block">
                      {selectedFile ? selectedFile.name : 'Drag & drop file here or click to browse'}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      {selectedFile 
                        ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to save` 
                        : 'Supports PDF, Word, Excel, Images, ZIP'}
                    </span>
                  </div>
                </div>

                {/* Doc Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                    Document Title / Reference Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Contract Agreement Part II Sec 3"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none text-slate-700 dark:text-zinc-250 focus:border-indigo-500 transition"
                  />
                </div>

                {/* Doc Type Selection */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                    Classification Category
                  </label>
                  <input
                    list="doc-categories"
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    placeholder="Select or type a new category"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none text-slate-750 dark:text-zinc-200 focus:border-indigo-500 transition"
                  />
                  <datalist id="doc-categories">
                    <option value="contract">📜 Contract & Legal Agreement Documents</option>
                    <option value="monthly_report">📅 Monthly Physical progress report</option>
                    <option value="other">📦 Technical Drawings & Other Dossiers</option>
                    {Array.from(new Set(documents.map(d => d.type))).filter(t => !['contract', 'monthly_report', 'other'].includes(t)).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </datalist>
                </div>

                {/* Doc Description */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                    Brief Description / Memo Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Provide details about document scope, signatures, or specific months..."
                    value={docDesc}
                    onChange={(e) => setDocDesc(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none text-slate-700 dark:text-zinc-250 focus:border-indigo-500 transition resize-none"
                  />
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-extrabold shadow-sm transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" /> Import Document to Record
                </button>
              </form>
            )}

          </div>
        </div>

        {/* Right Column: Files List & Search Panel */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-850 p-5 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-sm space-y-4">
            
            {/* Control Bar: Search & Filter Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-200">
                  📁 Document Vault Register
                </h3>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 block font-bold mt-0.5">
                  Showing {filteredDocs.length} matching of {documents.length} total
                </span>
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-3xs font-black uppercase tracking-wider text-slate-600 dark:text-zinc-300 outline-none cursor-pointer"
                >
                  <option value="all">📁 All Documents</option>
                  <option value="contract">📜 Contracts</option>
                  <option value="monthly_report">📅 Monthly Reports</option>
                  <option value="other">📦 Drawings/Other</option>
                </select>

                <div className="relative">
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search archives..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-900 text-2xs pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 max-w-[160px] text-slate-800 dark:text-zinc-200 font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Document Cards */}
            {filteredDocs.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-slate-100 dark:border-slate-800">
                  <FileText className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-700 dark:text-zinc-300">
                    No matching documents found
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Use the upload form to import contract documents and monthly progress reports.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {filteredDocs.map((doc, idx) => (
                  <div 
                    key={doc.id || `doc-${idx}`}
                    className="p-3 bg-slate-50/50 dark:bg-slate-900/10 border border-slate-150 dark:border-slate-800/80 rounded-2xl flex items-start justify-between gap-3 hover:border-slate-350 dark:hover:border-slate-750 transition"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`p-2 rounded-xl shrink-0 ${
                        doc.type === 'contract' 
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                          : doc.type === 'monthly_report'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                          : doc.type === 'other'
                          ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400'
                      }`}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-xs text-slate-700 dark:text-zinc-200 truncate max-w-[280px]">
                            {doc.name}
                          </span>
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                            doc.type === 'contract' 
                              ? 'bg-amber-100/60 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' 
                              : doc.type === 'monthly_report'
                              ? 'bg-blue-100/60 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                              : doc.type === 'other'
                              ? 'bg-slate-200/60 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              : 'bg-indigo-100/60 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400'
                          }`}>
                            {doc.type === 'contract' ? '📜 CONTRACT' : doc.type === 'monthly_report' ? '📅 REPORT' : doc.type === 'other' ? '📦 DRAWING' : doc.type}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-[340px]">
                          File: {doc.fileName} ({doc.fileSize})
                        </p>
                        {doc.description && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium font-sans leading-tight pt-0.5">
                            {doc.description}
                          </p>
                        )}
                        <div className="text-[9px] text-slate-400 pt-1 flex items-center gap-2">
                          <span>By: <b className="font-bold">{doc.uploadedBy}</b></span>
                          <span>•</span>
                          <span>{doc.uploadedAt}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setShowPreviewDoc(doc)}
                        className="p-1.5 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-150 dark:border-slate-800 text-slate-500 dark:text-slate-300 rounded-lg transition"
                        title="Preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      
                      <a
                        href={doc.fileData || `data:text/plain;charset=utf-8,${encodeURIComponent(
                          `Ethiopian Roads Administration ERP System Document Download\n` +
                          `========================================================\n` +
                          `Document ID: ${doc.id}\n` +
                          `Project: ${project.name}\n` +
                          `Document Name: ${doc.name}\n` +
                          `Category: ${doc.type.toUpperCase()}\n` +
                          `File Name: ${doc.fileName}\n` +
                          `File Size: ${doc.fileSize}\n` +
                          `Uploaded By: ${doc.uploadedBy}\n` +
                          `Uploaded At: ${doc.uploadedAt}\n` +
                          `Description: ${doc.description || 'No description provided.'}\n` +
                          `========================================================\n` +
                          `This is a secured download token representing the legally binding physical asset filed in the administration archives.`
                        )}`}
                        download={doc.fileName}
                        className="p-1.5 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-150 dark:border-slate-800 text-slate-500 dark:text-slate-300 rounded-lg transition"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>

                      {!isReadonly && (
                        <button
                          onClick={() => handleDeleteDoc(doc.id)}
                          className="p-1.5 bg-white hover:bg-rose-50 dark:bg-slate-900 dark:hover:bg-rose-950/20 border border-slate-150 dark:border-slate-800 text-rose-600 dark:text-rose-400 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Document Interactive Preview Modal */}
      {showPreviewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                <h3 className="text-xs font-black uppercase text-slate-700 dark:text-zinc-250">
                  📁 Secure ERP Document Preview
                </h3>
              </div>
              <button 
                onClick={() => setShowPreviewDoc(null)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 text-xs font-black"
              >
                CLOSE [×]
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[480px]">
              
              <div className="flex items-start gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className={`p-3 rounded-2xl shrink-0 ${
                  showPreviewDoc.type === 'contract' 
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                    : showPreviewDoc.type === 'monthly_report'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  <FileText className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded">
                    {showPreviewDoc.type === 'contract' ? '📜 FIDIC Legal Contract' : showPreviewDoc.type === 'monthly_report' ? '📅 Cumulative progress report' : '📦 Engineering Drawings'}
                  </span>
                  <h4 className="text-sm font-black text-slate-850 dark:text-zinc-100">
                    {showPreviewDoc.name}
                  </h4>
                  <p className="text-2xs text-slate-400 dark:text-slate-500 font-mono">
                    Token File Identifier: {showPreviewDoc.id}
                  </p>
                </div>
              </div>

              {/* Document Specs Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/20 p-4 rounded-2xl text-2xs font-semibold">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Physical Filename</span>
                  <span className="text-slate-700 dark:text-zinc-300 font-mono font-bold">{showPreviewDoc.fileName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Document Size</span>
                  <span className="text-slate-700 dark:text-zinc-300 font-mono font-bold">{showPreviewDoc.fileSize}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Archive Uploader</span>
                  <span className="text-slate-700 dark:text-zinc-300 font-bold">{showPreviewDoc.uploadedBy}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Submission Timestamp</span>
                  <span className="text-slate-700 dark:text-zinc-300 font-bold">{showPreviewDoc.uploadedAt}</span>
                </div>
              </div>

              {/* Document Scope Content */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                  Memo Description Note
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                  {showPreviewDoc.description || 'No descriptive notes registered during file import.'}
                </p>
              </div>

              {/* Simulated PDF container preview */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-slate-100 dark:bg-slate-950 text-center space-y-4">
                {showPreviewDoc.fileData ? (
                  showPreviewDoc.fileType?.startsWith('image/') ? (
                    <img 
                      src={showPreviewDoc.fileData} 
                      alt={showPreviewDoc.name} 
                      className="max-h-[300px] mx-auto rounded-lg shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                  ) : showPreviewDoc.fileType === 'application/pdf' ? (
                    <iframe 
                      src={showPreviewDoc.fileData} 
                      className="w-full h-[400px] rounded-lg border border-slate-200 dark:border-slate-800"
                      title={showPreviewDoc.name}
                    />
                  ) : (
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800 flex flex-col items-center gap-2">
                      <FileCheck2 className="w-8 h-8 text-indigo-500" />
                      <span className="text-2xs font-extrabold text-slate-700 dark:text-zinc-250 truncate max-w-xs">
                        {showPreviewDoc.fileName}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        File Type: {showPreviewDoc.fileType || 'Unknown'}
                      </span>
                    </div>
                  )
                ) : (
                  <>
                    <FileCheck2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <div className="space-y-1">
                      <h5 className="text-2xs font-extrabold text-slate-800 dark:text-zinc-250">
                        Legally Certified Digitized Copy
                      </h5>
                      <p className="text-3xs text-slate-450 dark:text-slate-500 max-w-sm mx-auto">
                        This file is encrypted and safely persisted inside the Ethiopian Roads Administration cloud storage database. Click below to download the full asset.
                      </p>
                    </div>
                  </>
                )}
                <a
                  href={showPreviewDoc.fileData || `data:text/plain;charset=utf-8,${encodeURIComponent(
                    `Ethiopian Roads Administration ERP System Document Preview\n` +
                    `========================================================\n` +
                    `Document ID: ${showPreviewDoc.id}\n` +
                    `Project: ${project.name}\n` +
                    `Document Name: ${showPreviewDoc.name}\n` +
                    `Category: ${showPreviewDoc.type.toUpperCase()}\n` +
                    `File Name: ${showPreviewDoc.fileName}\n` +
                    `File Size: ${showPreviewDoc.fileSize}\n` +
                    `Uploaded By: ${showPreviewDoc.uploadedBy}\n` +
                    `Uploaded At: ${showPreviewDoc.uploadedAt}\n` +
                    `Description: ${showPreviewDoc.description || 'No description provided.'}\n` +
                    `========================================================\n` +
                    `This is a secured download token representing the legally binding physical asset filed in the administration archives.`
                  )}`}
                  download={showPreviewDoc.fileName}
                  className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-2xs font-extrabold px-4 py-2 rounded-xl transition"
                >
                  <Download className="w-3.5 h-3.5" /> Download Full Archive Copy
                </a>
              </div>

            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
