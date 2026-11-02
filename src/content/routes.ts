/** Path of a question page relative to the site root, e.g. "q/url-shortener/". */
export const questionPath = (id: string) => `q/${id}/`;

/** Router path for a question page. */
export const questionRoute = (id: string) => "/" + questionPath(id);

/** Path of the tutorials table of contents relative to the site root. */
export const TUTORIALS_PATH = "tutorials/";

/** Path of a tutorial chapter relative to the site root, e.g. "tutorials/interview-format/". */
export const chapterPath = (id: string) => `${TUTORIALS_PATH}${id}/`;

/** Router paths for the tutorials pages. */
export const TUTORIALS_ROUTE = "/" + TUTORIALS_PATH;
export const chapterRoute = (id: string) => "/" + chapterPath(id);
