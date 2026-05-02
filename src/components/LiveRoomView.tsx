"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useLocalParticipant,
  useParticipants,
} from "@livekit/components-react";
import { useBroadcastEvent, useMutation, useStorage } from "@liveblocks/react/suspense";
import { ConnectionState } from "livekit-client";
import "@livekit/components-styles";
import {
  Hand,
  Heart,
  Laugh,
  MessageCircleHeart,
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  Sparkles,
  Users,
  Volume2,
} from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";

interface LiveRoomViewProps {
  livekitRoomId: string;
  roomId: string;
  isHost?: boolean;
  currentUserId: string;
  currentUserName: string;
  currentUserRole?: string;
}

const REACTIONS = [
  { emoji: "👏", label: "Clap", icon: Sparkles },
  { emoji: "👍", label: "Like", icon: Volume2 },
  { emoji: "❤️", label: "Love", icon: Heart },
  { emoji: "😂", label: "Laugh", icon: Laugh },
] as const;

export function LiveRoomView({
  livekitRoomId,
  roomId,
  isHost = false,
  currentUserId,
  currentUserName,
  currentUserRole = "learner",
}: LiveRoomViewProps) {
  const [token, setToken] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const joinSoundRef = useRef<HTMLAudioElement | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
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
        const message = data.error || "Failed to connect";
        setError(message);
        showToast(message, "error");
        return;
      }
      setToken(data.token);
      setIsConnected(true);
    } catch {
      const message = "Connection failed. Please try again.";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="relative">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-700">
            <Mic className="h-6 w-6 text-slate-300" />
          </div>
          <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-slate-800 bg-green-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Audio Room</h3>
          <p className="mt-1 text-xs text-slate-400">
            {isHost ? "You'll join with mic enabled and moderate speakers." : "Join audio to speak, react, and raise your hand."}
          </p>
        </div>
        {error ? (
          <p className="rounded-lg border border-red-800/30 bg-red-900/20 px-3 py-2 text-xs text-red-400">{error}</p>
        ) : null}
        <button
          onClick={handleJoin}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
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
        try {
          joinSoundRef.current?.play();
        } catch {}
      }}
      onDisconnected={() => {
        setIsConnected(false);
        window.location.href = `/dashboard/room/${roomId}`;
      }}
      className="flex flex-1 flex-col overflow-hidden"
    >
      <RoomAudioRenderer />
      <ConnectedPanel
        onLeave={() => setIsConnected(false)}
        isHost={isHost}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserRole={currentUserRole}
      />
    </LiveKitRoom>
  );
}

