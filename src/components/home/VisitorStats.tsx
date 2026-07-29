'use client';

import { useLocaleStore } from '@/lib/stores/localeStore';

const GOATCOUNTER_URL = 'https://rowerliu.goatcounter.com';

export default function VisitorStats() {
  const locale = useLocaleStore((state) => state.locale);
  const isChinese = locale.startsWith('zh');
  const copy = isChinese
    ? {
        title: '访客',
        count: '全站访问量',
        viewStats: '查看统计',
        provider: 'GoatCounter',
        map: '访客分布与完整统计',
      }
    : {
        title: 'Visitors',
        count: 'Total page views',
        viewStats: 'View stats',
        provider: 'GoatCounter',
        map: 'Visitor locations and full statistics',
      };

  return (
    <section className="mt-6" aria-labelledby="visitor-stats-title">
      <h2 id="visitor-stats-title" className="border-l-4 border-accent pl-3 text-lg font-semibold text-primary">
        {copy.title}
      </h2>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-3 text-center dark:border-neutral-700 dark:bg-neutral-800">
          <iframe
            title={copy.count}
            src={`${GOATCOUNTER_URL}/counter/TOTAL.html?no_branding=1`}
            className="h-12 w-full border-0"
            loading="lazy"
          />
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{copy.count}</p>
        </div>

        <a
          href={GOATCOUNTER_URL}
          target="_blank"
          rel="noreferrer"
          className="flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white p-3 text-center transition-colors hover:border-accent hover:bg-accent/5 dark:border-neutral-700 dark:bg-neutral-800"
        >
          <span className="text-base font-semibold text-accent">{copy.viewStats}</span>
          <span className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{copy.provider}</span>
        </a>
      </div>

      <details className="mt-3 overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-primary marker:text-accent">
          {copy.map}
        </summary>
        <div className="border-t border-neutral-200 p-2 dark:border-neutral-700">
          <iframe
            title={copy.map}
            src={`${GOATCOUNTER_URL}?hideui=1`}
            className="h-[430px] w-full rounded-lg border-0"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </details>
    </section>
  );
}
