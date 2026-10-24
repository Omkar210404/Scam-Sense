import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { analyze, type Lang, type Model, type Result, type Span } from './engine.ts';
import { EXAMPLES, LANGS, LOST_MONEY, UI, VERDICT, reasonText } from './i18n.ts';
import modelJson from './model.json';

const model = modelJson as unknown as Model;

// Only preferences are stored, never message text.
const store = {
  get: (k: string) => { try { return localStorage.getItem('ss.' + k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem('ss.' + k, v); } catch { /* private mode */ } },
};

type InstallEvent = Event & { prompt: () => Promise<void> };

function initialLang(): Lang {
  const saved = store.get('lang');
  if (saved === 'en' || saved === 'hi' || saved === 'mr') return saved;
  const nav = navigator.language.slice(0, 2);
  return nav === 'hi' || nav === 'mr' ? nav : 'en';
}

/** Text shared from another app arrives in the URL fragment (see sw.js); read it once, then wipe it. */
function takeSharedText(): string | null {
  const m = location.hash.match(/^#shared=(.*)$/s);
  if (!m) return null;
  history.replaceState(null, '', location.pathname);
  try { return decodeURIComponent(m[1]); } catch { return null; }
}

export default function App() {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [langChosen, setLangChosen] = useState(() => store.get('lang') !== null);
  const [theme, setTheme] = useState(() => store.get('theme') ?? 'dark');
  const [text, setText] = useState('');
  const [result, setResult] = useState<{ text: string; r: Result } | null>(null);
  const [hint, setHint] = useState('');
  const [onboarding, setOnboarding] = useState(() => store.get('onboarded') !== '1');
  const [installEvt, setInstallEvt] = useState<InstallEvent | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const t = (k: keyof typeof UI) => UI[k][lang];

  const standalone = typeof matchMedia !== 'undefined' && matchMedia('(display-mode: standalone)').matches;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  function check(input: string, opts: { fromHistory?: boolean; example?: boolean } = {}) {
    const clean = input.trim();
    if (!clean) { setHint(t('empty')); return; }
    setHint('');
    const r = analyze(model, clean);
    // Shared or pasted text in Hindi/Marathi switches the language, unless the user picked one. Examples don't.
    if (!langChosen && !opts.example && r.detectedLang) setLang(r.detectedLang);
    setResult({ text: clean, r });
    setOnboarding(false);
    if (!opts.fromHistory) history.pushState({ view: 'result' }, '');
    window.scrollTo(0, 0);
    requestAnimationFrame(() => heading.current?.focus());
  }

  useEffect(() => {
    const shared = takeSharedText();
    if (shared) { setText(shared); check(shared, { fromHistory: true }); }
    const onPop = () => setResult(null);
    const onInstall = (e: Event) => { e.preventDefault(); setInstallEvt(e as InstallEvent); };
    const onInstalled = () => setInstallEvt(null);
    window.addEventListener('popstate', onPop);
    window.addEventListener('beforeinstallprompt', onInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('beforeinstallprompt', onInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickLang(l: Lang) { setLang(l); setLangChosen(true); store.set('lang', l); }
  function toggleTheme() { const next = theme === 'dark' ? 'light' : 'dark'; setTheme(next); store.set('theme', next); }
  function finishOnboarding() { store.set('onboarded', '1'); setOnboarding(false); }
  async function install() { if (installEvt) { await installEvt.prompt(); setInstallEvt(null); } }
  async function pasteClipboard() {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip.trim()) { setText(clip); check(clip); }
    } catch { setHint(t('pasteFailed')); }
  }
  function back() {
    if (history.state?.view === 'result') history.back();
    else setResult(null);
  }

  const installBox = !standalone && (installEvt || ios) ? (
    <div className="install">
      {installEvt ? (
        <>
          <p>{t('installWhy')}</p>
          <button className="btn btn-secondary" onClick={install}><DownloadIcon /> {t('install')}</button>
        </>
      ) : <p>{t('iosHint')}</p>}
    </div>
  ) : null;

  return (
    <div className="app">
      <header className="top">
        <div className="brand"><img src="./icon.svg" alt="" width="32" height="32" /> ScamSense</div>
        <button className="icon-btn" onClick={toggleTheme} aria-label={theme === 'dark' ? t('themeLight') : t('themeDark')}>
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </header>
      <nav className="langs" aria-label="Language">
        {LANGS.map((l) => (
          <button key={l.id} className={l.id === lang ? 'on' : ''} aria-pressed={l.id === lang} onClick={() => pickLang(l.id)} lang={l.id}>{l.label}</button>
        ))}
      </nav>

      <main>
        {onboarding && !result ? (
          <section className="card onboarding">
            <h1>{t('onbTitle')}</h1>
            <ShareDemo />
            <ol className="steps">
              <li>{t('step1')}</li>
              <li>{t('step2')}</li>
              <li>{t('step3')}</li>
            </ol>
            <p className="muted">{t('onbNote')}</p>
            <div className="row">
              <button className="btn btn-primary" onClick={finishOnboarding}>{t('gotIt')}</button>
              {installEvt && !standalone && <button className="btn btn-secondary" onClick={install}><DownloadIcon /> {t('install')}</button>}
            </div>
          </section>
        ) : result ? (
          <ResultView result={result} lang={lang} t={t} headingRef={heading} onBack={back} onLang={pickLang} />
        ) : (
          <>
            <h1 className="tagline">{t('tagline')}</h1>
            <p className="privacy"><LockIcon /> {t('privacy')}</p>
            <label className="paste-label" htmlFor="msg">{t('pasteLabel')}</label>
            <textarea id="msg" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('placeholder')} rows={6} autoComplete="off" spellCheck={false} />
            {hint && <p className="hint" role="alert">{hint}</p>}
            <button className="btn btn-primary btn-big" onClick={() => check(text)}>{t('check')}</button>
            <div className="row">
              {'clipboard' in navigator && 'readText' in navigator.clipboard && (
                <button className="btn btn-secondary" onClick={pasteClipboard}><ClipboardIcon /> {t('paste')}</button>
              )}
              {text && <button className="btn btn-ghost" onClick={() => { setText(''); setHint(''); }}>{t('clear')}</button>}
            </div>

            <h2 className="section">{t('examples')}</h2>
            <div className="examples">
              {EXAMPLES.map((ex, i) => (
                <button key={i} className="example" onClick={() => { setText(ex.text); check(ex.text, { example: true }); }}>
                  <span className="ex-label">{ex.label[lang]}</span>
                  <span className="ex-text">{ex.text}</span>
                </button>
              ))}
            </div>
            {installBox}
            <button className="link-btn" onClick={() => setOnboarding(true)}>{t('how')}</button>
          </>
        )}
      </main>
      <footer>{t('footer')}</footer>
    </div>
  );
}

function ResultView({ result, lang, t, headingRef, onBack, onLang }: {
  result: { text: string; r: Result };
  lang: Lang;
  t: (k: keyof typeof UI) => string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onBack: () => void;
  onLang: (l: Lang) => void;
}) {
  const { r, text } = result;
  const v = VERDICT[r.verdict];
  const other = r.detectedLang && r.detectedLang !== lang ? r.detectedLang : null;
  return (
    <section aria-live="polite">
      <div className={`verdict v-${r.verdict}`}>
        <VerdictIcon verdict={r.verdict} />
        <div>
          <h1 ref={headingRef} tabIndex={-1}>{v.title[lang]}</h1>
          <p>{v.sub[lang]}</p>
        </div>
      </div>
      {other && <button className="link-btn read-in" onClick={() => onLang(other)} lang={other}>{UI.readIn[other]}</button>}

      <h2 className="section">{t('why')}</h2>
      <ul className="reasons">
        {r.reasons.map((x, i) => (
          <li key={i} className={`tone-${x.tone}`}>
            <span className="r-icon" aria-hidden="true">{x.tone === 'bad' ? '!' : x.tone === 'good' ? '✓' : 'i'}</span>
            <span>{reasonText(x, lang)}</span>
          </li>
        ))}
      </ul>

      <div className={`todo todo-${r.verdict}`}>
        <h2>{t('todo')}</h2>
        <p>{v.todo[lang]}</p>
        {r.verdict !== 'safe' && <p className="small">{LOST_MONEY[lang]}</p>}
      </div>

      <h2 className="section">{t('yourMessage')}</h2>
      <Highlighted text={text} spans={r.spans} />
      {r.spans.length > 0 && (
        <p className="legend">
          {r.spans.some((s) => s.severity === 'danger') && <span><mark className="hl hl-danger">&nbsp;&nbsp;&nbsp;</mark> {t('legendDanger')}</span>}
          {r.spans.some((s) => s.severity === 'warn') && <span><mark className="hl hl-warn">&nbsp;&nbsp;&nbsp;</mark> {t('legendWarn')}</span>}
          {r.spans.some((s) => s.severity === 'link') && <span><mark className="hl hl-link">&nbsp;&nbsp;&nbsp;</mark> {t('legendLink')}</span>}
        </p>
      )}

      <p className="note"><InfoIcon /> {t('note')}</p>
      <button className="btn btn-primary btn-big" onClick={onBack}>{t('again')}</button>
    </section>
  );
}

function Highlighted({ text, spans }: { text: string; spans: Span[] }) {
  const parts = useMemo(() => {
    const out: { s: string; sev?: Span['severity'] }[] = [];
    let at = 0;
    for (const sp of spans) {
      if (sp.start > at) out.push({ s: text.slice(at, sp.start) });
      out.push({ s: text.slice(sp.start, sp.end), sev: sp.severity });
      at = sp.end;
    }
    if (at < text.length) out.push({ s: text.slice(at) });
    return out;
  }, [text, spans]);
  // Links are shown as plain text on purpose: nothing in the message is clickable.
  return <div className="message">{parts.map((p, i) => (p.sev ? <mark key={i} className={`hl hl-${p.sev}`}>{p.s}</mark> : <span key={i}>{p.s}</span>))}</div>;
}

/** Tiny looping illustration of the two-tap share flow. */
function ShareDemo() {
  return (
    <div className="demo" aria-hidden="true">
      <div className="phone">
        <div className="bubble">Your account will be blocked. Update KYC: sbi-kyc.xyz</div>
        <div className="finger" />
        <div className="sheet">
          <div className="sheet-title">Share</div>
          <div className="apps">
            <span className="app-dot a1" /><span className="app-dot a2" />
            <span className="app-dot ss"><img src="./icon.svg" alt="" /></span><span className="app-dot a3" />
          </div>
        </div>
        <div className="mini-verdict"><span>✕</span> Likely scam</div>
      </div>
    </div>
  );
}

function VerdictIcon({ verdict }: { verdict: Result['verdict'] }) {
  if (verdict === 'safe') return <svg className="v-icon" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" strokeWidth="4" /><path d="M14 25l7 7 13-15" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (verdict === 'suspicious') return <svg className="v-icon" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4L45 42H3z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" /><path d="M24 17v12" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /><circle cx="24" cy="35.5" r="3" fill="currentColor" /></svg>;
  return <svg className="v-icon" viewBox="0 0 48 48" aria-hidden="true"><path d="M16 3h16l13 13v16L32 45H16L3 32V16z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" /><path d="M17 17l14 14M31 17L17 31" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /></svg>;
}

const SunIcon = () => <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
const MoonIcon = () => <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
const LockIcon = () => <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M8 10.5V8a4 4 0 018 0v2.5" fill="none" stroke="currentColor" strokeWidth="2" /></svg>;
const InfoIcon = () => <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M12 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="12" cy="7.5" r="1.3" fill="currentColor" /></svg>;
const ClipboardIcon = () => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="5" y="4.5" width="14" height="17" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /><rect x="9" y="2.5" width="6" height="4" rx="1" fill="none" stroke="currentColor" strokeWidth="2" /></svg>;
const DownloadIcon = () => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M4 20h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
