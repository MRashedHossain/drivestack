import { useEffect, useState } from "react";
import api from "../services/api";

interface File {
  id: string;
  name: string;
  size: string;
  mimeType: string;
  folderId: string | null;
  createdAt: string;
  account: { googleEmail: string };
}

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

export default function FileExplorer() {
  const [files, setFiles] = useState<File[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<Folder[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [movingFileId, setMovingFileId] = useState<string | null>(null);
  const [moveBrowserFolder, setMoveBrowserFolder] = useState<string | null>(null);
  const [moveBrowserFolders, setMoveBrowserFolders] = useState<Folder[]>([]);
  const [moveBreadcrumb, setMoveBreadcrumb] = useState<Folder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<File[] | null>(null);
  const [searching, setSearching] = useState(false);

  const fetchContents = async (folderId: string | null) => {
    const [filesRes, foldersRes] = await Promise.all([
      api.get("/files", { params: folderId ? { folderId } : {} }),
      api.get("/folders", { params: folderId ? { parentId: folderId } : {} }),
    ]);
    setFiles(filesRes.data);
    setFolders(foldersRes.data);
  };

  const fetchBreadcrumb = async (folderId: string | null) => {
    if (!folderId) { setBreadcrumb([]); return; }
    const res = await api.get(`/folders/${folderId}/breadcrumb`);
    setBreadcrumb(res.data);
  };

  // Fetch folders for the move browser at a specific level
  const fetchMoveBrowserFolders = async (folderId: string | null) => {
    const res = await api.get("/folders", { params: folderId ? { parentId: folderId } : {} });
    setMoveBrowserFolders(res.data);
    setMoveBrowserFolder(folderId);

    if (!folderId) {
      setMoveBreadcrumb([]);
      return;
    }
    const breadRes = await api.get(`/folders/${folderId}/breadcrumb`);
    setMoveBreadcrumb(breadRes.data);
  };

  useEffect(() => {
    fetchContents(currentFolder);
    fetchBreadcrumb(currentFolder);
  }, [currentFolder]);

  // When move mode starts, load root folders in the move browser
  useEffect(() => {
    if (movingFileId) {
      fetchMoveBrowserFolders(null);
    }
  }, [movingFileId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append("file", file);
    if (currentFolder) formData.append("folderId", currentFolder);
    try {
      await api.post("/files/upload", formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      });
      fetchContents(currentFolder);
    } catch (err: any) {
      alert(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm("Delete this file?")) return;
    await api.delete(`/files/${fileId}`);
    fetchContents(currentFolder);
  };

  const handleDownload = (fileId: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = `http://localhost:5000/files/${fileId}/download`;
    link.download = fileName;
    link.click();
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await api.post("/folders", { name: newFolderName, parentId: currentFolder ?? undefined });
    setNewFolderName("");
    setShowNewFolder(false);
    fetchContents(currentFolder);
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm("Delete this folder? Files inside will be moved to root.")) return;
    await api.delete(`/folders/${folderId}`);
    fetchContents(currentFolder);
  };

  const handleRename = async (fileId: string) => {
    if (!renameValue.trim()) return;
    await api.patch(`/files/${fileId}/rename`, { name: renameValue });
    setRenamingFileId(null);
    setRenameValue("");
    fetchContents(currentFolder);
  };

  const handleMove = async (fileId: string, targetFolderId: string) => {
    await api.patch(`/folders/${targetFolderId}/move-file`, { fileId });
    setMovingFileId(null);
    setMoveBrowserFolder(null);
    setMoveBrowserFolders([]);
    setMoveBreadcrumb([]);
    fetchContents(currentFolder);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) { setSearchResults(null); return; }
    setSearching(true);
    try {
      const res = await api.get("/files", { params: { all: "true" } });
      const allFiles: File[] = res.data;
      const filtered = allFiles.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
  };

  const formatBytes = (bytes: string) => {
    const b = parseInt(bytes);
    if (b < 1024) return b + " B";
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
    return (b / (1024 * 1024)).toFixed(1) + " MB";
  };

  const displayedFiles = searchResults ?? files;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <div className="border-b border-gray-800 p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => { setCurrentFolder(null); clearSearch(); }} className="text-blue-400 hover:text-blue-300">
            Root
          </button>
          {breadcrumb.map((crumb) => (
            <span key={crumb.id} className="flex items-center gap-2">
              <span className="text-gray-600">/</span>
              <button onClick={() => setCurrentFolder(crumb.id)} className="text-blue-400 hover:text-blue-300">
                {crumb.name}
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search files..."
            className="bg-gray-800 text-white text-sm px-3 py-1.5 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 flex-1"
          />
          {searchQuery && (
            <button onClick={clearSearch} className="text-gray-500 hover:text-white text-sm px-2">✕</button>
          )}
          <button
            onClick={handleSearch}
            className="text-gray-400 hover:text-white text-sm px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors"
          >
            {searching ? "..." : "Search"}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewFolder(!showNewFolder)}
            className="text-gray-400 hover:text-white text-sm px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors"
          >
            New Folder
          </button>
          <label className={`cursor-pointer text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${uploading ? "bg-blue-700 text-blue-200" : "bg-blue-500 hover:bg-blue-600 text-white"}`}>
            {uploading ? `Uploading ${uploadProgress}%` : "Upload File"}
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      {showNewFolder && (
        <div className="p-4 border-b border-gray-800 flex items-center gap-2">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name..."
            className="bg-gray-800 text-white text-sm px-3 py-1.5 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 w-48"
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
          />
          <button onClick={handleCreateFolder} className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg transition-colors">
            Create
          </button>
          <button onClick={() => setShowNewFolder(false)} className="text-gray-500 hover:text-white text-sm px-3 py-1.5 rounded-lg transition-colors">
            Cancel
          </button>
        </div>
      )}

      {uploading && (
        <div className="px-4 py-3 border-b border-gray-800 flex flex-col gap-2">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-1.5">
            <div
              className="h-1.5 bg-blue-500 rounded-full transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {searchResults !== null && (
        <div className="px-4 py-2 border-b border-gray-800 text-xs text-gray-500">
          {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{searchQuery}"
        </div>
      )}

      {/* Move file browser panel */}
      {movingFileId && (
        <div className="border-b border-gray-800 bg-gray-900 px-4 py-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm font-medium">Move file to...</span>
            <button onClick={() => setMovingFileId(null)} className="text-gray-500 hover:text-white text-xs">
              Cancel
            </button>
          </div>

          {/* Move breadcrumb */}
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => fetchMoveBrowserFolders(null)}
              className="text-blue-400 hover:text-blue-300"
            >
              Root
            </button>
            {moveBreadcrumb.map((crumb) => (
              <span key={crumb.id} className="flex items-center gap-2">
                <span className="text-gray-600">/</span>
                <button
                  onClick={() => fetchMoveBrowserFolders(crumb.id)}
                  className="text-blue-400 hover:text-blue-300"
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>

          {/* Move here button for current level */}
          <button
            onClick={() => handleMove(movingFileId, moveBrowserFolder ?? "root")}
            className="w-fit text-xs px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors"
          >
            ✓ Move here {moveBrowserFolder ? `(${moveBreadcrumb[moveBreadcrumb.length - 1]?.name})` : "(Root)"}
          </button>

          {/* Subfolders to navigate into */}
          {moveBrowserFolders.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {moveBrowserFolders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => fetchMoveBrowserFolders(folder.id)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-700 hover:border-blue-500 text-gray-300 hover:text-blue-300 transition-colors"
                >
                  📁 {folder.name}
                </button>
              ))}
            </div>
          )}

          {moveBrowserFolders.length === 0 && (
            <p className="text-gray-600 text-xs">No subfolders here</p>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {!searchResults && folders.length === 0 && files.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-600">
            <p className="text-lg">This folder is empty</p>
            <p className="text-sm mt-1">Upload a file or create a folder to get started</p>
          </div>
        )}

        {!searchResults && folders.length > 0 && (
          <div className="mb-6">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">Folders</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {folders.map((folder) => (
                <div key={folder.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center justify-between group hover:border-gray-600 transition-colors">
                  <button onClick={() => setCurrentFolder(folder.id)} className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-yellow-500 text-lg">📁</span>
                    <span className="text-gray-200 text-sm truncate">{folder.name}</span>
                  </button>
                  <button
                    onClick={() => handleDeleteFolder(folder.id)}
                    className="text-gray-700 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-all ml-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {displayedFiles.length > 0 && (
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">
              {searchResults ? "Search Results" : "Files"}
            </p>
            <div className="flex flex-col gap-1">
              {displayedFiles.map((file) => (
                <div
                  key={file.id}
                  className={`bg-gray-900 border rounded-xl px-4 py-3 flex items-center justify-between group hover:border-gray-600 transition-colors ${movingFileId === file.id ? "border-green-600" : "border-gray-800"}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-blue-400 text-lg">📄</span>
                    <div className="min-w-0">
                      {renamingFileId === file.id ? (
                        <input
                          autoFocus
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename(file.id);
                            if (e.key === "Escape") setRenamingFileId(null);
                          }}
                          onBlur={() => setRenamingFileId(null)}
                          className="bg-gray-800 text-white text-sm px-2 py-0.5 rounded border border-blue-500 focus:outline-none w-48"
                        />
                      ) : (
                        <p className="text-gray-200 text-sm truncate">{file.name}</p>
                      )}
                      <p className="text-gray-600 text-xs">{formatBytes(file.size)} · {file.account.googleEmail}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => handleDownload(file.id, file.name)}
                      className="text-gray-500 hover:text-blue-400 text-xs px-2 py-1 rounded transition-colors"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => { setRenamingFileId(file.id); setRenameValue(file.name); }}
                      className="text-gray-500 hover:text-yellow-400 text-xs px-2 py-1 rounded transition-colors"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => setMovingFileId(movingFileId === file.id ? null : file.id)}
                      className={`text-xs px-2 py-1 rounded transition-colors ${movingFileId === file.id ? "text-green-400" : "text-gray-500 hover:text-green-400"}`}
                    >
                      Move
                    </button>
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="text-gray-500 hover:text-red-400 text-xs px-2 py-1 rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {searchResults !== null && searchResults.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-600">
            <p className="text-lg">No files found</p>
            <p className="text-sm mt-1">Try a different search term</p>
          </div>
        )}
      </div>
    </div>
  );
}