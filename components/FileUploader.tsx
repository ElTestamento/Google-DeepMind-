import React, { useRef } from 'react';
import { FileAttachment } from '../types';

interface FileUploaderProps {
  category: FileAttachment['category'];
  label: string;
  accept: string;
  onUpload: (attachment: FileAttachment) => void;
  onRemove: (category: FileAttachment['category']) => void;
  currentFile?: FileAttachment;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ 
  category, 
  label, 
  accept, 
  onUpload, 
  onRemove,
  currentFile 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      onUpload({
        file,
        base64,
        mimeType: file.type,
        category,
      });
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be selected again if needed
    e.target.value = '';
  };

  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </label>
      
      {!currentFile ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-3 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center text-sm text-gray-500"
        >
          <span className="mr-2">📄</span> Click to upload
        </div>
      ) : (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-2 text-sm">
          <div className="flex items-center truncate">
            <span className="mr-2 text-blue-500">📎</span>
            <span className="truncate max-w-[150px]">{currentFile.file.name}</span>
          </div>
          <button 
            onClick={() => onRemove(category)}
            className="text-red-500 hover:text-red-700 ml-2"
          >
            ✕
          </button>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        className="hidden"
      />
    </div>
  );
};