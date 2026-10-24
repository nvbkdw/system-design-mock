import { SITE_NAME } from "../content/site";

/**
 * Site title that links home with a full page load (not in-app navigation).
 * Every page's <base> is the site root, so "./" is the home page at any depth.
 */
export function SiteBrand() {
  return (
    <a className="brand" href="./">
      {SITE_NAME}
    </a>
  );
}
