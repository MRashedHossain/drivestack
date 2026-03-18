interface Props {
  label: string;
  used: number;
  total: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function StorageBar({ label, used, total }: Props) {
  const percent = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const isAlmostFull = percent > 80;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-gray-300 text-xs truncate max-w-32">{label}</span>
        <span className="text-gray-500 text-xs">{formatBytes(used)} / {formatBytes(total)}</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all ${isAlmostFull ? "bg-red-500" : "bg-blue-500"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}