function ConnectedPanel({
  onLeave,
  isHost,
  currentUserId,
  currentUserName,
  currentUserRole,
}: {
  onLeave: () => void;
  isHost: boolean;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: string;
}) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const connectionState = useConnectionState();
  const broadcast = useBroadcastEvent();

  const [muted, setMuted] = useState(!isHost);
  const [requestPending, setRequestPending] = useState(false);

  const openMic = useStorage((root) => (root as any).audioState?.openMic ?? false);
  const sharedBoardUserId = useStorage((root) => (root as any).sharedBoard?.userId ?? null);
  const raisedHands = useStorage((root) => (root as any).raisedHands ?? {});
  const unmuteRequest = useStorage((root) => {
    const request = (root as any).unmuteRequest;
    if (!request?.targetUserId) return null;
    return {
      targetUserId: request.targetUserId as string,
      requestedById: (request.requestedById as string | null) ?? null,
      requestedByName: (request.requestedByName as string | null) ?? null,
    };
  });

  const isHandRaised = raisedHands?.[currentUserId] === true;
  const isSharingBoard = sharedBoardUserId === currentUserId;
  const hasUnmuteInvite = unmuteRequest?.targetUserId === currentUserId;

  const setOpenMic = useMutation(({ storage }, value: boolean) => {
    const audioState = (storage as any).get("audioState");
    audioState?.set("openMic", value);
  }, []);

  const setRaisedHand = useMutation(({ storage }, userId: string, value: boolean) => {
    const hands = (storage as any).get("raisedHands");
    if (!hands) return;
    if (value) {
      hands.set(userId, true);
    } else {
      hands.delete(userId);
    }
  }, []);

  const setUnmuteRequest = useMutation(
    ({ storage }, request: { targetUserId: string | null; requestedById: string | null; requestedByName: string | null }) => {
      const unmuteState = (storage as any).get("unmuteRequest");
      unmuteState?.set("targetUserId", request.targetUserId);
      unmuteState?.set("requestedById", request.requestedById);
      unmuteState?.set("requestedByName", request.requestedByName);
    },
    []
  );

  const clearUnmuteRequest = useCallback(() => {
    setUnmuteRequest({
      targetUserId: null,
      requestedById: null,
      requestedByName: null,
    });
    setRequestPending(false);
  }, [setUnmuteRequest]);

  useEffect(() => {
    if (connectionState !== ConnectionState.Connected) return;

    const shouldEnableMic = isHost || openMic || isSharingBoard;
    localParticipant?.setMicrophoneEnabled(shouldEnableMic);
    setMuted(!shouldEnableMic);
  }, [connectionState, isHost, localParticipant, openMic, isSharingBoard]);

  useEffect(() => {
    if (!hasUnmuteInvite || connectionState !== ConnectionState.Connected) return;
    setRequestPending(true);
  }, [connectionState, hasUnmuteInvite]);

  const canSelfManageMic = isHost || openMic || hasUnmuteInvite || isSharingBoard;

  const toggleMute = async () => {
    if (!canSelfManageMic && muted) return;

    const nextMuted = !muted;
    setMuted(nextMuted);
    await localParticipant?.setMicrophoneEnabled(!nextMuted);
    if (!nextMuted) {
      clearUnmuteRequest();
      setRaisedHand(currentUserId, false);
    }
  };

  const inviteToSpeak = async () => {
    if (!requestPending || connectionState !== ConnectionState.Connected) return;

    await localParticipant?.setMicrophoneEnabled(true);
    setMuted(false);
    clearUnmuteRequest();
    setRaisedHand(currentUserId, false);
  };

  const sendReaction = (emoji: string) => {
    broadcast({
      type: "ROOM_REACTION",
      emoji,
      userId: currentUserId,
      userName: currentUserName,
    });
  };

  const participantsWithMeta = useMemo(
    () =>
      participants.map((participant) => ({
        id: participant.identity,
        name: participant.name || participant.identity,
        isSpeaking: participant.isSpeaking,
        isMicrophoneEnabled: participant.isMicrophoneEnabled,
        raisedHand: raisedHands?.[participant.identity] === true,
        isSharing: sharedBoardUserId === participant.identity,
      })),
    [participants, raisedHands, sharedBoardUserId]
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
            <span className="text-xs font-semibold text-green-400">Live Audio</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Users className="h-3.5 w-3.5" />
            {participants.length}
          </div>
        </div>

        {isHost ? (
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => setOpenMic(!openMic)}
              className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                openMic
                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
            >
              {openMic ? "Open mic is on" : "Enable open mic"}
            </button>
          </div>
        ) : null}

        {!isHost ? (
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => setRaisedHand(currentUserId, !isHandRaised)}
              className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                isHandRaised
                  ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
            >
              {isHandRaised ? "Lower hand" : "Raise hand"}
            </button>
            <div className="flex items-center gap-1">
              {REACTIONS.map(({ emoji, label }) => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  title={label}
                  className="rounded-xl bg-slate-800 px-2.5 py-2 text-sm transition-colors hover:bg-slate-700"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {requestPending ? (
        <div className="border-b border-indigo-500/20 bg-indigo-600/15 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-indigo-500/20 p-2 text-indigo-300">
              <Mic className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-indigo-200">Host invited you to speak</p>
              <p className="mt-1 text-[11px] text-indigo-100/80">
                {unmuteRequest?.requestedByName ?? "The host"} wants to hear you{isSharingBoard ? " while you share your board" : ""}.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={inviteToSpeak}
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-50"
                >
                  Unmute now
                </button>
                <button
                  onClick={clearUnmuteRequest}
                  className="rounded-lg bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-800"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {participantsWithMeta.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-500">Waiting for others...</p>
        ) : (
          participantsWithMeta.map((participant) => {
            const isSelf = participant.id === currentUserId;

            return (
              <div
                key={participant.id}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                  participant.isSpeaking ? "border border-indigo-700/50 bg-indigo-900/50" : "bg-slate-700/40"
                }`}
              >
                <div
                  className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    participant.isSpeaking ? "bg-indigo-500 text-white" : "bg-slate-600 text-slate-300"
                  }`}
                >
                  {participant.name.charAt(0).toUpperCase()}
                  {participant.isSpeaking ? (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-800 bg-green-400" />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-200">
                    {participant.name}
                    {isSelf ? " (You)" : ""}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-500">
                    <span>{participant.isSpeaking ? "Speaking..." : "Listening"}</span>
                    {participant.raisedHand ? (
                      <span className="inline-flex items-center gap-1 text-amber-300">
                        <Hand className="h-3 w-3" />
                        Raised hand
                      </span>
                    ) : null}
                    {participant.isSharing ? (
                      <span className="inline-flex items-center gap-1 text-emerald-300">
                        <MessageCircleHeart className="h-3 w-3" />
                        Sharing board
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className={`shrink-0 ${participant.isMicrophoneEnabled ? "text-slate-400" : "text-red-500"}`}>
                  {participant.isMicrophoneEnabled ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                </div>

                {isHost && !isSelf ? (
                  <button
                    onClick={() =>
                      setUnmuteRequest({
                        targetUserId: participant.id,
                        requestedById: currentUserId,
                        requestedByName: currentUserName,
                      })
                    }
                    className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-[10px] font-semibold text-slate-200 transition-colors hover:bg-slate-700"
                  >
                    Ask to unmute
                  </button>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      <div className="shrink-0 border-t border-slate-700 p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            disabled={!canSelfManageMic && muted}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-colors ${
              muted
                ? "border border-red-800/50 bg-red-900/50 text-red-400 hover:bg-red-900 disabled:opacity-50"
                : "bg-slate-700 text-slate-200 hover:bg-slate-600"
            }`}
          >
            {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {muted ? (canSelfManageMic ? "Unmute" : "Wait for host") : "Mute"}
          </button>
          <button
            onClick={onLeave}
            className="flex items-center justify-center rounded-xl border border-red-800/50 bg-red-900/50 px-4 py-2.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-900"
            title="Leave audio"
          >
            <PhoneOff className="h-4 w-4" />
          </button>
        </div>
        {!isHost ? (
          <p className="mt-2 text-[10px] text-slate-500">
            {openMic
              ? "Open mic is enabled. You can mute and unmute yourself."
              : currentUserRole === "expert"
                ? "Experts can be invited to unmute by the host, or speak automatically while sharing."
                : "Raise your hand or wait for the host to invite you to speak."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
