# Website and search metadata

The public landing page is https://aquirozai.github.io/winios.studio/.
Share this URL to use the project's custom Open Graph / X card. GitHub repository
URLs use GitHub-controlled metadata; the README banner does not replace GitHub's
repository Social preview setting.

## Included

- Server-delivered English HTML, descriptive title and description, one H1,
  self-referencing canonical and indexable robots metadata.
- Open Graph and X summary_large_image metadata with absolute HTTPS image URLs.
- A 1200 × 630 JPEG social image (~100 KB), SVG / PNG favicons and an Apple touch icon.
- SoftwareSourceCode / WebPage JSON-LD using actual repository information.
  No invented reviews, ratings or rich-result eligibility claims.
- sitemap.xml with the canonical page URL and the actual content update date.
- A noindex 404 page with a route back to the project.
- Requirements, installation steps, compatibility scope, FAQ and release links.
- README links and a banner in English and Spanish.

## Maintaining this

Keep canonical, og:url, image URLs, sitemap and JSON-LD synchronized if the site
moves or gets a custom domain. Update lastmod only after meaningful page changes.
Keep feature and compatibility claims in sync with the release and README.

This is a GitHub Pages **project site**, under /winios.studio/. A robots.txt inside
this directory would not control crawling for the host: crawlers look for it at
https://aquirozai.github.io/robots.txt. We use page-level robots metadata here.
The sitemap can be submitted in Google Search Console after site ownership is
verified; no verification token has been invented or added. Search indexing and
social-card refreshes are controlled by the respective crawlers.

The landing page is buildless and has no third-party scripts or external fonts.
Validate metadata, JSON parsing, local links, image dimensions and deployment
responses after changes. A successful deployment does not guarantee search
rankings or a specific social preview in every client.

## Social artwork

Created with built-in image generation, then resized and JPEG-optimized for web.
The original illustration is a marketing graphic, not a product screenshot.
The existing repository icon is preserved for favicons.

Generation prompt:

Use case: ads-marketing. Create a polished Open Graph social sharing image for WiniOS Studio, an open-source Windows desktop tool for building, signing and installing native SwiftUI apps on a connected iPhone. Landscape 1200x630 composition, approximately 1.91:1, with generous safe margins. Professional software developer audience. Brand palette: deep mineral teal #123F44 and #182528, mint #7BC9B4, warm off-white #F4F5EC. Clean editorial typography, very high legibility at thumbnail size, restrained precise layout. Left two-thirds: exact large headline on two lines "Build iOS apps." and "From Windows." Smaller brand name above: "WiniOS Studio". Small supporting line below: "SwiftUI · Build · Sign · Install". Bottom small label "Open source · Early preview". Right third: elegant conceptual white outline of a phone and layered mint software sheets, abstract graphic, not a screenshot or claim of a simulator. Flat, premium editorial software graphic with subtle paper grain and fine keylines, no neon gradients, no Apple or Windows logos, no invented interface, no fake metrics, no extra text, no watermark. All text spelled exactly. This is a marketing illustration, not product evidence.
