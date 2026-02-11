export function UpdateBanner({ releaseUrl }: { releaseUrl: string }) {
  return (
    <div className="banner">
      Update available. <a href={releaseUrl} target="_blank" rel="noreferrer">Open latest release</a>
    </div>
  );
}
