import { Skeleton } from "@/components/states/Skeleton";

export default function LoadingModulePage() {
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12 sm:px-12">
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-2/3" />
      </div>
      <div className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-8 lg:col-span-9 space-y-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-11/12" />
          <Skeleton className="h-5 w-10/12" />
        </div>
        <div className="md:col-span-4 lg:col-span-3 space-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-10/12" />
          <Skeleton className="h-4 w-8/12" />
        </div>
      </div>
    </section>
  );
}

