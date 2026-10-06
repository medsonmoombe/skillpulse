"use client";

import { useEffect, useRef, useState } from "react";
import { PostSessionModal } from "./PostSessionModal";
import { PartialAttendanceBanner } from "./PartialAttendanceBanner";

export function LessonLiveTracker({
  roomId,
  sessionType,
  sessionTitle,
  isHost,
  isAdmitted,
}: {
  roomId: string;
  sessionType: string;
  sessionTitle: string;
  isHost: boolean;
  isAdmitted: boolean;
}) {
  const [showPostModal, setShowPostModal] = useState(false);
  const [showPartialBanner, setShowPartialBanner] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState<string | null>(null);
  const joinedAtRef = useRef<Date | null>(null);
  const hasTrackedJoinRef = useRef(false);

  // Track join on mount
  useEffect(() => {
    if (sessionType !== "lesson_live" || isHost || !isAdmitted || hasTrackedJoinRef.current) return;

    hasTrackedJoinRef.current = true;
    joinedAtRef.current = new Date();

    fetch("/api/rooms/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, event: "join" }),
    }).catch(console.error);
  }, [roomId, sessionType, isHost, isAdmitted]);

  // Track leave on unmount
  useEffect(() => {
    return () => {
      if (sessionType !== "lesson_live" || isHost || !joinedAtRef.current) return;

      fetch("/api/rooms/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, event: "leave" }),
      }).catch(console.error);
    };
  }, [roomId, sessionType, isHost]);

  // Listen for session end event
  useEffect(() => {
    if (sessionType !== "lesson_live" || isHost) return;

    const handleSessionEnd = async () => {
      // Fetch final attendance status
      try {
        const res = await fetch(`/api/rooms/attendance?roomId=${roomId}`);
        if (res.ok) {
          const data = await res.json();
          setAttendanceStatus(data.attendanceStatus);

          if (data.attendanceStatus === "partial") {
            setShowPartialBanner(true);
          }
        }
      } catch (err) {
        console.error("Failed to fetch attendance status:", err);
      }

      // Show rating modal
      setShowPostModal(true);
    };

    window.addEventListener("lesson-session-ended", handleSessionEnd);
    return () => window.removeEventListener("lesson-session-ended", handleSessionEnd);
  }, [roomId, sessionType, isHost]);

  if (sessionType !== "lesson_live" || isHost) return null;

  return (
    <>
      {showPostModal && (
        <PostSessionModal
          roomId={roomId}
          sessionTitle={sessionTitle}
          onClose={() => setShowPostModal(false)}
        />
      )}
      {showPartialBanner && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
          <PartialAttendanceBanner
            roomId={roomId}
            onMarked={() => setShowPartialBanner(false)}
          />
        </div>
      )}
    </>
  );
}
