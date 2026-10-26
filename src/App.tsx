import { useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { parseHash, useHash } from './router';
import { Game } from './screens/Game';
import { NotFound, RegionScreen } from './screens/Region';
import { Results } from './screens/Results';
import { RulesScreen } from './screens/Rules';
import { Settings } from './screens/Settings';
import { Village } from './screens/Village';
import { WordBank } from './screens/WordBank';
import { useAccount } from './store/account';
import { useProgress } from './store/progress';

export function App() {
  const hash = useHash();
  const route = parseHash(hash);
  const loaded = useProgress((s) => s.loaded);
  const load = useProgress((s) => s.load);
  const theme = useProgress((s) => s.save.settings.theme);

  useEffect(() => {
    void load();
  }, [load]);

  // Sign-in and sync start once local progress is loaded, so the merge sees it.
  useEffect(() => {
    if (loaded) void useAccount.getState().init();
  }, [loaded]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [hash]);

  return (
    <div className="app">
      <TopBar />
      <main className="main">{loaded ? <Screen route={route} /> : null}</main>
    </div>
  );
}

function Screen({ route }: { route: ReturnType<typeof parseHash> }) {
  switch (route.name) {
    case 'village':
      return <Village />;
    case 'region':
      return <RegionScreen id={route.id} />;
    case 'rules':
      return <RulesScreen id={route.id} />;
    case 'play':
      return <Game mode={route.mode} regionId={route.id} />;
    case 'results':
      return <Results />;
    case 'settings':
      return <Settings />;
    case 'words':
      return <WordBank theme={route.theme} />;
    default:
      return <NotFound />;
  }
}
