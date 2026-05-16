'use client';

export function SkeletonLoader() {
  return (
    <div className="flex flex-col gap-4 px-4 py-8 animate-in fade-in duration-500">
      {/* AI message skeleton */}
      <div className="flex gap-3 items-start">
        <div className="w-9 h-9 rounded-full bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] flex-shrink-0 animate-pulse" />
        <div className="flex-1 space-y-2.5 pt-1">
          <div className="h-3 w-3/4 bg-[var(--ren-bg-tertiary)] rounded-full animate-pulse" />
          <div className="h-3 w-1/2 bg-[var(--ren-bg-tertiary)] rounded-full animate-pulse" />
          <div className="h-3 w-5/6 bg-[var(--ren-bg-tertiary)] rounded-full animate-pulse" />
        </div>
      </div>

      {/* User message skeleton */}
      <div className="flex gap-3 justify-end mt-6">
        <div className="flex-1 max-w-[70%] space-y-2.5 pt-1">
          <div className="h-3 w-full bg-[var(--ren-bg-message-user)] rounded-full animate-pulse" style={{ opacity: 0.5 }} />
          <div className="h-3 w-2/3 bg-[var(--ren-bg-message-user)] rounded-full animate-pulse" style={{ opacity: 0.5 }} />
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1e1e24] to-[var(--ren-bg-tertiary)] border border-[var(--ren-border)]/50 flex-shrink-0 animate-pulse" />
      </div>

      {/* AI response skeleton */}
      <div className="flex gap-3 items-start mt-2">
        <div className="w-9 h-9 rounded-full bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] flex-shrink-0 animate-pulse" />
        <div className="flex-1 space-y-2.5 pt-1">
          <div className="h-3 w-5/6 bg-[var(--ren-bg-tertiary)] rounded-full animate-pulse" />
          <div className="h-3 w-2/3 bg-[var(--ren-bg-tertiary)] rounded-full animate-pulse" />
          <div className="h-3 w-4/5 bg-[var(--ren-bg-tertiary)] rounded-full animate-pulse" />
          <div className="h-3 w-1/3 bg-[var(--ren-bg-tertiary)] rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}
