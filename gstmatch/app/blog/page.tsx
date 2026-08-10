'use client'

import { useState } from 'react'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import { BLOG_POSTS, getAllCategories } from '@/lib/blogs'

export default function BlogIndexPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const categories = ['All', ...getAllCategories()]

  const filteredPosts = BLOG_POSTS.filter((post) => {
    const matchesCat = selectedCategory === 'All' || post.category === selectedCategory
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCat && matchesSearch
  })

  const featuredPost = BLOG_POSTS[0]

  return (
    <>
      <NavBar />

      <main className="page-container" style={{ paddingBottom: 60 }}>
        {/* Hero Section */}
        <section style={{ textAlign: 'center', padding: '36px 0 24px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--primary-bg)',
              color: 'var(--primary-dark)',
              fontSize: 12,
              fontWeight: 700,
              padding: '5px 16px',
              borderRadius: 'var(--r-pill)',
              marginBottom: 16,
              letterSpacing: '0.03em',
            }}
          >
            ✦ GST Compliance & ITC Knowledge Hub
          </div>

          <h1
            style={{
              fontSize: 'var(--fs-h1)',
              fontWeight: 800,
              color: 'var(--text-1)',
              lineHeight: 1.25,
              marginBottom: 14,
            }}
          >
            GSTMatch Guides &amp; Insights
          </h1>

          <p
            style={{
              fontSize: 15,
              color: 'var(--text-2)',
              lineHeight: 1.7,
              maxWidth: 580,
              margin: '0 auto 28px',
            }}
          >
            Expert articles, step-by-step guides, legal rule breakdowns, and tax recovery strategies for Indian MSMEs, Accountants, and CAs.
          </p>

          {/* Search Bar */}
          <div style={{ maxWidth: 460, margin: '0 auto 24px' }}>
            <input
              type="text"
              placeholder="🔍 Search topics, GSTR-2B, ITC recovery, rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="neu-inset"
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: 'var(--r-pill)',
                border: 'none',
                fontSize: 14,
                color: 'var(--text-1)',
                outline: 'none',
              }}
            />
          </div>

          {/* Category Filter Pills */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 8,
              flexWrap: 'wrap',
              margin: '0 auto',
            }}
          >
            {categories.map((cat) => {
              const active = selectedCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={active ? 'neu-btn neu-btn-primary' : 'neu-btn'}
                  style={{
                    padding: '6px 16px',
                    fontSize: 12.5,
                    fontWeight: 600,
                    borderRadius: 'var(--r-pill)',
                  }}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </section>

        {/* Featured Post Card (only if no active search) */}
        {!searchQuery && selectedCategory === 'All' && (
          <div style={{ marginBottom: 36 }}>
            <Link
              href={`/blog/${featuredPost.slug}`}
              style={{ textDecoration: 'none' }}
            >
              <div
                className="neu-raised"
                style={{
                  padding: '32px',
                  background: 'var(--neu-bg)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 24,
                  alignItems: 'center',
                  cursor: 'pointer',
                  borderLeft: '4px solid var(--primary)',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'inline-block',
                      background: 'var(--primary-bg)',
                      color: 'var(--primary-dark)',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: 'var(--r-pill)',
                      marginBottom: 12,
                      textTransform: 'uppercase',
                    }}
                  >
                    ★ Featured Article • {featuredPost.category}
                  </div>

                  <h2
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: 'var(--text-1)',
                      marginBottom: 12,
                      lineHeight: 1.3,
                    }}
                  >
                    {featuredPost.title}
                  </h2>

                  <p
                    style={{
                      fontSize: 14,
                      color: 'var(--text-2)',
                      lineHeight: 1.65,
                      marginBottom: 18,
                    }}
                  >
                    {featuredPost.description}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      fontSize: 12,
                      color: 'var(--text-3)',
                    }}
                  >
                    <span>✍️ {featuredPost.author}</span>
                    <span>•</span>
                    <span>⏱️ {featuredPost.readTime}</span>
                    <span>•</span>
                    <span>📅 {featuredPost.publishedAt}</span>
                  </div>
                </div>

                <div
                  style={{
                    textAlign: 'right',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    className="neu-btn neu-btn-primary"
                    style={{ padding: '12px 24px', fontSize: 13, fontWeight: 700 }}
                  >
                    Read Full Article →
                  </span>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Blog Grid Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>
            All Articles ({filteredPosts.length})
          </h2>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
            Updated Weekly
          </span>
        </div>

        {/* Blog Cards Grid */}
        {filteredPosts.length === 0 ? (
          <div
            className="neu-raised"
            style={{ padding: '40px', textAlign: 'center', background: 'var(--neu-bg)' }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>
              No articles found matching &ldquo;{searchQuery}&rdquo;
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6 }}>
              Try searching for &quot;GSTR-2B&quot;, &quot;ITC&quot;, &quot;Rule 37&quot;, or browse all categories.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 20,
            }}
          >
            {filteredPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                style={{ textDecoration: 'none', display: 'flex' }}
              >
                <div
                  className="neu-raised"
                  style={{
                    padding: '24px',
                    background: 'var(--neu-bg)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    width: '100%',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease',
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 12,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--primary-dark)',
                          background: 'var(--primary-bg)',
                          padding: '3px 10px',
                          borderRadius: 'var(--r-pill)',
                        }}
                      >
                        {post.category}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        {post.readTime}
                      </span>
                    </div>

                    <h3
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: 'var(--text-1)',
                        lineHeight: 1.4,
                        marginBottom: 10,
                      }}
                    >
                      {post.title}
                    </h3>

                    <p
                      style={{
                        fontSize: 13,
                        color: 'var(--text-2)',
                        lineHeight: 1.6,
                        marginBottom: 16,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {post.description}
                    </p>
                  </div>

                  <div
                    style={{
                      borderTop: '1px dashed rgba(200,210,230,0.6)',
                      paddingTop: 12,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: 'var(--text-3)' }}>{post.publishedAt}</span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: 'var(--primary)',
                      }}
                    >
                      Read Guide →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* CTA Banner at bottom */}
        <div
          className="neu-raised"
          style={{
            marginTop: 48,
            padding: '32px 24px',
            textAlign: 'center',
            background: 'var(--neu-bg)',
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>
            Start Reconciling GSTR-2B with AI Today
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 20, maxWidth: 500, margin: '0 auto 20px' }}>
            Claim 100% of eligible ITC and protect your business against tax notices in under 2 minutes.
          </p>
          <Link
            href="/upload"
            className="neu-btn neu-btn-primary"
            style={{ padding: '12px 32px', fontSize: 14, fontWeight: 700 }}
          >
            Claim 2 Free Reconciliations Now →
          </Link>
        </div>
      </main>
    </>
  )
}
