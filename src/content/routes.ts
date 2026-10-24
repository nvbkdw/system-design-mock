/** Path of a question page relative to the site root, e.g. "q/url-shortener/". */
export const questionPath = (id: string) => `q/${id}/`;

/** Router path for a question page. */
export const questionRoute = (id: string) => "/" + questionPath(id);
