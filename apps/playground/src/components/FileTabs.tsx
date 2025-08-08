import React from 'react';
import { X, Plus, FileCode, FileText, FileJson } from 'lucide-react';
import { PlaygroundFile } from '../lib/types';

interface FileTabsProps {
  files: PlaygroundFile[];
  activeFileId: string;
  onSelectFile: (fileId: string) => void;
  onAddFile: () => void;
  onCloseFile: (fileId: string) => void;
  onRenameFile: (fileId: string, newName: string) => void;
}

export function FileTabs({
  files,
  activeFileId,
  onSelectFile,
  onAddFile,
  onCloseFile,
  onRenameFile,
}: FileTabsProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState('');

  const getFileIcon = (file: PlaygroundFile) => {
    switch (file.language) {
      case 'typescript':
      case 'javascript':
        return <FileCode className="h-3.5 w-3.5" />;
      case 'css':
        return <FileText className="h-3.5 w-3.5" />;
      case 'json':
        return <FileJson className="h-3.5 w-3.5" />;
      default:
        return <FileText className="h-3.5 w-3.5" />;
    }
  };

  const handleStartRename = (file: PlaygroundFile) => {
    setEditingId(file.id);
    setEditingName(file.name);
  };

  const handleFinishRename = () => {
    if (editingId && editingName.trim()) {
      onRenameFile(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFinishRename();
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditingName('');
    }
  };

  return (
    <div className="flex items-center border-b bg-background overflow-x-auto">
      <div className="flex items-center">
        {files.map((file) => (
          <div
            key={file.id}
            className={`
              group flex items-center gap-1.5 px-3 py-2 border-r cursor-pointer
              transition-colors relative
              ${
                activeFileId === file.id
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
              }
            `}
            onClick={() => onSelectFile(file.id)}
            onDoubleClick={() => handleStartRename(file)}
          >
            {getFileIcon(file)}
            {editingId === file.id ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={handleFinishRename}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="bg-transparent border-b border-primary outline-none text-sm w-24"
                autoFocus
              />
            ) : (
              <span className="text-sm">{file.name}</span>
            )}
            {files.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseFile(file.id);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 hover:bg-accent rounded"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={onAddFile}
          className="flex items-center gap-1.5 px-3 py-2 hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
          title="Add new file"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm">New File</span>
        </button>
      </div>
    </div>
  );
}
