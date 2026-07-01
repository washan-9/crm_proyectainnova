export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-1 flex-col gap-2 p-8">
      <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        {title}
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">{description}</p>
      <div className="mt-6 flex flex-1 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-zinc-400 dark:border-zinc-700 dark:text-zinc-600">
        Próximamente
      </div>
    </div>
  );
}
