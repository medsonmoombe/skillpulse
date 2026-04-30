"use client";

import { useState, useEffect, useRef } from "react";
import { LiveKitRoom, RoomAudioRenderer, useParticipants, useLocalParticipant, useConnectionState } from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import "@livekit/components-styles";
import { Mic, MicOff, PhoneOff, Radio, Users } from "lucide-react";

interface LiveRoomViewProps {
  livekitRoomId: string;
  roomId: string;
  isHost?: boolean;
}

export function LiveRoomView({ livekitRoomId, roomId, isHost = false }: LiveRoomViewProps) {
  const [token, setToken] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const joinSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Simple beep using Web Audio API — no file needed
    joinSoundRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAA..."); 
  }, []);

  const handleJoin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/livekit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: roomId }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || "Failed to connect");
        return;
      }
      setToken(data.token);
      setIsConnected(true);
    } catch (err) {
      setError("Connection failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className="relative">
          <div className="h-14 w-14 rounded-2xl bg-slate-700 flex items-center justify-center">
            <Mic className="h-6 w-6 text-slate-300" />
          </div>
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-slate-800" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-100 text-sm">Audio Room</h3>
          <p className="text-xs text-slate-400 mt-1">
            {isHost ? "You'll join with mic enabled." : "You'll join muted. Host can unmute you."}
          </p>
        </div>
        {error && (
          <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">{error}</p>
        )}
        <button
          onClick={handleJoin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Radio className="h-4 w-4" />
          {isLoading ? "Connecting..." : "Join Audio"}
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
      onConnected={() => {
        try { joinSoundRef.current?.play(); } catch {}
      }}
      onDisconnected={() => {
        setIsConnected(false);
        window.location.href = `/dashboard/room/${roomId}`;
      }}
      className="flex-1 flex flex-col overflow-hidden"
    >
      <RoomAudioRenderer />
      <ConnectedPanel onLeave={() => setIsConnected(false)} isHost={isHost} />
    </LiveKitRoom>
  );
}

function ConnectedPanel({ onLeave, isHost }: { onLeave: () => void; isHost: boolean }) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const connectionState = useConnectionState();
  const [muted, setMuted] = useState(!isHost);

  useEffect(() => {
    if (connectionState !== ConnectionState.Connected) return;
    localParticipant?.setMicrophoneEnabled(isHost);
  }, [connectionState, localParticipant, isHost]);

  const toggleMute = async () => {
    const newMuted = !muted;
    setMuted(newMuted);
    await localParticipant?.setMicrophoneEnabled(!newMuted);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="shrink-0 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-semibold text-green-400">Live Audio</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Users className="h-3.5 w-3.5" />
          {participants.length}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {participants.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">Waiting for others...</p>
        ) : (
          participants.map((p) => (
            <div
              key={p.identity}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                p.isSpeaking ? "bg-indigo-900/50 border border-indigo-700/50" : "bg-slate-700/40"
              }`}
            >
              <div className={`relative h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                p.isSpeaking ? "bg-indigo-500 text-white" : "bg-slate-600 text-slate-300"
              }`}>
                {(p.name || p.identity).charAt(0).toUpperCase()}
                {p.isSpeaking && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-400 border-2 border-slate-800" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-200 truncate">{p.name || p.identity}</p>
                <p className="text-[10px] text-slate-500">{p.isSpeaking ? "Speaking..." : "Listening"}</p>
              </div>
              <div className={`shrink-0 ${p.isMicrophoneEnabled ? "text-slate-400" : "text-red-500"}`}>
                {p.isMicrophoneEnabled ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="shrink-0 border-t border-slate-700 p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
              muted
                ? "bg-red-900/50 text-red-400 border border-red-800/50 hover:bg-red-900"
                : "bg-slate-700 text-slate-200 hover:bg-slate-600"
            }`}
          >
            {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {muted ? "Unmute" : "Mute"}
          </button>
          <button
            onClick={onLeave}
            className="flex items-center justify-center px-4 py-2.5 rounded-xl bg-red-900/50 text-red-400 border border-red-800/50 hover:bg-red-900 text-xs font-semibold transition-colors"
            title="Leave audio"
          >
            <PhoneOff className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
