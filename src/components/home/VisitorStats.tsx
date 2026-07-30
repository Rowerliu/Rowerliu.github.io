'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocaleStore } from '@/lib/stores/localeStore';

const GOATCOUNTER_TOTAL_URL = 'https://rowerliu.goatcounter.com/counter/TOTAL.json';
const VISITOR_MAP_IMAGE_URL =
  'https://mapmyvisitors.com/map.png?d=rGHzzxgReS7pAInTceDmf8uE8MtkP1Fk5J-xBNhGGJU&cl=ffffff';
const VISITOR_MAP_STATS_URL = 'https://mapmyvisitors.com/web/1c6yt';
const VISITOR_GLOBE_PAGE_URL = '/widgets/visitor-globe.html';

interface VisitorStatsProps {
  widget?: 'map' | 'globe';
}

export default function VisitorStats({ widget = 'map' }: VisitorStatsProps) {
  const locale = useLocaleStore((state) => state.locale);
  const mapImageRef = useRef<HTMLImageElement>(null);
  const globeFrameRef = useRef<HTMLIFrameElement>(null);
  const [pageViews, setPageViews] = useState<string | null>(null);
  const [counterError, setCounterError] = useState(false);
  const [widgetOpen, setWidgetOpen] = useState(true);
  const [widgetStatus, setWidgetStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [widgetAttempt, setWidgetAttempt] = useState(0);
  const isChinese = locale.startsWith('zh');
  const copy = isChinese
    ? {
        title: '访客',
        count: '全站访问量',
        map: '全球访客地图',
        globe: '全球访客地球',
        countError: '暂时无法加载访问量',
        mapLoading: '正在加载访客地图…',
        mapError: '地图暂时无法加载',
        globeLoading: '正在加载访客地球…',
        globeError: '访客地球暂时无法加载',
        retry: '重试',
      }
    : {
        title: 'Visitors',
        count: 'Total page view',
        map: 'Global visitor map',
        globe: 'Global visitor globe',
        countError: 'Page views are temporarily unavailable',
        mapLoading: 'Loading visitor map…',
        mapError: 'Visitor map is temporarily unavailable',
        globeLoading: 'Loading visitor globe…',
        globeError: 'Visitor globe is temporarily unavailable',
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

  const mapImageSrc =
    widgetAttempt === 0 ? VISITOR_MAP_IMAGE_URL : `${VISITOR_MAP_IMAGE_URL}&retry=${widgetAttempt}`;
  const globePageSrc =
    widgetAttempt === 0 ? VISITOR_GLOBE_PAGE_URL : `${VISITOR_GLOBE_PAGE_URL}?retry=${widgetAttempt}`;
  const widgetLabel = widget === 'globe' ? copy.globe : copy.map;
  const widgetLoading = widget === 'globe' ? copy.globeLoading : copy.mapLoading;
  const widgetError = widget === 'globe' ? copy.globeError : copy.mapError;

  useEffect(() => {
    if (widget !== 'map') return;

    const image = mapImageRef.current;
    if (!image) return;

    const handleLoad = () => setWidgetStatus('ready');
    const handleError = () => setWidgetStatus('error');

    setWidgetStatus('loading');
    if (image.complete) {
      if (image.naturalWidth > 0) {
        handleLoad();
      } else {
        handleError();
      }
      return;
    }

    image.addEventListener('load', handleLoad);
    image.addEventListener('error', handleError);

    return () => {
      image.removeEventListener('load', handleLoad);
      image.removeEventListener('error', handleError);
    };
  }, [widget, widgetAttempt]);

  useEffect(() => {
    if (widget !== 'globe') return;

    setWidgetStatus('loading');
    let checks = 0;
    const timer = window.setInterval(() => {
      checks += 1;

      try {
        const globe = globeFrameRef.current?.contentDocument?.querySelector('.mmvst_outer');
        if (globe) {
          setWidgetStatus('ready');
          window.clearInterval(timer);
          return;
        }
      } catch {
        // The wrapper is same-origin; this guards a transient navigation state.
      }

      if (checks >= 120) {
        setWidgetStatus('error');
        window.clearInterval(timer);
      }
    }, 100);

    return () => window.clearInterval(timer);
  }, [widget, widgetAttempt]);

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
        open={widgetOpen}
        onToggle={(event) => setWidgetOpen(event.currentTarget.open)}
      >
        <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-primary marker:text-accent">
          {widgetLabel}
        </summary>
        <div
          className={`relative border-t border-neutral-200 p-1.5 dark:border-neutral-700 ${
            widget === 'globe' ? 'min-h-[262px]' : ''
          }`}
        >
          {widget === 'map' ? (
            <a
              href={VISITOR_MAP_STATS_URL}
              target="_blank"
              rel="noopener noreferrer"
              title={copy.map}
              className="relative block aspect-[180/82] overflow-hidden rounded-md bg-white dark:bg-neutral-800"
            >
              <img
                key={widgetAttempt}
                ref={mapImageRef}
                src={mapImageSrc}
                alt={copy.map}
                className={`absolute inset-x-0 top-0 h-auto w-full -translate-y-[26.8%] object-contain transition-opacity duration-200 ${
                  widgetStatus === 'ready' ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setWidgetStatus('ready')}
                onError={() => setWidgetStatus('error')}
              />
            </a>
          ) : (
            <>
              <iframe
                key={widgetAttempt}
                ref={globeFrameRef}
                src={globePageSrc}
                title={copy.globe}
                className={`h-[250px] w-full rounded-md border-0 bg-white transition-opacity duration-200 ${
                  widgetStatus === 'ready' ? 'opacity-100' : 'opacity-0'
                }`}
                scrolling="no"
              />
              {/* The legacy Globe endpoint no longer records reliably; reuse the working Map pixel for visit tracking. */}
              <img
                src={`${VISITOR_MAP_IMAGE_URL}&display=globe`}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute h-px w-px opacity-0"
              />
            </>
          )}
          {widgetStatus === 'loading' && (
            <div className="absolute inset-1.5 flex items-center justify-center rounded-md bg-white text-center text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              {widgetLoading}
            </div>
          )}
          {widgetStatus === 'error' && (
            <div className="absolute inset-1.5 flex flex-col items-center justify-center gap-2 rounded-md bg-white px-3 text-center text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              <span>{widgetError}</span>
              <button
                type="button"
                className="rounded-md bg-accent px-3 py-1 font-medium text-white transition-colors hover:bg-accent-dark"
                onClick={() => {
                  setWidgetStatus('loading');
                  setWidgetAttempt((attempt) => attempt + 1);
                }}
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
