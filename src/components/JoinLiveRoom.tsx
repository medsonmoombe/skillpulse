"use client";

import { useState } from "react";
import { LiveKitRoom, RoomAudioRenderer, useParticipants } from "@livekit/components-react";
import "@livekit/components-styles";
import { Mic, MicOff, PhoneOff, Radio } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface JoinLiveRoomProps {
  roomName: string;
  userName: string;
}

export function JoinLiveRoom({ roomName, userName }: JoinLiveRoomProps) {
  const [token, setToken] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleJoin = async () => {
    setIsLoading(true);
    try {
      const resp = await fetch("/api/livekit", {
        method: "POST",
        body: JSON.stringify({ room: roomName }),
      });
      const data = await resp.json();
      setToken(data.token);
      setIsConnected(true);
    } catch (error) {
      console.error("Failed to get token:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-between gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative shrink-0">
            <Radio className="h-4 w-4 text-indigo-500" />
            <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-green-400" />
          </div>
          <span className="text-xs font-medium text-indigo-700 truncate">Live audio available</span>
        </div>
        <button
          onClick={handleJoin}
          disabled={isLoading}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          <Mic className="h-3.5 w-3.5" />
          {isLoading ? "Joining..." : "Join"}
        </button>
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      token={token}
      connect={true}
      audio={true}
      video={false}
      onDisconnected={() => setIsConnected(false)}
    >
      <RoomAudioRenderer />
      <ConnectedView onLeave={() => setIsConnected(false)} />
    </LiveKitRoom>
  );
}

function ConnectedView({ onLeave }: { onLeave: () => void }) {
  const participants = useParticipants();
  const [muted, setMuted] = useState(false);

  return (
    <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 space-y-2">
      {/* Status row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-semibold text-green-700">Live · {participants.length} in room</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMuted(!muted)}
            className={`p-1.5 rounded-lg transition-colors ${muted ? "bg-red-100 text-red-600 hover:bg-red-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={onLeave}
            className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
            title="Leave room"
          >
            <PhoneOff className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Participants avatars */}
      {participants.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {participants.slice(0, 6).map((p) => (
            <div key={p.identity} className="relative" title={p.name || p.identity}>
              <Avatar className="h-6 w-6 ring-2 ring-white">
                <AvatarFallback className="text-[9px] bg-indigo-100 text-indigo-600 font-semibold">
                  {(p.name || p.identity).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {p.isSpeaking && (
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-400 border border-white" />
              )}
            </div>
          ))}
          {participants.length > 6 && (
            <span className="text-[10px] text-green-600 font-medium">+{participants.length - 6}</span>
          )}
        </div>
      )}
    </div>
  );
}
