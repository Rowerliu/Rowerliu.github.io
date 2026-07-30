'use client';

import { useEffect, useRef, useState } from 'react';
import type { GlobeInstance } from 'globe.gl';

const GLOBE_HEIGHT = 250;
// Central visual controls for the WebGL globe.
const GLOBE_THEME = {
  canvasBackground: '#07111d',
  sceneBackground: 'rgba(0,0,0,0)',
  earthTexture: '/visitor-globe/earth-dark.jpg',
  atmosphereColor: '#d4a85f',
  atmosphereAltitude: 0.18,
  originPointColor: '#f2c879',
  visitorPointColor: '#ffdf9c',
  ringStartColor: 'rgba(242, 200, 121, 0.9)',
  ringEndColor: 'rgba(242, 200, 121, 0)',
  statusBackground: 'rgba(7,17,29,0.7)',
  statusTextColor: '#e8d5ae',
  autoRotateSpeed: 0.55,
} as const;

const SITE_ORIGIN: VisitorPoint = {
  lat: 1.29,
  lng: 103.85,
  count: 1,
  city: 'Singapore',
  country: 'SG',
  lastSeen: '',
  isOrigin: true,
};

interface VisitorPoint {
  lat: number;
  lng: number;
  count: number;
  city?: string;
  country?: string;
  lastSeen?: string;
  isOrigin?: boolean;
}

interface VisitorResponse {
  points?: VisitorPoint[];
  total?: number;
}

interface WebGLVisitorGlobeProps {
  apiUrl?: string;
  isChinese?: boolean;
  attempt?: number;
  onReady: () => void;
  onError: () => void;
}

function normalizeApiUrl(apiUrl?: string) {
  return apiUrl?.trim().replace(/\/+$/, '') || '';
}

function validPoint(point: VisitorPoint) {
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    point.lat >= -90 &&
    point.lat <= 90 &&
    point.lng >= -180 &&
    point.lng <= 180
  );
}

function pointLabel(point: VisitorPoint) {
  if (point.isOrigin) return 'Singapore · Site origin';

  const place = [point.city, point.country].filter(Boolean).join(', ') || 'Visitor';
  return `${place} · ${point.count} ${point.count === 1 ? 'visit' : 'visits'}`;
}

