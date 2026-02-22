import Link from "next/link";
import { Mail, MapPin, Twitter, Linkedin, Github } from "lucide-react";

const footerLinks = {
  product: {
    title: "Product",
    links: [
      { href: "/agents", label: "AI Employees" },
      { href: "/features", label: "Features" },
      { href: "/pricing", label: "Pricing" },
      { href: "/portal", label: "Portal" },
    ],
  },
  company: {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
  resources: {
    title: "Resources",
    links: [
      { href: "#", label: "Documentation" },
      { href: "#", label: "API Reference" },
      { href: "#", label: "Blog" },
    ],
  },
  legal: {
    title: "Legal",
    links: [
      { href: "#", label: "Privacy Policy" },
      { href: "#", label: "Terms of Service" },
      { href: "#", label: "Security" },
    ],
  },
};

const socialLinks = [
  { href: "https://twitter.com/pinkbeam", label: "Twitter", icon: Twitter },
  { href: "https://linkedin.com/company/pinkbeam", label: "LinkedIn", icon: Linkedin },
  { href: "https://github.com/pinkbeam", label: "GitHub", icon: Github },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-12 lg:py-16">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-12">
            {/* Brand Column */}
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-4 group">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 group-hover:shadow-lg group-hover:shadow-pink-500/25 transition-all duration-300">
                  <span className="text-white font-bold text-sm">PB</span>
                </div>
                <span className="font-bold text-xl">Pink Beam</span>
              </Link>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                The command center for your AI workforce. Hire autonomous AI employees
                and scale your business without scaling your headcount.
              </p>
              <div className="space-y-3">
                <a
                  href="mailto:hello@pinkbeam.io"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  hello@pinkbeam.io
                </a>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  San Francisco, CA
                </div>
              </div>
            </div>

            {/* Link Columns */}
            {Object.entries(footerLinks).map(([key, section]) => (
              <div key={key}>
                <h4 className="font-semibold mb-4 text-sm">{section.title}</h4>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground text-center sm:text-left">
              © {new Date().getFullYear()} Pink Beam. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                    aria-label={social.label}
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
