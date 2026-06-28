import { NavLink, Outlet } from 'react-router-dom';
import { Trophy, Flag, Users, BarChart3 } from 'lucide-react';
import SeasonSelector from '@/components/SeasonSelector';

// NOTE: The "Live" page (src/pages/Live.tsx) is intentionally not routed/linked
// right now. It depends on the OpenF1 API, which started requiring a paid API
// key (€9.90/mo) for any access — including historical data — during the exact
// window it would be live (30 min before/after a session). Until that's
// resolved (paid key, or a viable free source), the page is unreachable so it
// can never fire a single request. The code is left in place for later.
const navItems = [
  { to: '/', label: 'Dashboard', icon: BarChart3 },
  { to: '/races', label: 'Races & Bets', icon: Flag },
  { to: '/players', label: 'Players', icon: Users },
];

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Trophy className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">
              F1 Poule
            </h1>
          </div>
          <nav className="flex items-center gap-2">
            <SeasonSelector />
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
