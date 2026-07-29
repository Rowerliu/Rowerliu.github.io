'use client';

import { useEffect, useRef } from 'react';
import { useLocaleStore } from '@/lib/stores/localeStore';

const GOATCOUNTER_URL = 'https://rowerliu.goatcounter.com';

export default function VisitorStats() {
  const locale = useLocaleStore((state) => state.locale);
  const mapContainerRef = useRef<HTMLDivElement>(null);
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

  return (
    <section className="mt-6" aria-labelledby="visitor-stats-title">
      <h2 id="visitor-stats-title" className="border-l-4 border-accent pl-3 text-lg font-semibold text-primary">
        {copy.title}
      </h2>

      <div className="mt-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-3 text-center dark:border-neutral-700 dark:bg-neutral-800">
          <iframe
            title={copy.count}
            src={`${GOATCOUNTER_URL}/counter/TOTAL.html?no_branding=1`}
            className="h-12 w-full border-0"
            loading="lazy"
          />
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{copy.count}</p>
        </div>
      </div>

      <details className="mt-3 overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-primary marker:text-accent">
          {copy.map}
        </summary>
        <div className="border-t border-neutral-200 p-2 dark:border-neutral-700">
          <div ref={mapContainerRef} className="min-h-[250px] overflow-hidden rounded-lg" />
        </div>
      </details>
    </section>
  );
}
