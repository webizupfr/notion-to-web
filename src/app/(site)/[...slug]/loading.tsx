import { Skeleton } from "@/components/states/Skeleton";

export default function LoadingPage() {
  return (
    <section className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-6 py-12 sm:px-12">
      <div className="space-y-2">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-11/12" />
        <Skeleton className="h-5 w-10/12" />
      </div>
      <div className="ui-card p-6 space-y-3">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-5 w-10/12" />
        <Skeleton className="h-5 w-9/12" />
      </div>
    </section>
  );
}

