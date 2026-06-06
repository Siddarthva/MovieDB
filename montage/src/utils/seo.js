/**
 * SEO & Metadata Utility for CinePulse.
 */

export function setMetadata(title, description = "Discover the next cinematic masterpiece. Prime trailers, ratings, and release dates.") {
  const fullTitle = `${title} | CinePulse`;
  document.title = fullTitle;

  // Update meta description
  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.name = "description";
    document.head.appendChild(metaDesc);
  }
  metaDesc.content = description;

  // Update OG tags
  const updateOG = (property, content) => {
    let tag = document.querySelector(`meta[property="${property}"]`);
    if (!tag) {
      tag = document.createElement('meta');
      tag.property = property;
      document.head.appendChild(tag);
    }
    tag.content = content;
  };

  updateOG('og:title', fullTitle);
  updateOG('og:description', description);
  updateOG('og:type', 'website');
}
