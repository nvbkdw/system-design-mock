// Repository URL for "contribute" links. CI sets VITE_REPO_URL; on a
// <user>.github.io/<repo>/ deployment without it, derive it from the URL.
export function repoUrl(): string | null {
  const fromEnv = import.meta.env.VITE_REPO_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const host = location.hostname.match(/^([^.]+)\.github\.io$/);
  const repo = location.pathname.split("/").filter(Boolean)[0];
  return host && repo ? `https://github.com/${host[1]}/${repo}` : null;
}

export function contributingUrl(): string | null {
  const repo = repoUrl();
  return repo ? `${repo}/blob/main/CONTRIBUTING.md` : null;
}
