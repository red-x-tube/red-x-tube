import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, CheckCircle } from "lucide-react";

interface FileUploadInputProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  accept?: string;
  placeholder?: string;
  className?: string;
}

export function FileUploadInput({
  label,
  value,
  onChange,
  accept = "*/*",
  placeholder = "Paste URL or upload file...",
  className = "",
}: FileUploadInputProps) {
  const [uploading, setUploading] = useState(false);
  const [justUploaded, setJustUploaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setJustUploaded(false);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      onChange(data.url);
      setJustUploaded(true);
      setTimeout(() => setJustUploaded(false), 2000);
    } catch {
      // silent — URL field stays empty so user sees it failed
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className={className}>
      <Label className="text-white/70 text-xs uppercase tracking-wider">{label}</Label>
      <div className="flex gap-2 mt-1.5">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-[#0d0d14] border-white/10 flex-1 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          title="Upload from device"
          className={`shrink-0 h-10 w-10 border transition-colors ${
            justUploaded
              ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10"
              : "border-purple-500/30 text-purple-400 hover:bg-purple-500/10 bg-[#0d0d14]"
          }`}
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : justUploaded ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleFile}
        />
      </div>
      {value && value.startsWith("/api/uploads/") && (
        <p className="text-[11px] text-emerald-400/70 mt-1">Uploaded to server</p>
      )}
    </div>
  );
}
