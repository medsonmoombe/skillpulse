export default function ConversationLoading() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header skeleton */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
        <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-200" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-32 animate-pulse rounded-full bg-slate-200" />
          <div className="h-2.5 w-24 animate-pulse rounded-full bg-slate-100" />
        </div>
      </div>

      {/* Messages skeleton */}
      <div className="flex-1 space-y-4 overflow-hidden px-4 py-4">
        {[
          { own: false, w: "w-48" },
          { own: false, w: "w-64" },
          { own: true,  w: "w-40" },
          { own: false, w: "w-56" },
          { own: true,  w: "w-52" },
          { own: true,  w: "w-36" },
          { own: false, w: "w-44" },
        ].map((item, i) => (
          <div key={i} className={`flex items-end gap-2 ${item.own ? "flex-row-reverse" : "flex-row"}`}>
            {!item.own && <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-slate-200" />}
            <div className={`h-9 animate-pulse rounded-2xl bg-slate-200 ${item.w} ${
              item.own ? "rounded-tr-sm" : "rounded-tl-sm"
            }`} />
          </div>
        ))}
      </div>

      {/* Composer skeleton */}
      <div className="border-t border-slate-100 px-3 py-3">
        <div className="h-10 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    </div>
  );
}
