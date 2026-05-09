import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { buildAvatarUrl } from "@/components/Avatar";
import { toast } from "sonner";
import { Loader2, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarOptions {
  hair?: string;
  hairColor?: string;
  skinColor?: string;
  facialHair?: string;
  accessories?: string;
  clothing?: string;
  clothingColor?: string;
  eyeType?: string;
  eyebrowType?: string;
  mouthType?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const DEFAULTS: AvatarOptions = {
  hair: "shortFlat",
  hairColor: "brown",
  skinColor: "light",
  facialHair: "_none",
  accessories: "_none",
  clothing: "hoodie",
  clothingColor: "blue03",
  eyeType: "default",
  eyebrowType: "default",
  mouthType: "smile",
};

const STARTERS = [
  "I have curly red hair and dark skin",
  "Give me a professional look with glasses",
  "Make me look like a hacker",
  "Surprise me!",
];

export function AvatarCustomizer({ userId, onSaved }: { userId: string; onSaved?: () => void }) {
  const [opts, setOpts] = useState<AvatarOptions>(DEFAULTS);
  const [seed, setSeed] = useState(userId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [saving, setSaving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("avatar_seed, avatar_hair, avatar_hair_color, avatar_skin_color, avatar_facial_hair, avatar_accessories, avatar_clothing, avatar_clothing_color, avatar_eye_type, avatar_eyebrow_type, avatar_mouth_type")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setSeed(data.avatar_seed ?? userId);
        setOpts({
          hair: data.avatar_hair ?? DEFAULTS.hair,
          hairColor: data.avatar_hair_color ?? DEFAULTS.hairColor,
          skinColor: data.avatar_skin_color ?? DEFAULTS.skinColor,
          facialHair: data.avatar_facial_hair ?? DEFAULTS.facialHair,
          accessories: data.avatar_accessories ?? DEFAULTS.accessories,
          clothing: data.avatar_clothing ?? DEFAULTS.clothing,
          clothingColor: data.avatar_clothing_color ?? DEFAULTS.clothingColor,
          eyeType: data.avatar_eye_type ?? DEFAULTS.eyeType,
          eyebrowType: data.avatar_eyebrow_type ?? DEFAULTS.eyebrowType,
          mouthType: data.avatar_mouth_type ?? DEFAULTS.mouthType,
        });
      });
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const send = async (text: string) => {
    if (!text.trim() || thinking) return;
    const userMsg: Message = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setThinking(true);

    try {
      const { data, error } = await supabase.functions.invoke("avatar-chat", {
        body: {
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          currentOptions: opts,
        },
      });

      if (error) throw error;

      const newOpts = { ...opts, ...data.options };
      setOpts(newOpts);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply ?? "Done!" }]);
    } catch (e) {
      console.error(e);
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong. Try again!" }]);
    } finally {
      setThinking(false);
    }
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        avatar_hair: opts.hair,
        avatar_hair_color: opts.hairColor,
        avatar_skin_color: opts.skinColor,
        avatar_facial_hair: opts.facialHair,
        avatar_accessories: opts.accessories,
        avatar_clothing: opts.clothing,
        avatar_clothing_color: opts.clothingColor,
        avatar_eye_type: opts.eyeType,
        avatar_eyebrow_type: opts.eyebrowType,
        avatar_mouth_type: opts.mouthType,
      })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      toast.error("Could not save avatar");
    } else {
      toast.success("Avatar saved!");
      onSaved?.();
    }
  };

  const previewUrl = buildAvatarUrl(seed, opts);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Avatar preview + save */}
      <div className="flex flex-col items-center gap-4 lg:sticky lg:top-24">
        <div className="relative">
          <img
            src={previewUrl}
            alt="Avatar preview"
            className="h-40 w-40 rounded-full border-4 border-primary/20 bg-muted shadow-xl transition-all duration-500"
          />
          {thinking && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60 backdrop-blur-sm">
              <Sparkles className="h-6 w-6 animate-pulse text-primary" />
            </div>
          )}
        </div>
        <Button
          onClick={save}
          disabled={saving}
          className="w-40 rounded-2xl shadow-lg shadow-primary/10"
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save avatar
        </Button>
      </div>

      {/* Chat */}
      <div className="flex flex-1 flex-col rounded-2xl border border-border bg-muted/30 overflow-hidden" style={{ minHeight: 340 }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: 320 }}>
          {messages.length === 0 && (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-4">Describe how you look and I'll build your avatar!</p>
              <div className="flex flex-wrap justify-center gap-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card text-foreground border border-border rounded-bl-sm"
                )}
              >
                {m.content}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm border border-border bg-card px-3.5 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder="Describe your look…"
            className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={thinking}
          />
          <Button
            size="icon"
            onClick={() => send(input)}
            disabled={!input.trim() || thinking}
            className="rounded-xl"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
