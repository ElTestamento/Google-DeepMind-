import React, { useState } from 'react';
import { 
  AppState, 
  FileAttachment, 
  INITIAL_PATIENT, 
  INITIAL_CLINICAL 
} from './types';
import { generateDischargeLetter } from './services/geminiService';
import { FileUploader } from './components/FileUploader';
import { Spinner } from './components/Spinner';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    patient: INITIAL_PATIENT,
    clinical: INITIAL_CLINICAL,
    audience: 'doctor',
    useStandardCourse: false,
    doctorName: '',
    doctorPosition: '',
  });

  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [generatedLetter, setGeneratedLetter] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Common accepted file types: Images, PDFs, and Word Docs
  const ACCEPTED_FILE_TYPES = "image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  const handlePatientChange = (field: keyof typeof INITIAL_PATIENT, value: string) => {
    setState(prev => ({
      ...prev,
      patient: { ...prev.patient, [field]: value }
    }));
  };

  const handleClinicalChange = (field: keyof typeof INITIAL_CLINICAL, value: string) => {
    setState(prev => ({
      ...prev,
      clinical: { ...prev.clinical, [field]: value }
    }));
  };

  const handleAttachmentUpload = (newAttachment: FileAttachment) => {
    setAttachments(prev => [
      ...prev.filter(a => a.category !== newAttachment.category),
      newAttachment
    ]);
  };

  const handleAttachmentRemove = (category: FileAttachment['category']) => {
    setAttachments(prev => prev.filter(a => a.category !== category));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const letter = await generateDischargeLetter(state, attachments);
      setGeneratedLetter(letter);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const getAttachment = (category: FileAttachment['category']) => 
    attachments.find(a => a.category === category);

  return (
    <div className="flex h-screen w-full bg-gray-100 text-gray-800 font-sans overflow-hidden">
      
      {/* Sidebar / Left Panel - Input */}
      <div className="w-1/2 flex flex-col h-full border-r border-gray-200 bg-white shadow-xl z-10">
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-blue-600">Med</span>Scribe AI
          </h1>
          <p className="text-sm text-gray-500 mt-1">Automated Discharge Letter Generator</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Settings Section */}
          <section className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-4">Configuration</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Target Audience</label>
                <select 
                  className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
                  value={state.audience}
                  onChange={(e) => setState(prev => ({ ...prev, audience: e.target.value as any }))}
                >
                  <option value="doctor">Medical Professional (Formal)</option>
                  <option value="patient">Patient (Plain English)</option>
                </select>
              </div>
              
              {/* Doctor Name and Position */}
              <div className="col-span-2 grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-medium text-gray-600 mb-1">Physician Name</label>
                   <input 
                      type="text" 
                      placeholder="Dr. Med. Name"
                      className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={state.doctorName}
                      onChange={(e) => setState(prev => ({ ...prev, doctorName: e.target.value }))}
                    />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Position</label>
                  <select 
                    className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
                    value={state.doctorPosition}
                    onChange={(e) => setState(prev => ({ ...prev, doctorPosition: e.target.value }))}
                  >
                    <option value="">Select Position...</option>
                    <option value="Resident">Resident (Assistenzarzt)</option>
                    <option value="Specialist">Specialist (Facharzt)</option>
                    <option value="Senior Physician">Senior Physician (Oberarzt)</option>
                    <option value="Chief Physician">Chief Physician (Chefarzt)</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Patient Data */}
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3 border-l-4 border-blue-500 pl-3">Patient Demographics</h2>
            <div className="grid grid-cols-2 gap-4">
              <input 
                type="text" 
                placeholder="First Name"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={state.patient.firstName}
                onChange={(e) => handlePatientChange('firstName', e.target.value)}
              />
              <input 
                type="text" 
                placeholder="Last Name"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={state.patient.lastName}
                onChange={(e) => handlePatientChange('lastName', e.target.value)}
              />
              
              <div className="col-span-2 grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs text-gray-500 mb-1">Birthdate</label>
                  <input 
                    type="date" 
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={state.patient.dob}
                    onChange={(e) => handlePatientChange('dob', e.target.value)}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs text-gray-500 mb-1">Admission</label>
                  <input 
                    type="date" 
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={state.patient.admissionDate}
                    onChange={(e) => handlePatientChange('admissionDate', e.target.value)}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs text-gray-500 mb-1">Discharge</label>
                  <input 
                    type="date" 
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={state.patient.dischargeDate}
                    onChange={(e) => handlePatientChange('dischargeDate', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Attachments */}
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3 border-l-4 border-purple-500 pl-3">Documents & Images</h2>
            <div className="grid grid-cols-2 gap-4">
              <FileUploader 
                category="opreport" 
                label="OP Report (PDF/Word/Img)" 
                accept={ACCEPTED_FILE_TYPES} 
                onUpload={handleAttachmentUpload} 
                onRemove={handleAttachmentRemove}
                currentFile={getAttachment('opreport')}
              />
               <FileUploader 
                category="letter" 
                label="Previous Letter" 
                accept={ACCEPTED_FILE_TYPES} 
                onUpload={handleAttachmentUpload} 
                onRemove={handleAttachmentRemove}
                currentFile={getAttachment('letter')}
              />
              <FileUploader 
                category="lab" 
                label="Lab Report" 
                accept={ACCEPTED_FILE_TYPES} 
                onUpload={handleAttachmentUpload} 
                onRemove={handleAttachmentRemove}
                currentFile={getAttachment('lab')}
              />
              <FileUploader 
                category="medplan" 
                label="Medication Plan" 
                accept={ACCEPTED_FILE_TYPES} 
                onUpload={handleAttachmentUpload} 
                onRemove={handleAttachmentRemove}
                currentFile={getAttachment('medplan')}
              />
              <FileUploader 
                category="microbio" 
                label="Microbiology" 
                accept={ACCEPTED_FILE_TYPES} 
                onUpload={handleAttachmentUpload} 
                onRemove={handleAttachmentRemove}
                currentFile={getAttachment('microbio')}
              />
              <div className="grid grid-cols-2 gap-2 col-span-2">
                 <FileUploader 
                  category="preop" 
                  label="Pre-op Image" 
                  accept="image/*" 
                  onUpload={handleAttachmentUpload} 
                  onRemove={handleAttachmentRemove}
                  currentFile={getAttachment('preop')}
                />
                <FileUploader 
                  category="postop" 
                  label="Post-op Image" 
                  accept="image/*" 
                  onUpload={handleAttachmentUpload} 
                  onRemove={handleAttachmentRemove}
                  currentFile={getAttachment('postop')}
                />
              </div>
            </div>
          </section>

          {/* Clinical Data */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-3 border-l-4 border-green-500 pl-3">Clinical Details</h2>
            
            {[
              { id: 'diagnosis', label: 'Diagnoses' },
              { id: 'anamnesis', label: 'History / Anamnesis' },
              { id: 'findings', label: 'Findings (Physical/Labs)' },
              { id: 'operation', label: 'Operation / Procedures' },
            ].map(field => (
              <div key={field.id}>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">{field.label}</label>
                <textarea 
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none min-h-[80px]"
                  value={(state.clinical as any)[field.id]}
                  onChange={(e) => handleClinicalChange(field.id as any, e.target.value)}
                />
              </div>
            ))}

            {/* Clinical Course with Standard Course Checkbox */}
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="block text-xs font-semibold text-gray-600 uppercase">Clinical Course</label>
                <label className="flex items-center gap-2 cursor-pointer text-xs bg-blue-50 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100 transition-colors">
                  <input 
                    type="checkbox"
                    checked={state.useStandardCourse}
                    onChange={(e) => setState(prev => ({ ...prev, useStandardCourse: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                  />
                  <span className="font-medium text-blue-700">Insert Standard Course</span>
                </label>
              </div>
              <textarea 
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none min-h-[80px]"
                placeholder={state.useStandardCourse ? "Standard complications-free course will be generated..." : ""}
                value={state.clinical.clinicalCourse}
                onChange={(e) => handleClinicalChange('clinicalCourse', e.target.value)}
              />
            </div>

            {[
              { id: 'medication', label: 'Medication' },
              { id: 'recommendations', label: 'Recommendations' },
            ].map(field => (
              <div key={field.id}>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">{field.label}</label>
                <textarea 
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none min-h-[80px]"
                  value={(state.clinical as any)[field.id]}
                  onChange={(e) => handleClinicalChange(field.id as any, e.target.value)}
                />
              </div>
            ))}
          </section>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 sticky bottom-0">
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Spinner />
                <span>Generating...</span>
              </>
            ) : (
              <span>Generate Letter</span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content / Right Panel - Output */}
      <div className="w-1/2 h-full bg-gray-100 p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto bg-white min-h-[calc(100vh-4rem)] shadow-2xl rounded-xl p-10 print:shadow-none print:p-0">
          
          {generatedLetter ? (
            <div className="max-w-none">
              <div className="whitespace-pre-wrap font-serif text-base leading-relaxed text-gray-800">
                {generatedLetter}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
              {isGenerating ? (
                 <div className="flex flex-col items-center animate-pulse">
                   <div className="h-4 w-48 bg-gray-300 rounded mb-4"></div>
                   <div className="h-4 w-64 bg-gray-300 rounded mb-4"></div>
                   <div className="h-4 w-56 bg-gray-300 rounded"></div>
                   <p className="mt-8 text-sm font-medium">Analyzing inputs and generating letter...</p>
                 </div>
              ) : (
                <>
                  <svg className="w-24 h-24 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  <p className="text-lg">Fill in the form and click Generate</p>
                  {error && (
                    <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm max-w-sm text-center border border-red-200">
                      Error: {error}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;