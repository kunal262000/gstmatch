import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import { BLOG_POSTS, getBlogPostBySlug } from '@/lib/blogs'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.gstmatch.cyou'

interface Props {
  params: {
    slug: string
  }
}

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({
    slug: post.slug,
  }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getBlogPostBySlug(params.slug)
  if (!post) {
    return {
      title: 'Article Not Found · GSTMatch',
    }
  }

  const url = `${SITE_URL}/blog/${post.slug}`

  return {
    title: `${post.title} · GSTMatch Blog`,
    description: post.description,
    keywords: post.keywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: 'article',
      siteName: 'GSTMatch',
      url,
      title: post.title,
      description: post.description,
      publishedTime: post.publishedAt,
      authors: [post.author],
      tags: post.keywords,
      images: [{ url: `${SITE_URL}/og.png`, width: 1200, height: 630, alt: post.title }],
      locale: 'en_IN',
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: [`${SITE_URL}/og.png`],
    },
  }
}

export default function BlogPostPage({ params }: Props) {
  const post = getBlogPostBySlug(params.slug)

  if (!post) {
    notFound()
  }

  const relatedPosts = BLOG_POSTS.filter(
    (p) => p.slug !== post.slug && (p.category === post.category || p.keywords.some((k) => post.keywords.includes(k)))
  ).slice(0, 3)

  // JSON-LD Schema.org for BlogPosting & BreadcrumbList
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${SITE_URL}/blog/${post.slug}#article`,
        isPartOf: {
          '@type': 'WebPage',
          '@id': `${SITE_URL}/blog/${post.slug}`,
          url: `${SITE_URL}/blog/${post.slug}`,
          name: post.title,
        },
        headline: post.title,
        description: post.description,
        datePublished: post.publishedAt,
        dateModified: post.publishedAt,
        author: {
          '@type': 'Organization',
          name: post.author,
          url: SITE_URL,
        },
        publisher: {
          '@type': 'Organization',
          name: 'GSTMatch',
          url: SITE_URL,
          logo: {
            '@type': 'ImageObject',
            url: `${SITE_URL}/icon.png`,
          },
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `${SITE_URL}/blog/${post.slug}`,
        },
        keywords: post.keywords.join(', '),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: SITE_URL,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Blog',
            item: `${SITE_URL}/blog`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: post.title,
            item: `${SITE_URL}/blog/${post.slug}`,
          },
        ],
      },
    ],
  }

  return (
    <>
      {/* Inject JSON-LD Schema.org script */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <NavBar />

      <main className="page-container" style={{ paddingBottom: 60 }}>
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          style={{
            margin: '20px 0 16px',
            fontSize: 13,
            color: 'var(--text-3)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Link href="/" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>
            Home
          </Link>
          <span>/</span>
          <Link href="/blog" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>
            Blog
          </Link>
          <span>/</span>
          <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{post.category}</span>
        </nav>

        {/* Article Header */}
        <article
          className="neu-raised"
          style={{
            padding: '36px 32px',
            background: 'var(--neu-bg)',
            marginBottom: 36,
          }}
        >
          <div
            style={{
              display: 'inline-block',
              background: 'var(--primary-bg)',
              color: 'var(--primary-dark)',
              fontSize: 12,
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: 'var(--r-pill)',
              marginBottom: 14,
              textTransform: 'uppercase',
            }}
          >
            {post.category}
          </div>

          <h1
            style={{
              fontSize: 'var(--fs-h1)',
              fontWeight: 800,
              color: 'var(--text-1)',
              lineHeight: 1.25,
              marginBottom: 16,
            }}
          >
            {post.title}
          </h1>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              fontSize: 13,
              color: 'var(--text-3)',
              borderBottom: '1px solid rgba(200,210,230,0.5)',
              paddingBottom: 20,
              marginBottom: 28,
              flexWrap: 'wrap',
            }}
          >
            <span>✍️ Published by <strong>{post.author}</strong></span>
            <span>•</span>
            <span>⏱️ {post.readTime}</span>
            <span>•</span>
            <span>📅 {post.publishedAt}</span>
          </div>

          {/* Article Body Content */}
          <div
            style={{
              fontSize: 15,
              color: 'var(--text-1)',
              lineHeight: 1.8,
              whiteSpace: 'pre-line',
            }}
          >
            {post.content}
          </div>

          {/* Article Action Box */}
          <div
            className="neu-raised"
            style={{
              marginTop: 40,
              padding: '24px',
              background: 'var(--primary-bg)',
              borderRadius: 'var(--r-md)',
              textAlign: 'center',
              border: '1px solid var(--primary-light)',
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-dark)', marginBottom: 6 }}>
              💡 Reconcile your Purchase Register &amp; GSTR-2B in 2 Minutes
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginBottom: 16 }}>
              Claim 100% of eligible Input Tax Credit automatically with AI fuzzy matching. 2 free reconciliations included.
            </p>
            <Link
              href="/upload"
              className="neu-btn neu-btn-primary"
              style={{ padding: '11px 28px', fontSize: 14, fontWeight: 700 }}
            >
              Start Free Reconciliation Now →
            </Link>
          </div>
        </article>

        {/* Related Posts Section */}
        {relatedPosts.length > 0 && (
          <section style={{ marginTop: 40 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-1)', marginBottom: 20 }}>
              Related Guides &amp; Articles
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 18,
              }}
            >
              {relatedPosts.map((rel) => (
                <Link
                  key={rel.slug}
                  href={`/blog/${rel.slug}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    className="neu-raised"
                    style={{
                      padding: '20px',
                      background: 'var(--neu-bg)',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',

                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--primary-dark)',
                          marginBottom: 8,
                        }}
                      >
                        {rel.category}
                      </div>
                      <h4
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: 'var(--text-1)',
                          lineHeight: 1.4,
                          marginBottom: 8,
                        }}
                      >
                        {rel.title}
                      </h4>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, marginTop: 12 }}>
                      Read Guide →
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Back Link */}
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Link
            href="/blog"
            style={{ fontSize: 13, color: 'var(--text-2)', textDecoration: 'none', fontWeight: 600 }}
          >
            ← Back to All Articles
          </Link>
        </div>
      </main>
    </>
  )
}
