'use client';

import { useEffect, useRef } from 'react';
import { useLocaleStore } from '@/lib/stores/localeStore';

declare global {
  interface Window {
    goatcounter?: {
      visit_count: (options: {
        append: string;
        path: string;
        no_branding: boolean;
        style: string;
      }) => void;
    };
  }
}

export default function VisitorStats() {
  const locale = useLocaleStore((state) => state.locale);
  const mapContainerRef = useRef<HTMLDivElement>(null);
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
        count: 'Total page views',
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
      const container = counterRef.current;

      if (!counter || !container || container.dataset.goatcounterLoaded === 'true') return false;

      try {
        container.dataset.goatcounterLoaded = 'true';
        counter({
          append: '#goatcounter-total',
          path: 'TOTAL',
          no_branding: true,
          style: `
            div { border: 0; background: transparent; color: inherit; padding: 0; font: inherit; }
            #gcvc-for, #gcvc-by { display: none; }
            #gcvc-views { color: #d4a562; font-size: 1.75rem; font-weight: 700; line-height: 1; }
          `,
        });
        return true;
      } catch {
        delete container.dataset.goatcounterLoaded;
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
            className="flex h-10 items-center justify-center"
            aria-label={copy.count}
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
