/**
 * Site title that links home with a full page load (not in-app navigation).
 * "./" resolves to the site root (…/system-design-mock/) and drops the hash,
 * so the browser loads the home page fresh.
 */
export function SiteBrand() {
  return (
    <a className="brand" href="./">
      System Design Interview Mock
    </a>
  );
}
