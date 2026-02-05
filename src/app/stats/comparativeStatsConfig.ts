// Comparative Stats Configuration
// This file contains the configuration for comparative stats rankings

export interface ComparativeStatType {
  key: string;
  label: string;
  category: 'performance' | 'economy' | 'participation' | 'banlistVoting' | 'cards';
  formatter: (value: number | string | null) => string;
  sortDirection: 'desc' | 'asc';
}

// Configuration for all comparative stats
export const COMPARATIVE_STATS: ComparativeStatType[] = [
  // Card Stats (1)
  { key: 'mostPlayedCards', label: 'Most Played Cards', category: 'cards', formatter: (v) => String(v), sortDirection: 'desc' },


  // Performance Stats (13)
  { key: 'totalWins', label: 'Total Wins (1st)', category: 'performance', formatter: (v) => String(v), sortDirection: 'desc' },
  { key: 'runnerUps', label: 'Runner Ups (2nd)', category: 'performance', formatter: (v) => String(v), sortDirection: 'desc' },
  { key: 'thirdPlace', label: 'Third Place', category: 'performance', formatter: (v) => String(v), sortDirection: 'desc' },
  { key: 'totalLosses', label: 'Total Losses (6th)', category: 'performance', formatter: (v) => String(v), sortDirection: 'asc' },
  { key: 'averagePlacement', label: 'Average Placement', category: 'performance', formatter: (v) => v !== null ? String(v) : 'N/A', sortDirection: 'asc' },
  { key: 'matchWins', label: 'Match Wins', category: 'performance', formatter: (v) => String(v), sortDirection: 'desc' },
  { key: 'matchWinRate', label: 'Match Win Rate', category: 'performance', formatter: (v) => `${v}%`, sortDirection: 'desc' },
  { key: 'gameWins', label: 'Game Wins', category: 'performance', formatter: (v) => String(v), sortDirection: 'desc' },
  { key: 'gameWinRate', label: 'Game Win Rate', category: 'performance', formatter: (v) => `${v}%`, sortDirection: 'desc' },
  { key: 'twoOhsGiven', label: '2-0s Given', category: 'performance', formatter: (v) => String(v), sortDirection: 'desc' },
  { key: 'twoOhsReceived', label: '2-0s Received', category: 'performance', formatter: (v) => String(v), sortDirection: 'asc' },
  { key: 'longestWinStreak', label: 'Longest Win Streak', category: 'performance', formatter: (v) => String(v), sortDirection: 'desc' },
  { key: 'longestLossStreak', label: 'Longest Loss Streak', category: 'performance', formatter: (v) => String(v), sortDirection: 'asc' },

  // Economy Stats (6)
  { key: 'totalPointsEarned', label: 'Total Points Earned', category: 'economy', formatter: (v) => String(v), sortDirection: 'desc' },
  { key: 'totalPointsSpent', label: 'Total Points Spent', category: 'economy', formatter: (v) => String(v), sortDirection: 'desc' },
  { key: 'currentBalance', label: 'Current Balance', category: 'economy', formatter: (v) => String(v), sortDirection: 'desc' },
  { key: 'averagePointsPerSession', label: 'Avg Points per Session', category: 'economy', formatter: (v) => String(v), sortDirection: 'desc' },
  { key: 'timesVPTaken', label: 'Times VP Taken', category: 'economy', formatter: (v) => String(v), sortDirection: 'desc' },
  { key: 'timesVPPassed', label: 'Times VP Passed', category: 'economy', formatter: (v) => String(v), sortDirection: 'desc' },

  // Participation Stats (4)
  { key: 'totalSessions', label: 'Total Sessions', category: 'participation', formatter: (v) => String(v), sortDirection: 'desc' },
  { key: 'sessionsSinceLastVP', label: 'Sessions Since Last VP', category: 'participation', formatter: (v) => String(v), sortDirection: 'desc' },
  { key: 'timesAsModerator', label: 'Times as Moderator', category: 'participation', formatter: (v) => String(v), sortDirection: 'desc' },
  { key: 'banlistSuggestionsChosen', label: 'Banlist Suggestions Chosen', category: 'participation', formatter: (v) => String(v), sortDirection: 'desc' },

  // Banlist Voting Stats (3)
  { key: 'averageVotesPerSuggestion', label: 'Avg Votes per Suggestion', category: 'banlistVoting', formatter: (v) => v !== null ? String(v) : 'N/A', sortDirection: 'desc' },
  { key: 'averageSuggestionsWithThreshold', label: 'Avg Suggestions with 2+ Votes', category: 'banlistVoting', formatter: (v) => v !== null ? String(v) : 'N/A', sortDirection: 'desc' },
  { key: 'averageChosenPerSession', label: 'Avg Chosen per Session', category: 'banlistVoting', formatter: (v) => v !== null ? String(v) : 'N/A', sortDirection: 'desc' },
];
