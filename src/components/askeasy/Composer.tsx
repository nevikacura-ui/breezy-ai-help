import { useEffect, useRef, useState } from "react";
import { ArrowUp, Mic, Square, X } from "lucide-react";
import type { Attachment } from "@/lib/askeasy";
import { Bubble } from "./Bubble";

type Props = {
  onSend: (text: string, attachments: Attachment[]) => void;
  disabled?: boolean;
  voiceEnabled: boolean;
  externalAttachments: Attachment[];
  onRemoveAttachment: (id: string) => void;
};

export function Composer({
  onSend,
  disabled,
  voiceEnabled,
  externalAttachments,
  onRemoveAttachment,
}: Props) {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [voiceAttachment, setVoiceAttachment] = useState<Attachment | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  const allAttachments = voiceAttachment
    ? [...externalAttachments, voiceAttachment]
    : externalAttachments;
  const hasContent = text.trim().length > 0 || allAttachments.length > 0;

  const submit = () => {
    if (!hasContent || disabled) return;
    onSend(text.trim(), allAttachments);
    setText("");
    setVoiceAttachment(null);
    allAttachments.forEach((a) => {
      if (a !== voiceAttachment) onRemoveAttachment(a.id);
    });
    requestAnimationFrame(() => textareaRef.current?.focus());
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
    recorderRef.current?.stop();
    recorderRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setRecording(false);
  };

  const bubbleState = disabled ? "thinking" : recording ? "listening" : "idle";

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
              ) : (
                <div className="flex h-10 items-center gap-2 rounded-full bg-foreground/10 px-3 text-xs">
                  <Mic className="h-3.5 w-3.5" /> Voice note
                </div>
              )}
              <button
                onClick={() =>
                  a === voiceAttachment
                    ? setVoiceAttachment(null)
                    : onRemoveAttachment(a.id)
                }
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background"
                aria-label="Remove"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        className="glass flex items-center gap-3 rounded-full py-2 pl-4 pr-2 shadow-[0_20px_60px_-25px_oklch(0.2_0.05_280/0.4)] transition"
        style={{
          boxShadow: disabled
            ? "0 0 0 1px oklch(0.72 0.22 300 / 0.35), 0 20px 60px -20px oklch(0.7 0.2 300 / 0.35)"
            : undefined,
        }}
      >
        <Bubble size={26} state={bubbleState} />

        {recording ? (
          <div className="flex flex-1 items-center gap-2 text-sm text-foreground/80">
            <span className="h-2 w-2 animate-pulse-soft rounded-full bg-destructive" />
            Listening… {formatTime(recordSeconds)}
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
            placeholder={disabled ? "Thinking…" : "Ask anything…"}
            rows={1}
            disabled={disabled}
            className="flex-1 resize-none bg-transparent py-1.5 text-[16px] leading-6 text-foreground placeholder:text-muted-foreground/70 focus:outline-none disabled:opacity-60"
          />
        )}

        {recording ? (
          <button
            onClick={stopRecording}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive text-white"
            aria-label="Stop recording"
          >
            <Square className="h-4 w-4 fill-current" />
          </button>
        ) : hasContent ? (
          <button
            aria-label="Send"
            onClick={submit}
            disabled={disabled}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg transition disabled:opacity-40"
            style={{ background: "var(--send-gradient)" }}
          >
            <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
          </button>
        ) : voiceEnabled ? (
          <button
            aria-label="Voice"
            onClick={startRecording}
            className="flex h-10 w-10 items-center justify-center rounded-full text-foreground/70 transition hover:bg-foreground/5 hover:text-foreground"
          >
            <Mic className="h-[18px] w-[18px]" />
          </button>
        ) : (
          <div className="h-10 w-10" />
        )}
      </div>
    </div>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
