export const metadata = {
  title: 'Offline - Pink Beam ARM',
  description: 'You are currently offline',
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center px-4 max-w-md">
        <div className="mb-6">
          <svg
            className="w-24 h-24 mx-auto text-primary"
            viewBox="0 0 512 512"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="512" height="512" rx="128" fill="currentColor" fillOpacity="0.1" />
            <g fill="currentColor" transform="translate(256, 256)">
              <circle cx="0" cy="0" r="48" />
              <circle cx="-120" cy="-60" r="32" />
              <circle cx="120" cy="-60" r="32" />
              <circle cx="0" cy="130" r="32" />
              <path d="M-28,-14 L-88,-46" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
              <path d="M28,-14 L88,-46" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
              <path d="M0,38 L0,98" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
            </g>
          </svg>
        </div>
        <h1 className="text-3xl font-bold mb-4 text-foreground">You're Offline</h1>
        <p className="text-muted-foreground mb-8">
          It looks like you've lost your internet connection. Some features may be unavailable until you're back online.
        </p>
        <div className="space-y-4">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry Connection
          </button>
          <p className="text-sm text-muted-foreground">
            Your data will sync automatically when you reconnect.
          </p>
        </div>
      </div>
    </div>
  );
}
