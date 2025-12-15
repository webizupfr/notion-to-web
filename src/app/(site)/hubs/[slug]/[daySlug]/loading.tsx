import { Skeleton } from "@/components/states/Skeleton";

export default function LoadingHubDayPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1800px] gap-10 px-4 py-10 sm:px-8 lg:px-10">
      <div className="hidden lg:flex lg:w-72 lg:flex-shrink-0 lg:flex-col lg:gap-4">
        <Skeleton className="h-6 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-11/12" />
          ))}
        </div>
      </div>

      <section className="flex-1 min-w-0 space-y-8">
        <div className="content-panel section-band w-full space-y-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>

        <div className="content-panel section-band w-full space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-10 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-5/6" />
          <Skeleton className="h-5 w-3/4" />
        </div>

        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </section>
    </div>
  );
}
