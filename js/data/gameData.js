// Static content. Change CURRENCY to localise every amount in the app.
export const CURRENCY = '$';
export const levelOf = xp => Math.floor(Math.sqrt(xp / 60)) + 1;
export const TIERS = [
  { min: 1, name: 'Rookie' }, { min: 3, name: 'Saver' }, { min: 5, name: 'Planner' },
  { min: 7, name: 'Strategist' }, { min: 9, name: 'Architect' }
];

export const BADGES = [
  { id: 'welcome', name: 'Day One', desc: 'Finish the tutorial', icon: '★', test: s => !!s.tutorialDone },
  { id: 'first-step', name: 'First Step', desc: 'Finish any lesson', icon: '◆', test: s => Object.keys({ ...s.lessons, ...s.studied, ...s.quizResults }).length >= 1 },
  { id: 'tax-savvy', name: 'Tax Savvy', desc: 'Finish Taxes 101', icon: '◈', test: s => !!(s.studied?.taxes || s.quizResults?.taxes || s.lessons.taxes) },
  { id: 'budget-boss', name: 'Budget Boss', desc: 'Finish Budgeting Basics', icon: '▣', test: s => !!(s.studied?.budgeting || s.quizResults?.budgeting || s.lessons.budgeting) },
  { id: 'credit-aware', name: 'Credit Aware', desc: 'Finish Credit Basics', icon: '◉', test: s => !!(s.studied?.credit || s.quizResults?.credit || s.lessons.credit) },
  { id: 'balanced', name: 'Balanced Books', desc: 'Score 85+ on a budget month', icon: '⚖', test: s => s.bestScore >= 85 },
  { id: 'on-a-roll', name: 'On a Roll', desc: 'Reach a 3-day streak', icon: '✦', test: s => s.streak >= 3 },
  { id: 'nest-egg', name: 'Nest Egg', desc: 'Save 1,000 in the sandbox', icon: '❖', test: s => s.savings >= 1000 },
  { id: 'five-lessons', name: 'Getting Serious', desc: 'Finish 5 lessons', icon: '●', test: s => Object.keys({ ...s.lessons, ...s.studied, ...s.quizResults }).length >= 5 },
  { id: 'ten-lessons', name: 'Knowledge Stack', desc: 'Finish 10 lessons', icon: '■', test: s => Object.keys({ ...s.lessons, ...s.studied, ...s.quizResults }).length >= 10 },
  { id: 'daily-3', name: 'Daily Habit', desc: 'Complete 3 daily challenges', icon: '✧', test: s => (s.dailyDone || 0) >= 3 },
  { id: 'perfect', name: 'Flawless', desc: 'Score 100% on a lesson', icon: '✔', test: s => (s.perfects || 0) >= 1 },
  { id: 'investor', name: 'First Investor', desc: 'Finish the investing game', icon: '▲', test: s => (s.sims?.invest?.plays || 0) >= 1 },
  { id: 'planner', name: 'Planner Rank', desc: 'Reach level 5', icon: '✪', test: s => levelOf(s.xp) >= 5 }
];

export const BUDGET = {
  income: 3200,
  categories: [
    { id: 'rent', label: 'Rent', group: 'needs', min: 800 },
    { id: 'utilities', label: 'Utilities', group: 'needs', min: 80 },
    { id: 'groceries', label: 'Groceries', group: 'needs', min: 250 },
    { id: 'transport', label: 'Transport', group: 'needs', min: 80 },
    { id: 'dining', label: 'Eating out', group: 'wants', min: 0 },
    { id: 'fun', label: 'Fun and hobbies', group: 'wants', min: 0 },
    { id: 'subs', label: 'Subscriptions', group: 'wants', min: 0 },
    { id: 'emergency', label: 'Emergency fund', group: 'savings', min: 0 },
    { id: 'goals', label: 'Long-term savings', group: 'savings', min: 0 }
  ],
  suggest: { rent: 1000, utilities: 120, groceries: 380, transport: 150, dining: 120, fun: 150, subs: 30, emergency: 200 },
  events: [
    { t: 'Flat tyre and a new set', cost: 180 }, { t: 'Phone screen repair', cost: 150 },
    { t: 'Dentist visit', cost: 200 }, { t: 'Friend’s birthday dinner', cost: 60 }, { t: 'Laptop charger died', cost: 90 }
  ]
};
