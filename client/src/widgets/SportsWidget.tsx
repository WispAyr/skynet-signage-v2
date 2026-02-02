/**
 * 🏈 Sports Widget - Team news, fixtures, and results
 * Supports multiple teams via config
 */

import { useState, useEffect } from 'react';

interface SportsWidgetConfig {
  team?: 'rangers' | 'celtic' | 'ayr-united';
  showNews?: boolean;
  showFixtures?: boolean;
  showTable?: boolean;
  refreshInterval?: number;
}

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
}

interface Fixture {
  date: string;
  opponent: string;
  venue: string;
  competition: string;
  result?: string;
  isNext?: boolean;
}

const TEAM_CONFIG = {
  rangers: {
    name: 'Rangers FC',
    colors: { primary: '#0066CC', secondary: '#FFFFFF' },
    badge: '🔵',
    rssUrl: 'https://www.bbc.co.uk/sport/football/teams/rangers/rss.xml',
    hashtag: '#RangersFC'
  },
  celtic: {
    name: 'Celtic FC',
    colors: { primary: '#16A34A', secondary: '#FFFFFF' },
    badge: '🍀',
    rssUrl: 'https://www.bbc.co.uk/sport/football/teams/celtic/rss.xml',
    hashtag: '#CelticFC'
  },
  'ayr-united': {
    name: 'Ayr United',
    colors: { primary: '#000000', secondary: '#FFFFFF' },
    badge: '⚫',
    rssUrl: 'https://www.bbc.co.uk/sport/football/teams/ayr-united/rss.xml',
    hashtag: '#AyrUnited'
  }
};

// Proxy RSS through our server to avoid CORS
async function fetchNews(team: keyof typeof TEAM_CONFIG): Promise<NewsItem[]> {
  try {
    const config = TEAM_CONFIG[team];
    // Use a CORS proxy or our own backend
    const proxyUrl = `/api/proxy/rss?url=${encodeURIComponent(config.rssUrl)}`;
    const res = await fetch(proxyUrl);
    
    if (!res.ok) {
      // Fallback: return mock data
      return getMockNews(team);
    }
    
    const data = await res.json();
    return data.items?.slice(0, 5) || getMockNews(team);
  } catch (e) {
    console.error('Failed to fetch news:', e);
    return getMockNews(team);
  }
}

function getMockNews(team: keyof typeof TEAM_CONFIG): NewsItem[] {
  const teamName = TEAM_CONFIG[team].name;
  return [
    { title: `${teamName} latest transfer news and updates`, link: '#', pubDate: new Date().toISOString() },
    { title: `Match preview: ${teamName} prepare for weekend fixture`, link: '#', pubDate: new Date().toISOString() },
    { title: `Manager discusses squad depth and upcoming challenges`, link: '#', pubDate: new Date().toISOString() },
  ];
}

function getMockFixtures(team: keyof typeof TEAM_CONFIG): Fixture[] {
  const opponents = team === 'rangers' 
    ? ['Celtic', 'Aberdeen', 'Hearts', 'Hibernian', 'Dundee United']
    : team === 'celtic'
    ? ['Rangers', 'Aberdeen', 'Hearts', 'Hibernian', 'Dundee United']
    : ['Partick Thistle', 'Queen of the South', 'Dunfermline', 'Raith Rovers', 'Morton'];
  
  const now = new Date();
  return [
    { 
      date: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
      opponent: opponents[0],
      venue: 'H',
      competition: 'Scottish Premiership',
      result: '2-1'
    },
    { 
      date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
      opponent: opponents[1],
      venue: 'A',
      competition: 'Scottish Premiership',
      isNext: true
    },
    { 
      date: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
      opponent: opponents[2],
      venue: 'H',
      competition: 'Scottish Cup'
    },
  ];
}

export function SportsWidget({ config }: { config: SportsWidgetConfig }) {
  const team = config.team || 'rangers';
  const teamConfig = TEAM_CONFIG[team];
  const [news, setNews] = useState<NewsItem[]>([]);
  const [fixtures] = useState<Fixture[]>(getMockFixtures(team));
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNews(team).then(items => {
      setNews(items);
      setLoading(false);
    });
    
    const interval = setInterval(() => {
      fetchNews(team).then(setNews);
    }, (config.refreshInterval || 300) * 1000);
    
    return () => clearInterval(interval);
  }, [team, config.refreshInterval]);

  // Rotate news headlines
  useEffect(() => {
    if (news.length === 0) return;
    const interval = setInterval(() => {
      setCurrentNewsIndex(i => (i + 1) % news.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [news.length]);

  const nextMatch = fixtures.find(f => f.isNext);

  return (
    <div 
      className="h-full w-full flex flex-col overflow-hidden"
      style={{ 
        background: `linear-gradient(135deg, ${teamConfig.colors.primary} 0%, ${teamConfig.colors.primary}dd 100%)`,
        color: teamConfig.colors.secondary
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/20">
        <div className="flex items-center gap-4">
          <span className="text-5xl">{teamConfig.badge}</span>
          <div>
            <h1 className="text-3xl font-bold">{teamConfig.name}</h1>
            <p className="text-sm opacity-75">{teamConfig.hashtag}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm opacity-75">SCOTTISH PREMIERSHIP</div>
          <div className="text-2xl font-bold">2nd</div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Next Match */}
        {nextMatch && (
          <div className="flex-1 p-6 border-r border-white/20 flex flex-col justify-center">
            <div className="text-sm uppercase tracking-wider opacity-75 mb-2">Next Match</div>
            <div className="text-4xl font-bold mb-2">
              {nextMatch.venue === 'H' ? 'vs' : '@'} {nextMatch.opponent}
            </div>
            <div className="text-xl opacity-90">{nextMatch.date}</div>
            <div className="text-sm opacity-75 mt-1">{nextMatch.competition}</div>
            <div className="mt-4 inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2 w-fit">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-sm">Ibrox Stadium</span>
            </div>
          </div>
        )}

        {/* Recent Results & Upcoming */}
        <div className="flex-1 p-6 flex flex-col">
          <div className="text-sm uppercase tracking-wider opacity-75 mb-3">Fixtures & Results</div>
          <div className="space-y-3">
            {fixtures.map((fixture, i) => (
              <div 
                key={i} 
                className={`flex items-center justify-between p-3 rounded-lg ${fixture.isNext ? 'bg-white/20 ring-2 ring-white/50' : 'bg-white/10'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs bg-white/20 px-2 py-1 rounded">{fixture.venue}</span>
                  <span className="font-medium">{fixture.opponent}</span>
                </div>
                <div className="text-right">
                  {fixture.result ? (
                    <span className={`font-bold ${fixture.result.startsWith('W') || fixture.result.split('-')[0] > fixture.result.split('-')[1] ? 'text-green-300' : fixture.result.split('-')[0] < fixture.result.split('-')[1] ? 'text-red-300' : ''}`}>
                      {fixture.result}
                    </span>
                  ) : (
                    <span className="text-sm opacity-75">{fixture.date}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* News Ticker */}
      <div className="bg-black/30 p-4">
        <div className="flex items-center gap-4">
          <span className="bg-white text-black px-3 py-1 rounded font-bold text-sm shrink-0">
            NEWS
          </span>
          <div className="overflow-hidden flex-1">
            {loading ? (
              <span className="opacity-75">Loading latest news...</span>
            ) : news.length > 0 ? (
              <span className="block truncate text-lg">
                {news[currentNewsIndex]?.title}
              </span>
            ) : (
              <span className="opacity-75">No news available</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SportsWidget;
