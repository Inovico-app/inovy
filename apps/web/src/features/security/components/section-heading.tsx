interface SectionHeadingProps {
  id: string;
  title: string;
  description: string;
}

export function SectionHeading({
  id,
  title,
  description,
}: SectionHeadingProps) {
  return (
    <div className="mb-8">
      <h2
        id={id}
        className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
      >
        {title}
      </h2>
      <p className="mt-3 max-w-2xl text-base text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
