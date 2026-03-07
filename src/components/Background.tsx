export default function Background({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="hero relative min-h-screen overflow-hidden text-white">
      {children}
    </div>
  );
}
