import { useEffect, useRef, useState } from "react";
import { ArrowUp, Camera, Mic, Plus, Sparkles, Square, X } from "lucide-react";
import type { Attachment } from "@/lib/askeasy";

type Props = {
  onSend: (text: string, attachments: Attachment[]) => void;
  disabled?: boolean;
  onOpenCamera: () => void;
  voiceEnabled: boolean;
  smartMode: boolean;
  onToggleSmart: () => void;
};

export function Composer({
  onSend,
  disabled,
  onOpenCamera,
  voiceEnabled,
  smartMode,
  onToggleSmart,
}: Props) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  }, [text]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const hasContent = text.trim().length > 0 || attachments.length > 0;

  const submit = () => {
    if (!hasContent || disabled) return;
    onSend(text.trim(), attachments);
    setText("");
    setAttachments([]);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, 4)
      .forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          setAttachments((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              type: "image",
              dataUrl: String(reader.result),
              name: file.name,
            },
          ]);
        };
        reader.readAsDataURL(file);
      });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        const reader = new FileReader();
        reader.onload = () => {
          setAttachments((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              type: "audio",
              dataUrl: String(reader.result),
              name: `voice-note.${mime.includes("mp4") ? "m4a" : "webm"}`,
            },
          ]);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch (e) {
      console.error(e);
      alert("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setRecording(false);
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="glass rounded-[28px] p-3 shadow-[0_20px_60px_-20px_oklch(0.2_0.05_280/0.35)]">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2 px-1">
            {attachments.map((a) => (
              <div key={a.id} className="group relative">
                {a.type === "image" ? (
                  <img
                    src={a.dataUrl}
                    alt=""
                    className="h-16 w-16 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-16 items-center gap-2 rounded-xl bg-foreground/10 px-3 text-xs">
                    <Mic className="h-3.5 w-3.5" /> Voice note
                  </div>
                )}
                <button
                  onClick={() =>
                    setAttachments((prev) => prev.filter((x) => x.id !== a.id))
                  }
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background opacity-0 transition group-hover:opacity-100"
                  aria-label="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {recording ? (
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2 text-sm text-foreground/80">
              <span className="h-2 w-2 animate-pulse-soft rounded-full bg-destructive" />
              Listening… {formatTime(recordSeconds)}
            </div>
            <button
              onClick={stopRecording}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive text-white"
              aria-label="Stop recording"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Ask anything…"
            rows={1}
            disabled={disabled}
            className="w-full resize-none bg-transparent px-3 pt-2 text-[16px] leading-6 text-foreground placeholder:text-muted-foreground/80 focus:outline-none disabled:opacity-50"
          />
        )}

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <IconChip label="Attach image" onClick={() => fileInputRef.current?.click()}>
              <Plus className="h-[18px] w-[18px]" />
            </IconChip>
            <IconChip label="Camera" onClick={onOpenCamera}>
              <Camera className="h-[18px] w-[18px]" />
            </IconChip>
            <button
              onClick={onToggleSmart}
              className={
                "ml-1 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition " +
                (smartMode
                  ? "bg-foreground text-background"
                  : "bg-foreground/5 text-foreground/70 hover:bg-foreground/10")
              }
            >
              <Sparkles className="h-3.5 w-3.5" />
              Smart
            </button>
          </div>

          <div className="flex items-center gap-2">
            {!hasContent && !recording && voiceEnabled && (
              <IconChip label="Voice" onClick={startRecording} primary>
                <Mic className="h-[18px] w-[18px]" />
              </IconChip>
            )}
            {(hasContent || recording) && (
              <button
                aria-label="Send"
                onClick={submit}
                disabled={!hasContent || disabled}
                className="flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg transition-all duration-300 disabled:opacity-40"
                style={{ background: "var(--send-gradient)" }}
              >
                <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function IconChip({
  children,
  label,
  primary = false,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  primary?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      type="button"
      className={
        "flex h-10 w-10 items-center justify-center rounded-full transition " +
        (primary
          ? "bg-foreground text-background hover:opacity-90"
          : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
