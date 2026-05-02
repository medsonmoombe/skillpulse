"use client";

import { useActionState, useState } from "react";
import { submitExpertReview } from "@/app/actions/reviews";
import { initialReviewState } from "@/app/actions/reviews-types";
import { Star, Loader2, CheckCircle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useActionToast } from "@/lib/use-action-toast";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  reviewerId: string;
  reviewerName: string | null;
  reviewerAvatar: string | null;
};

type ExistingReview = {
  id: string;
  rating: number;
  comment: string | null;
} | null;

interface ExpertReviewsProps {
  expertId: string;
  reviews: Review[];
  ratingAvg: number; // 0-100
  reviewCount: number;
  canReview: boolean;
  existingReview: ExistingReview;
}

function StarRating({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: "sm" | "md";
}) {
  const [hovered, setHovered] = useState(0);
  const cls = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          onMouseEnter={() => onChange && setHovered(star)}
          onMouseLeave={() => onChange && setHovered(0)}
          className={onChange ? "cursor-pointer" : "cursor-default"}
          tabIndex={onChange ? 0 : -1}
        >
          <Star
            className={`${cls} transition-colors ${
              star <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "fill-slate-100 text-slate-200"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// Rating distribution bar (like Amazon/Google)
function RatingBar({ count, total, star }: { count: number; total: number; star: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-4 text-right text-xs text-slate-500">{star}</span>
      <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-right text-xs text-slate-400">{count}</span>
    </div>
  );
}

function ReviewForm({
  expertId,
  existing,
}: {
  expertId: string;
  existing: ExistingReview;
}) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [isEditing, setIsEditing] = useState(!existing);
  const [state, action, pending] = useActionState(submitExpertReview, initialReviewState);
  useActionToast(state);

  if (state.success) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        <CheckCircle className="h-4 w-4 shrink-0" />
        {state.message}
      </div>
    );
  }

  // Already reviewed — show summary with edit option
  if (existing && !isEditing) {
    return (
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 mb-1">Your Review</p>
            <StarRating value={existing.rating} />
            {existing.comment && (
              <p className="mt-1.5 text-sm text-slate-600">{existing.comment}</p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="shrink-0 gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <input type="hidden" name="expertId" value={expertId} />
      <input type="hidden" name="rating" value={rating} />

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">
          {existing ? "Update your rating" : "Rate this expert"}
        </p>
        <StarRating value={rating} onChange={setRating} />
        {rating > 0 && (
          <p className="mt-1 text-xs text-slate-400">
            {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
          </p>
        )}
      </div>

      <Textarea
        name="comment"
        defaultValue={existing?.comment ?? ""}
        placeholder="Share your experience (optional)..."
        rows={3}
        maxLength={500}
      />

      {state.message && !state.success && (
        <p className="text-xs text-red-600">{state.message}</p>
      )}

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          disabled={pending || rating === 0}
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {pending ? (
            <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Submitting...</>
          ) : existing ? "Update Review" : "Submit Review"}
        </Button>
        {existing && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

export function ExpertReviews({
  expertId,
  reviews,
  ratingAvg: _ratingAvg,
  reviewCount: _reviewCount,
  canReview,
  existingReview,
}: ExpertReviewsProps) {
  // Calculate directly from reviews array — source of truth
  const reviewCount = reviews.length;
  const ratingAvg = reviewCount > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
    : 0;
  const displayRating = reviewCount > 0 ? ratingAvg.toFixed(1) : null;

  // Distribution
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {/* Big number */}
        <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 px-6 py-4 text-center shrink-0">
          <p className="text-5xl font-extrabold text-slate-900 leading-none">
            {displayRating ?? "—"}
          </p>
          <StarRating value={displayRating ? Math.round(ratingAvg) : 0} />
          <p className="mt-1 text-xs text-slate-400">
            {reviewCount} review{reviewCount !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Distribution bars */}
        {reviewCount > 0 && (
          <div className="flex-1 space-y-1.5 py-1">
            {dist.map(({ star, count }) => (
              <RatingBar key={star} star={star} count={count} total={reviewCount} />
            ))}
          </div>
        )}
      </div>

      {/* Write / edit review */}
      {canReview && (
        <ReviewForm expertId={expertId} existing={existingReview} />
      )}

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <p className="text-sm text-slate-400">No reviews yet. Be the first to leave one.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-xs font-bold text-white">
                  {review.reviewerAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={review.reviewerAvatar} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    (review.reviewerName ?? "?").charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">
                      {review.reviewerName ?? "Anonymous"}
                    </p>
                    <StarRating value={review.rating} size="sm" />
                  </div>
                  {review.comment && (
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{review.comment}</p>
                  )}
                  <p className="mt-2 text-[11px] text-slate-400">
                    {new Date(review.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
