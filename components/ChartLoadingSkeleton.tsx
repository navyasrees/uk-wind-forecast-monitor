export function ChartLoadingSkeleton() {
  return (
    <div className="w-full h-[300px] md:h-[400px] animate-pulse flex flex-col gap-3 p-4">
      <div className="flex gap-4 mb-2">
        <div className="flex items-center gap-2">
          <div className="h-3 w-8 rounded bg-muted" />
          <div className="h-3 w-16 rounded bg-muted" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-8 rounded bg-muted" />
          <div className="h-3 w-16 rounded bg-muted" />
        </div>
      </div>
      <div className="flex-1 bg-muted rounded" />
      <div className="h-4 bg-muted rounded w-full" />
    </div>
  );
}
