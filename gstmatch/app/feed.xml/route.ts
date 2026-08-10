import { BLOG_POSTS } from '@/lib/blogs'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gstmatch-six.vercel.app'

export async function GET() {
  const itemsXml = BLOG_POSTS.map((post) => {
    const postUrl = `${SITE_URL}/blog/${post.slug}`
    const pubDate = new Date(post.publishedAt).toUTCString()

    return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <description><![CDATA[${post.description}]]></description>
      <pubDate>${pubDate}</pubDate>
      <category><![CDATA[${post.category}]]></category>
      <dc:creator><![CDATA[${post.author}]]></dc:creator>
    </item>`
  }).join('\n')

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>GSTMatch — GST Reconciliation &amp; ITC Recovery Blog</title>
    <link>${SITE_URL}/blog</link>
    <description>Expert articles, step-by-step guides, legal rule breakdowns, and Input Tax Credit (ITC) recovery strategies for Indian MSMEs and Chartered Accountants.</description>
    <language>en-IN</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    ${itemsXml}
  </channel>
</rss>`

  return new Response(rssXml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
