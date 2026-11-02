import { NavLink } from "react-router-dom";
import { TUTORIALS_ROUTE } from "../content/routes";
import { contributingUrl } from "../lib/repo";
import { RepoLink } from "./RepoLink";
import { SiteBrand } from "./SiteBrand";

/** Header for the content pages (home, tutorials): brand, site navigation, repo link. */
export function SiteHeader() {
  const contributeHref = contributingUrl();
  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <SiteBrand />
        <nav className="header-nav" aria-label="Site">
          <NavLink className="header-link" to={TUTORIALS_ROUTE}>
            Tutorials
          </NavLink>
          {contributeHref && (
            <a className="header-link" href={contributeHref}>
              Add a question
            </a>
          )}
          <RepoLink />
        </nav>
      </div>
    </header>
  );
}
