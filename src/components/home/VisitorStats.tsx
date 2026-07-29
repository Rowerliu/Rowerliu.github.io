'use client';

import { useEffect, useRef } from 'react';
import { useLocaleStore } from '@/lib/stores/localeStore';

declare global {
  interface Window {
    goatcounter?: {
      visit_count: (options: {
        append: string;
        type?: 'html' | 'svg' | 'png';
        path: string;
        no_branding: boolean;
      }) => void;
    };
  }
}

export default function VisitorStats() {
  const locale = useLocaleStore((state) => state.locale);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const counterSourceRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLDivElement>(null);
  const isChinese = locale.startsWith('zh');
  const copy = isChinese
    ? {
        title: '访客',
        count: '全站访问量',
        map: '全球访客地图',
      }
    : {
        title: 'Visitors',
        count: 'Total page view',
        map: 'Global visitor map',
      };

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || document.getElementById('mmvst_globe')) return;

    const script = document.createElement('script');
    script.id = 'mmvst_globe';
    script.type = 'text/javascript';
    script.src = 'https://mapmyvisitors.com/globe.js?d=XCrzZ4GDJC3bc1IQSsqp_NByILLgLw0-lrOiQsLCcwI';
    container.appendChild(script);
  }, []);

  useEffect(() => {
    const renderCounter = () => {
      const counter = window.goatcounter?.visit_count;
      const source = counterSourceRef.current;
      const display = counterRef.current;

      if (!counter || !source || !display || source.dataset.goatcounterLoaded === 'true') return false;

      try {
        source.dataset.goatcounterLoaded = 'true';
        const observer = new MutationObserver(() => {
          const count = source.querySelector('#gcvc-views')?.textContent?.trim();
          if (!count) return;

          observer.disconnect();
          display.textContent = count;
          source.replaceChildren();
        });

        observer.observe(source, { childList: true, subtree: true });
        counter({
          append: '#goatcounter-source',
          type: 'html',
          path: 'TOTAL',
          no_branding: true,
        });
        return true;
      } catch {
        delete source.dataset.goatcounterLoaded;
        return false;
      }
    };

    if (renderCounter()) return;

    const timer = window.setInterval(() => {
      if (renderCounter()) window.clearInterval(timer);
    }, 100);

    const timeout = window.setTimeout(() => window.clearInterval(timer), 10_000);

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(timeout);
    };
  }, []);

  return (
    <section className="mx-auto w-full max-w-56" aria-labelledby="visitor-stats-title">
      <h2 id="visitor-stats-title" className="border-l-4 border-accent pl-2 text-base font-semibold text-primary">
        {copy.title}
      </h2>

      <div className="mt-2">
        <div className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-center dark:border-neutral-700 dark:bg-neutral-800">
          <div
            ref={counterRef}
            id="goatcounter-total"
            className="flex h-10 items-center justify-center text-3xl font-bold leading-none text-accent"
            aria-label={copy.count}
          />
          <div
            ref={counterSourceRef}
            id="goatcounter-source"
            className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
            aria-hidden="true"
          />
          <p className="text-xs text-neutral-600 dark:text-neutral-400">{copy.count}</p>
        </div>
      </div>

      <details className="mt-2 overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
        <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-primary marker:text-accent">
          {copy.map}
        </summary>
        <div className="border-t border-neutral-200 p-1.5 dark:border-neutral-700">
          <div ref={mapContainerRef} className="min-h-[150px] overflow-hidden rounded-md" />
        </div>
      </details>
    </section>
  );
}
