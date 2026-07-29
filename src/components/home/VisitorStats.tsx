'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocaleStore } from '@/lib/stores/localeStore';

const GOATCOUNTER_TOTAL_URL = 'https://rowerliu.goatcounter.com/counter/TOTAL.json';
const VISITOR_MAP_URL =
  'https://mapmyvisitors.com/globe.js?d=XCrzZ4GDJC3bc1IQSsqp_NByILLgLw0-lrOiQsLCcwI';

export default function VisitorStats() {
  const locale = useLocaleStore((state) => state.locale);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [pageViews, setPageViews] = useState<string | null>(null);
  const [counterError, setCounterError] = useState(false);
  const [mapOpen, setMapOpen] = useState(true);
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [mapAttempt, setMapAttempt] = useState(0);
  const isChinese = locale.startsWith('zh');
  const copy = isChinese
    ? {
        title: '访客',
        count: '全站访问量',
        map: '全球访客地图',
        countError: '暂时无法加载访问量',
        mapLoading: '正在加载访客地图…',
        mapError: '地图暂时无法加载',
        retry: '重试',
      }
    : {
        title: 'Visitors',
        count: 'Total page view',
        map: 'Global visitor map',
        countError: 'Page views are temporarily unavailable',
        mapLoading: 'Loading visitor map…',
        mapError: 'Visitor map is temporarily unavailable',
        retry: 'Retry',
      };

  useEffect(() => {
    const controller = new AbortController();
    let retryTimer: number | undefined;
    let attempts = 0;

    const loadCount = async () => {
      attempts += 1;

      try {
        const response = await fetch(GOATCOUNTER_TOTAL_URL, {
          mode: 'cors',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`GoatCounter returned ${response.status}`);

        const data = (await response.json()) as { count?: string };
        if (!data.count) throw new Error('GoatCounter response did not contain a count');

        setPageViews(data.count);
        setCounterError(false);
      } catch (error) {
        if (controller.signal.aborted) return;
        if (attempts < 3) {
          retryTimer = window.setTimeout(loadCount, attempts * 800);
        } else {
          console.error('Unable to load GoatCounter total:', error);
          setCounterError(true);
        }
      }
    };

    loadCount();

    return () => {
      controller.abort();
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, []);

  useEffect(() => {
    if (!mapOpen) return;

    const container = mapContainerRef.current;
    if (!container) return;

    setMapStatus('loading');
    container.replaceChildren();

    const script = document.createElement('script');
    script.id = 'mmvst_globe';
    script.src = VISITOR_MAP_URL;
    script.async = true;

    const revealMap = () => {
      const inner = container.querySelector<HTMLElement>('.mmvst_inner');
      if (inner) inner.style.display = 'block';
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('scroll'));
    };

    const observer = new MutationObserver(() => {
      if (!container.querySelector('.mmvst_outer')) return;
      setMapStatus('ready');
      window.requestAnimationFrame(revealMap);
    });
    observer.observe(container, { childList: true, subtree: true });

    script.addEventListener('load', revealMap);
    script.addEventListener('error', () => setMapStatus('error'));
    container.appendChild(script);

    const revealTimer = window.setTimeout(revealMap, 750);
    const timeout = window.setTimeout(() => {
      if (!container.querySelector('.mmvst_outer')) setMapStatus('error');
    }, 12_000);

    return () => {
      observer.disconnect();
      window.clearTimeout(revealTimer);
      window.clearTimeout(timeout);
      container.replaceChildren();
    };
  }, [mapAttempt, mapOpen]);

  return (
    <section className="mx-auto w-full max-w-56" aria-labelledby="visitor-stats-title">
      <h2 id="visitor-stats-title" className="border-l-4 border-accent pl-2 text-base font-semibold text-primary">
        {copy.title}
      </h2>

      <div className="mt-2">
        <div className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-center dark:border-neutral-700 dark:bg-neutral-800">
          <div
            id="goatcounter-total"
            className="flex h-10 items-center justify-center text-3xl font-bold leading-none text-accent"
            aria-label={copy.count}
            title={counterError ? copy.countError : undefined}
          >
            {pageViews ?? (counterError ? '—' : <span className="animate-pulse text-neutral-300">···</span>)}
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">{copy.count}</p>
        </div>
      </div>

      <details
        className="mt-2 overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800"
        open={mapOpen}
        onToggle={(event) => setMapOpen(event.currentTarget.open)}
      >
        <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-primary marker:text-accent">
          {copy.map}
        </summary>
        <div className="relative min-h-[180px] border-t border-neutral-200 p-1.5 dark:border-neutral-700">
          <div ref={mapContainerRef} className="min-h-[168px] overflow-hidden rounded-md" />
          {mapStatus === 'loading' && (
            <div className="absolute inset-1.5 flex items-center justify-center rounded-md bg-white text-center text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              {copy.mapLoading}
            </div>
          )}
          {mapStatus === 'error' && (
            <div className="absolute inset-1.5 flex flex-col items-center justify-center gap-2 rounded-md bg-white px-3 text-center text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              <span>{copy.mapError}</span>
              <button
                type="button"
                className="rounded-md bg-accent px-3 py-1 font-medium text-white transition-colors hover:bg-accent-dark"
                onClick={() => setMapAttempt((attempt) => attempt + 1)}
              >
                {copy.retry}
              </button>
            </div>
          )}
        </div>
      </details>
    </section>
  );
}
