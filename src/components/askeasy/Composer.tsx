import { useEffect, useRef, useState } from "react";
import { ArrowUp, FileUp, Camera, Mic, Square, X } from "lucide-react";
import type { Attachment } from "@/lib/askeasy";
import { Bubble } from "./Bubble";
import tricolorRing from "@/assets/tricolor-ring.png.asset.json";

type Props = {
  onSend: (text: string, attachments: Attachment[]) => void;
  disabled?: boolean;
  onOpenCamera: () => void;
  externalAttachments: Attachment[];
  onAddAttachments: (a: Attachment[]) => void;
  onRemoveAttachment: (id: string) => void;
  /** Emitted when input area is focused/hovered — used by the orb. */
  onActivityChange?: (state: { focused: boolean; hasInput: boolean }) => void;
  placeholder?: string;
  thinkingLabel?: string;
  indiaMode?: boolean;
};

const LONG_PRESS_MS = 450;

function haptic(ms: number = 12) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      /* noop */
    }
  }
}

export function Composer({
  onSend,
  disabled,
  onOpenCamera,
  externalAttachments,
  onAddAttachments,
  onRemoveAttachment,
  onActivityChange,
  placeholder,
  thinkingLabel,
  indiaMode,
}: Props) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [voiceAttachment, setVoiceAttachment] = useState<Attachment | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [text]);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const allAttachments = voiceAttachment
    ? [...externalAttachments, voiceAttachment]
    : externalAttachments;
  const hasContent = text.trim().length > 0 || allAttachments.length > 0;

  useEffect(() => {
    onActivityChange?.({ focused: focused || hovered, hasInput: hasContent });
  }, [focused, hovered, hasContent, onActivityChange]);


  const submit = () => {
    if (!hasContent || disabled) return;
    haptic(10);
    onSend(text.trim(), allAttachments);
    setText("");
    setVoiceAttachment(null);
    externalAttachments.forEach((a) => onRemoveAttachment(a.id));
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const list: Attachment[] = [];
    Array.from(files)
      .slice(0, 4)
      .forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          list.push({
            id: crypto.randomUUID(),
            type: file.type.startsWith("image/") ? "image" : "file",
            dataUrl: String(reader.result),
            name: file.name,
          });
          if (list.length) onAddAttachments([...list]);
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
          setVoiceAttachment({
            id: crypto.randomUUID(),
            type: "audio",
            dataUrl: String(reader.result),
            name: `voice-note.${mime.includes("mp4") ? "m4a" : "webm"}`,
          });
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
    haptic(15);
    recorderRef.current?.stop();
    recorderRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setRecording(false);
  };

  // Bubble press handlers
  const onBubbleDown = () => {
    if (disabled || recording) return;
    longPressed.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressed.current = true;
      haptic(20);
      startRecording();
    }, LONG_PRESS_MS);
  };
  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  const onBubbleUp = () => {
    clearLongPress();
  };
  const onBubbleClick = () => {
    if (recording) {
      stopRecording();
      return;
    }
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    if (disabled) return;
    setMenuOpen((v) => !v);
  };

  // Keyboard: Enter/Space click already fires onClick. Hold Space to record.
  const spaceHeldRef = useRef(false);
  const onBubbleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && menuOpen) {
      e.preventDefault();
      setMenuOpen(false);
      return;
    }
    if (e.key === " " && !e.repeat && !recording && !disabled) {
      // Prevent default click-on-space so we can implement hold-to-talk
      e.preventDefault();
      spaceHeldRef.current = true;
      onBubbleDown();
    }
  };
  const onBubbleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === " " && spaceHeldRef.current) {
      e.preventDefault();
      spaceHeldRef.current = false;
      if (recording) {
        stopRecording();
      } else {
        // Short press → treat as click (toggle menu)
        clearLongPress();
        onBubbleClick();
      }
    }
  };

  // Close menu on Escape from anywhere in composer
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);


  const bubbleState = disabled
    ? "thinking"
    : recording
      ? "listening"
      : menuOpen
        ? "active"
        : "idle";

  return (
    <div className="mx-auto w-full max-w-2xl">
      {allAttachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 px-2">
          {allAttachments.map((a) => (
            <div key={a.id} className="group relative">
              {a.type === "image" ? (
                <img
                  src={a.dataUrl}
                  alt=""
                  className="h-16 w-16 rounded-xl object-cover"
                />
              ) : a.type === "audio" ? (
                <div className="flex h-10 items-center gap-2 rounded-full bg-foreground/10 px-3 text-xs">
                  <Mic className="h-3.5 w-3.5" /> Voice note
                </div>
              ) : (
                <div className="flex h-10 max-w-[180px] items-center gap-2 rounded-full bg-foreground/10 px-3 text-xs">
                  <FileUp className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{a.name ?? "File"}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() =>
                  a === voiceAttachment
                    ? setVoiceAttachment(null)
                    : onRemoveAttachment(a.id)
                }
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label={`Remove ${a.type === "image" ? "image" : a.type === "audio" ? "voice note" : a.name ?? "attachment"}`}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>

            </div>
          ))}
        </div>
      )}

      <div className="relative">
        {/* Bubble menu */}
        {menuOpen && (
          <>
            <div
              aria-hidden="true"
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            <div
              role="menu"
              aria-label="Composer actions"
              className="glass animate-fade-up absolute bottom-full left-2 z-20 mb-3 w-56 rounded-2xl p-1.5 shadow-[0_20px_60px_-20px_oklch(0.2_0.05_280/0.45)]"
              style={{ animationDuration: "0.25s" }}
            >
              <MenuRow
                icon={<FileUp className="h-4 w-4" />}
                title="Add file"
                hint="Images & PDFs"
                onClick={() => {
                  setMenuOpen(false);
                  fileInputRef.current?.click();
                }}
              />
              <MenuRow
                icon={<Camera className="h-4 w-4" />}
                title="Camera"
                hint="Snap a photo"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenCamera();
                }}
              />
              <div className="mt-1 border-t border-foreground/10 px-3 py-2 text-[11px] text-muted-foreground">
                Hold the ring to talk (or hold Space when focused)
              </div>
            </div>
          </>
        )}


        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="flex items-center gap-2 rounded-full py-2 pl-2 pr-2 backdrop-blur-xl transition-all duration-500 sm:gap-3"
          style={{
            background: "color-mix(in oklab, oklch(0.08 0.005 160) 82%, transparent)",
            boxShadow: disabled
              ? "inset 0 0 0 1px oklch(0.78 0.22 145 / 0.35), 0 24px 70px -30px oklch(0.78 0.22 145 / 0.25)"
              : recording
                ? "inset 0 0 0 1px oklch(0.7 0.24 25 / 0.4), 0 24px 70px -30px oklch(0.7 0.24 25 / 0.3)"
                : focused
                  ? "inset 0 0 0 1px oklch(0.78 0.22 145 / 0.35), 0 24px 70px -30px oklch(0.78 0.22 145 / 0.3)"
                  : "inset 0 0 0 1px oklch(1 0 0 / 0.06), 0 20px 60px -30px oklch(0 0 0 / 0.9)",
          }}
        >

          {indiaMode ? (
            <button
              type="button"
              aria-label={recording ? "Stop recording" : "Open actions — hold to talk"}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-pressed={recording}
              onPointerDown={onBubbleDown}
              onPointerUp={onBubbleUp}
              onPointerLeave={clearLongPress}
              onPointerCancel={clearLongPress}
              onClick={onBubbleClick}
              onKeyDown={onBubbleKeyDown}
              onKeyUp={onBubbleKeyUp}
              onContextMenu={(e) => e.preventDefault()}
              className="ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full outline-none transition-transform duration-200 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <img
                src={tricolorRing.url}
                alt=""
                draggable={false}
                className={
                  "h-8 w-8 select-none " +
                  (bubbleState === "thinking" || bubbleState === "listening"
                    ? "animate-spin [animation-duration:2.4s]"
                    : "")
                }
              />
            </button>
          ) : (
            <Bubble
              size={28}
              state={bubbleState}
              interactive
              ariaLabel={recording ? "Stop recording" : "Open actions — hold to talk"}
              ariaExpanded={menuOpen}
              ariaHasPopup="menu"
              ariaPressed={recording}
              onPointerDown={onBubbleDown}
              onPointerUp={onBubbleUp}
              onPointerLeave={clearLongPress}
              onPointerCancel={clearLongPress}
              onClick={onBubbleClick}
              onKeyDown={onBubbleKeyDown}
              onKeyUp={onBubbleKeyUp}
              onContextMenu={(e) => e.preventDefault()}
              className="ml-1"
            />
          )}



          {recording ? (
            <div
              className="flex flex-1 items-center gap-2 text-sm text-foreground/80"
              role="status"
              aria-live="polite"
            >
              <img
                src={tricolorRing.url}
                alt=""
                draggable={false}
                className="h-5 w-5 shrink-0 select-none animate-spin [animation-duration:1.6s]"
              />
              Listening… {formatTime(recordSeconds)}
              <span className="ml-1 text-[11px] text-muted-foreground">
                tap ring to stop
              </span>
            </div>

          ) : (
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={disabled ? (thinkingLabel ?? "Thinking…") : (placeholder ?? "Ask anything…")}
              rows={1}
              disabled={disabled}
              className="flex-1 resize-none bg-transparent py-1.5 text-[16px] leading-6 text-foreground placeholder:text-muted-foreground/70 focus:outline-none disabled:opacity-60"
            />
          )}

          {/* Go button — appears only when there's input */}
          <div
            className="overflow-hidden transition-all duration-300"
            style={{
              width: hasContent || recording ? 76 : 0,
              opacity: hasContent || recording ? 1 : 0,
            }}
          >
            {recording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="flex h-10 w-[72px] items-center justify-center gap-1 rounded-full bg-destructive text-white shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label="Stop recording"
              >
                <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                <span className="text-[13px] font-semibold">Stop</span>
              </button>
            ) : (
              <button
                type="button"
                aria-label="Send message"
                onClick={submit}
                disabled={!hasContent || disabled}
                className="flex h-10 w-[72px] items-center justify-center gap-1 rounded-full text-white shadow-lg outline-none transition-transform duration-200 hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-40"
                style={{
                  background: "var(--send-gradient)",
                  transform: hasContent ? "scale(1)" : "scale(0.6)",
                }}
              >
                <span className="text-[13px] font-semibold tracking-wide">Go</span>
                <ArrowUp className="h-4 w-4" strokeWidth={2.6} aria-hidden="true" />
              </button>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

function MenuRow({
  icon,
  title,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition hover:bg-foreground/5 focus-visible:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-primary"
    >

      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10 text-foreground">
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-[13px] font-medium text-foreground">
          {title}
        </span>
        <span className="block text-[11px] text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
