import { useEffect, useState } from 'react';

export const LOADING_PROGRESS_MAX = 100;

export function getLoadingStepDelay(progress) {
  if (progress < 80) return 55;
  if (progress < 95) return 120;
  return 250;
}

export default function DecoratingWallLoader({
  delay = 450,
  embedded = false,
  phrase = 'Estamos aplicando cada detalhe para deixar tudo pronto.',
}) {
  const [visible, setVisible] = useState(delay <= 0);
  const [progress, setProgress] = useState(1);

  useEffect(() => {
    if (delay <= 0) {
      setVisible(true);
      return undefined;
    }

    const timer = window.setTimeout(() => setVisible(true), delay);
    return () => window.clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!visible || progress >= LOADING_PROGRESS_MAX) {
      return undefined;
    }

    const timer = window.setTimeout(
      () => setProgress((current) => Math.min(LOADING_PROGRESS_MAX, current + 1)),
      getLoadingStepDelay(progress)
    );

    return () => window.clearTimeout(timer);
  }, [progress, visible]);

  if (!visible) {
    return null;
  }

  return (
    <main
      aria-busy="true"
      aria-label={`Carregando, ${progress}% concluído`}
      className={`wall-loader${embedded ? ' wall-loader--embedded' : ''}`}
      role="status"
      style={{ '--wall-loader-progress': `${progress}%` }}
    >
      <div aria-hidden="true" className="wall-loader-glow wall-loader-glow--one" />
      <div aria-hidden="true" className="wall-loader-glow wall-loader-glow--two" />

      <section className="wall-loader-content">
        <div className="wall-loader-heading">
          <span>INSTALAPRO</span>
          <strong>A transformação já começou.</strong>
        </div>

        <div aria-hidden="true" className="wall-loader-scene">
          <div className="wall-loader-frame">
            <div className="wall-loader-plaster" />
            <div className="wall-loader-paper">
              <div className="wall-loader-paper-light" />
              <svg className="wall-loader-drawing" viewBox="0 0 760 390">
                <g className="wall-loader-drawing-group">
                  <path d="M55 380C92 305 86 225 146 170C196 124 264 128 294 72" />
                  <path d="M120 241C91 223 70 194 64 158C98 161 126 184 139 214" />
                  <path d="M157 169C139 130 146 94 171 61C198 89 204 126 187 160" />
                  <path d="M202 137C225 102 257 84 296 82C289 120 263 147 226 156" />
                  <path d="M293 389C330 315 327 246 378 198C421 158 482 159 509 109" />
                  <path d="M352 260C321 241 302 214 299 180C333 184 360 205 371 236" />
                  <path d="M397 184C381 151 388 118 411 91C436 117 442 150 426 178" />
                  <path d="M449 153C473 121 505 107 542 109C532 144 506 167 471 174" />
                  <path d="M527 390C558 329 560 272 603 233C638 201 684 199 710 164" />
                  <path d="M587 278C563 263 546 239 543 211C571 214 594 231 604 256" />
                  <circle cx="294" cy="72" r="8" />
                  <circle cx="509" cy="109" r="7" />
                  <circle cx="710" cy="164" r="6" />
                </g>
              </svg>
              <div className="wall-loader-pattern" />
            </div>
            <div className="wall-loader-seam" />
            <div className="wall-loader-roller">
              <span />
              <i />
            </div>
            <div className="wall-loader-floor-line" />
          </div>
        </div>

        <div className="wall-loader-copy">
          <p>{phrase}</p>
          <div className="wall-loader-progress-row">
            <div aria-hidden="true" className="wall-loader-progress-track">
              <span />
            </div>
            <strong aria-hidden="true">{progress}%</strong>
          </div>
        </div>
      </section>
    </main>
  );
}