export default function WebGLVisitorGlobe({
  apiUrl,
  isChinese = false,
  attempt = 0,
  onReady,
  onError,
}: WebGLVisitorGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dataState, setDataState] = useState<'loading' | 'live' | 'empty' | 'unconfigured' | 'error'>(
    apiUrl ? 'loading' : 'unconfigured',
  );
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let globe: GlobeInstance | undefined;
    let resizeObserver: ResizeObserver | undefined;
    const controller = new AbortController();
    const endpoint = normalizeApiUrl(apiUrl);

    async function start() {
      const container = containerRef.current;
      if (!container) return;

      try {
        const { default: Globe } = await import('globe.gl');
        if (cancelled) return;

        const width = Math.max(container.clientWidth, 180);
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        globe = new Globe(container, {
          animateIn: !reduceMotion,
          rendererConfig: { antialias: true, alpha: true },
        })
          .width(width)
          .height(GLOBE_HEIGHT)
          .backgroundColor(GLOBE_THEME.sceneBackground)
          .globeImageUrl(GLOBE_THEME.earthTexture)
          .showAtmosphere(true)
          .atmosphereColor(GLOBE_THEME.atmosphereColor)
          .atmosphereAltitude(GLOBE_THEME.atmosphereAltitude)
          .pointLat('lat')
          .pointLng('lng')
          .pointRadius((point) => (point as VisitorPoint).isOrigin ? 0.32 : 0.22)
          .pointAltitude((point) => 0.025 + Math.min(Math.log2((point as VisitorPoint).count + 1) * 0.012, 0.08))
          .pointColor((point) =>
            (point as VisitorPoint).isOrigin ? GLOBE_THEME.originPointColor : GLOBE_THEME.visitorPointColor,
          )
          .pointLabel((point) => pointLabel(point as VisitorPoint))
          .pointsTransitionDuration(700)
          .ringLat('lat')
          .ringLng('lng')
          .ringColor(() => [GLOBE_THEME.ringStartColor, GLOBE_THEME.ringEndColor])
          .ringMaxRadius((point) => 2.2 + Math.min(Math.log2((point as VisitorPoint).count + 1), 4))
          .ringPropagationSpeed(1.4)
          .ringRepeatPeriod(reduceMotion ? 0 : 1200)
          .pointsData([SITE_ORIGIN])
          .ringsData([SITE_ORIGIN])
          .pointOfView({ lat: 18, lng: 95, altitude: 2.15 });

        const controls = globe.controls();
        controls.autoRotate = !reduceMotion;
        controls.autoRotateSpeed = GLOBE_THEME.autoRotateSpeed;
        controls.enablePan = false;
        controls.enableZoom = false;

        globe.onGlobeReady(() => {
          if (!cancelled) onReady();
        });

        resizeObserver = new ResizeObserver(([entry]) => {
          if (globe && entry) globe.width(Math.max(entry.contentRect.width, 180));
        });
        resizeObserver.observe(container);

        if (!endpoint) {
          setDataState('unconfigured');
          return;
        }

        const sessionKey = `visitor-globe-recorded:${endpoint}`;
        const alreadyRecorded = window.sessionStorage.getItem(sessionKey) === 'true';
        const path = alreadyRecorded ? '/points' : '/visit';
        const response = await fetch(`${endpoint}${path}`, {
          method: alreadyRecorded ? 'GET' : 'POST',
          headers: alreadyRecorded ? undefined : { 'Content-Type': 'text/plain;charset=UTF-8' },
          signal: controller.signal,
        });

        if (!response.ok) throw new Error(`Visitor API returned ${response.status}`);
        const payload = (await response.json()) as VisitorResponse;
        const points = (payload.points || []).filter(validPoint);

        if (!alreadyRecorded) window.sessionStorage.setItem(sessionKey, 'true');
        if (cancelled || !globe) return;

        globe.pointsData(points.length ? points : [SITE_ORIGIN]).ringsData(points.length ? points : [SITE_ORIGIN]);
        setTotal(payload.total || points.reduce((sum, point) => sum + point.count, 0));
        setDataState(points.length ? 'live' : 'empty');
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        console.error('Unable to initialize the WebGL visitor globe:', error);
        if (globe) {
          setDataState('error');
          onReady();
        } else {
          onError();
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      controller.abort();
      resizeObserver?.disconnect();
      globe?._destructor();
    };
  }, [apiUrl, attempt, onError, onReady]);

  const status =
    dataState === 'live'
      ? isChinese
        ? `${total} 次已记录访问`
        : `${total} recorded visits`
      : dataState === 'loading'
        ? isChinese
          ? '正在同步访客点位…'
          : 'Syncing visitor locations…'
        : dataState === 'empty'
          ? isChinese
            ? '等待首次访客记录'
            : 'Waiting for the first recorded visit'
          : dataState === 'error'
            ? isChinese
              ? '3D 地球已就绪，访客数据暂不可用'
              : '3D globe ready; visitor data unavailable'
            : isChinese
              ? '3D 预览 · 配置 API 后启用真实访客点位'
              : '3D preview · configure the API for live visitor locations';

  return (
    <div
      className="relative h-[250px] overflow-hidden rounded-md"
      style={{ backgroundColor: GLOBE_THEME.canvasBackground }}
    >
      <div ref={containerRef} className="h-full w-full" aria-hidden="true" />
      <p
        className="pointer-events-none absolute inset-x-2 bottom-1.5 rounded px-2 py-1 text-center text-[10px] backdrop-blur-sm"
        style={{
          backgroundColor: GLOBE_THEME.statusBackground,
          color: GLOBE_THEME.statusTextColor,
        }}
      >
        {status}
      </p>
    </div>
  );
}
