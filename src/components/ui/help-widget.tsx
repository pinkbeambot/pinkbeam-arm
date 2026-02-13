'use client'

import { useState, useEffect } from 'react'
import { Search, HelpCircle, X, ArrowRight, Mail } from 'lucide-react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { searchArticles, getFeaturedArticles, type HelpArticle } from '@/lib/help/articles'
import { cn } from '@/lib/utils'

export function HelpWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<HelpArticle[]>([])
  const [showResults, setShowResults] = useState(false)

  // Keyboard shortcut: ? key to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        // Don't trigger if user is typing in an input
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          return
        }
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
      // ESC to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const results = searchArticles(searchQuery)
      setSearchResults(results.slice(0, 5)) // Top 5 results
      setShowResults(true)
    } else {
      setShowResults(false)
    }
  }, [searchQuery])

  const featuredArticles = getFeaturedArticles().slice(0, 3)

  return (
    <>
      {/* Floating Help Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'h-14 w-14 rounded-full',
          'bg-pink-500 text-white shadow-lg hover:shadow-xl',
          'hover:bg-pink-600 transition-all',
          'flex items-center justify-center',
          'focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2',
          isOpen && 'scale-0 opacity-0'
        )}
        aria-label="Open help"
      >
        <HelpCircle className="h-6 w-6" />
      </button>

      {/* Help Panel */}
      <div
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'w-full max-w-md',
          'transition-all duration-300',
          isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
        )}
      >
        <Card className="shadow-2xl border-pink-500/20">
          {/* Header */}
          <div className="bg-gradient-to-r from-pink-500 to-pink-600 text-white p-4 rounded-t-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg">How can we help?</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/20 rounded-full p-1 transition-colors"
                aria-label="Close help"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-pink-100">
              Search articles or press <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs">?</kbd> to toggle
            </p>
          </div>

          {/* Search Bar */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search help articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Content Area */}
          <div className="p-4 max-h-96 overflow-y-auto">
            {showResults ? (
              // Search Results
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} found
                </p>
                {searchResults.length > 0 ? (
                  searchResults.map((article) => (
                    <Link
                      key={article.slug}
                      href={`/help/${article.category}/${article.slug}`}
                      onClick={() => setIsOpen(false)}
                    >
                      <div className="p-3 rounded-lg border hover:border-pink-500/30 hover:bg-pink-500/5 transition-all cursor-pointer group">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm mb-1 group-hover:text-pink-500 transition-colors">
                              {article.title}
                            </h4>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {article.summary}
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-pink-500 transition-colors shrink-0 mt-0.5" />
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground mb-3">No articles found</p>
                    <Link href="/help" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" size="sm">
                        Browse all articles
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              // Quick Links (when not searching)
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-3">Popular Articles</h4>
                  <div className="space-y-2">
                    {featuredArticles.map((article) => (
                      <Link
                        key={article.slug}
                        href={`/help/${article.category}/${article.slug}`}
                        onClick={() => setIsOpen(false)}
                      >
                        <div className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors cursor-pointer group">
                          <span className="text-sm group-hover:text-pink-500 transition-colors">
                            {article.title}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-pink-500 transition-colors" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-3">Quick Links</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Link href="/help/getting-started" onClick={() => setIsOpen(false)}>
                      <div className="p-3 rounded-lg border hover:border-pink-500/30 hover:bg-pink-500/5 transition-all text-center cursor-pointer">
                        <p className="text-xs font-medium">Getting Started</p>
                      </div>
                    </Link>
                    <Link href="/help/billing" onClick={() => setIsOpen(false)}>
                      <div className="p-3 rounded-lg border hover:border-pink-500/30 hover:bg-pink-500/5 transition-all text-center cursor-pointer">
                        <p className="text-xs font-medium">Billing</p>
                      </div>
                    </Link>
                    <Link href="/help/ai-employees" onClick={() => setIsOpen(false)}>
                      <div className="p-3 rounded-lg border hover:border-pink-500/30 hover:bg-pink-500/5 transition-all text-center cursor-pointer">
                        <p className="text-xs font-medium">AI Employees</p>
                      </div>
                    </Link>
                    <Link href="/help/troubleshooting" onClick={() => setIsOpen(false)}>
                      <div className="p-3 rounded-lg border hover:border-pink-500/30 hover:bg-pink-500/5 transition-all text-center cursor-pointer">
                        <p className="text-xs font-medium">Troubleshooting</p>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t p-4">
            <Link href="/contact" onClick={() => setIsOpen(false)}>
              <Button className="w-full" variant="outline">
                <Mail className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            </Link>
            <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground">
              <span>Or visit</span>
              <Link
                href="/help"
                onClick={() => setIsOpen(false)}
                className="text-pink-500 hover:underline"
              >
                Help Center
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}
