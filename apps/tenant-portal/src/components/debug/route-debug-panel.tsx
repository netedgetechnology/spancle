'use client';

// TEMPORARY DIAGNOSTIC — remove once root cause of /booking styling issue is found.
// Renders when ?debug=1 is in the URL.
// Logs full diagnostic report to console on every mount.

import { useEffect, useState } from 'react';
import { usePathname }         from 'next/navigation';

interface DiagReport {
  pathname:         string;
  cssFiles:         string[];
  jsChunks:         string[];
  globalsLoaded:    boolean;
  tailwindInDom:    boolean;
  layoutHtmlFound:  boolean;
  dashLayoutFound:  boolean;
  hydrationErrors:  string[];
  runtimeErrors:    string[];
  headHtml:         string;
}

export function RouteDebugPanel({ routeSegment }: { routeSegment: string }): React.ReactElement | null {
  const pathname                    = usePathname();
  const [report, setReport]         = useState<DiagReport | null>(null);
  const [open,   setOpen]           = useState(false);
  const [errors, setErrors]         = useState<string[]>([]);

  useEffect(() => {
    // Capture runtime errors
    const onError = (e: ErrorEvent) => {
      setErrors((prev) => [...prev, `${e.message} @ ${e.filename}:${e.lineno}`]);
    };
    window.addEventListener('error', onError);
    return () => window.removeEventListener('error', onError);
  }, []);

  useEffect(() => {
    // Wait one tick for the DOM to settle after hydration
    const timer = setTimeout(() => {
      const cssLinks = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')]
        .map((l) => l.href);

      const jsScripts = [...document.querySelectorAll<HTMLScriptElement>('script[src]')]
        .map((s) => s.src)
        .filter((src) => src.includes('/_next/'));

      // globals.css is inlined by Next.js — check for @tailwind markers
      // or look for a <style> tag with Tailwind base reset content
      const styleTagsText = [...document.querySelectorAll('style')]
        .map((s) => s.textContent ?? '')
        .join('');
      const globalsLoaded = cssLinks.some((href) => href.includes('/_next/')) ||
                            styleTagsText.includes('box-sizing') ||
                            styleTagsText.length > 500;

      // Check if any rendered element actually has a Tailwind class applied
      const tailwindInDom = !!document.querySelector(
        '[class*="flex"],[class*="text-"],[class*="bg-"],[class*="p-"],[class*="m-"]'
      );

      // Root layout: <html> and <body> rendered by RootLayout
      const layoutHtmlFound = document.documentElement.lang === 'en' &&
                              document.body.classList.contains('min-h-screen');

      // Dashboard layout: the flex h-screen wrapper rendered by DashboardLayout
      const dashLayoutFound = !!document.querySelector('.flex.h-screen');

      const r: DiagReport = {
        pathname,
        cssFiles:        cssLinks,
        jsChunks:        jsScripts,
        globalsLoaded,
        tailwindInDom,
        layoutHtmlFound,
        dashLayoutFound,
        hydrationErrors: errors,
        runtimeErrors:   errors,
        headHtml:        document.head.innerHTML.slice(0, 1200),
      };

      setReport(r);

      // Log full report regardless of ?debug param
      console.group(`[SpancleDebug] ${pathname} (segment: ${routeSegment})`);
      console.log('pathname         :', pathname);
      console.log('routeSegment     :', routeSegment);
      console.log('rootLayout       : RootLayout (html lang=en, body.min-h-screen)');
      console.log('dashLayout found :', dashLayoutFound);
      console.log('globals.css      :', globalsLoaded);
      console.log('tailwindInDom    :', tailwindInDom);
      console.log('CSS files        :', cssLinks);
      console.log('JS chunks (_next):', jsScripts.length, 'bundles');
      console.log('errors           :', errors);
      console.log('head HTML        :', document.head.innerHTML.slice(0, 600));
      console.groupEnd();
    }, 300);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, routeSegment]);

  // Only render the overlay if ?debug=1
  if (typeof window !== 'undefined' && !window.location.search.includes('debug=1')) {
    return null;
  }

  if (!report) return null;

  return (
    <div
      style={{
        position: 'fixed', bottom: 12, right: 12, zIndex: 99999,
        background: '#1e1e1e', color: '#d4d4d4', fontFamily: 'monospace',
        fontSize: 11, borderRadius: 8, boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
        maxWidth: 480, maxHeight: open ? 520 : 36, overflow: 'hidden',
        transition: 'max-height 0.2s',
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', background: '#2d2d2d', border: 'none', color: '#9cdcfe',
          padding: '6px 12px', textAlign: 'left', cursor: 'pointer', fontSize: 11,
          fontFamily: 'monospace',
        }}
      >
        🔍 SpancleDebug — {pathname} {open ? '▲' : '▼'}
      </button>

      {open && (
        <div style={{ padding: '8px 12px', overflowY: 'auto', maxHeight: 484 }}>
          <Row label="pathname"          value={report.pathname} />
          <Row label="routeSegment"      value={routeSegment} />
          <Row label="rootLayout"        value={report.layoutHtmlFound ? '✅ RootLayout' : '❌ MISSING'} />
          <Row label="dashLayout"        value={report.dashLayoutFound ? '✅ DashboardLayout' : '❌ MISSING'} />
          <Row label="globals.css"       value={report.globalsLoaded   ? '✅ loaded'          : '❌ MISSING'} />
          <Row label="tailwindInDom"     value={report.tailwindInDom   ? '✅ yes'             : '❌ NO'} />
          <Row label="CSS link tags"     value={report.cssFiles.length ? report.cssFiles.join('\n') : '(none)'} />
          <Row label="JS chunks"         value={`${report.jsChunks.length} bundles`} />
          <Row label="errors"            value={report.runtimeErrors.length ? report.runtimeErrors.join('\n') : '(none)'} />
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div style={{ marginBottom: 4 }}>
      <span style={{ color: '#4ec9b0', minWidth: 130, display: 'inline-block' }}>{label}:</span>
      <span style={{ color: '#ce9178', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}
