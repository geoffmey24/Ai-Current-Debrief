/* ═══════════════════════════════════════════════════════════
   OTTO — Game Data: Decisions, Careers, NPCs, Events
   ═══════════════════════════════════════════════════════════ */
'use strict';

/* ─────────────────────────────────────────────────────────
   DECISION CARDS
   Each card: { id, title, description, trigger, requiresKnowledge?,
                options: [{ text, subtext?, effects, successChance? }] }
   effects: { money, knowledge, happiness, health, relationship? }
   ───────────────────────────────────────────────────────── */
const DECISION_DATA = {

  /* ── HOME / DESK ── */
  home_desk: [
    {
      id: 'hd_freelance',
      title: 'Freelance Project Offer',
      description: 'A client has messaged you online asking for help with a project.',
      options: [
        { text: 'Take the easy project', subtext: 'Low pay, low effort',
          effects: { money: 600, knowledge: 1, happiness: 0, health: 0 } },
        { text: 'Take the challenging project', subtext: 'High pay, more stress',
          effects: { money: 1400, knowledge: 3, happiness: -10, health: -5 } },
        { text: 'Decline — not right now',
          effects: { money: 0, knowledge: 0, happiness: 5, health: 5 } },
      ]
    },
    {
      id: 'hd_online_course',
      title: 'Finance Course Available',
      description: 'A well-reviewed online finance certification course just opened enrollment.',
      options: [
        { text: 'Enroll and complete it', subtext: '-$200 • Full commitment',
          effects: { money: -200, knowledge: 6, happiness: 5, health: -3 } },
        { text: 'Watch free previews only',
          effects: { money: 0, knowledge: 2, happiness: 2, health: 0 } },
        { text: "I'll do it later",
          effects: { money: 0, knowledge: 0, happiness: 3, health: 5 } },
      ]
    },
    {
      id: 'hd_invest_check',
      title: 'Check Your Portfolio',
      description: 'The market has been volatile lately. Time to review your investments.',
      requiresKnowledge: 5,
      options: [
        { text: 'Rebalance portfolio', subtext: 'Moderate, stable strategy',
          effects: { money: 0, knowledge: 2, happiness: 5, health: 0 },
          successChance: 'knowledge', successMoney: 400, failMoney: -100 },
        { text: 'Go aggressive — buy more',
          effects: { money: 0, knowledge: 1, happiness: 0, health: -2 },
          successChance: 'knowledge', successMoney: 900, failMoney: -600 },
        { text: 'Move everything to savings', subtext: 'Play it safe',
          effects: { money: 150, knowledge: 0, happiness: -5, health: 0 } },
      ]
    },
    {
      id: 'hd_startup',
      title: 'Start a Side Business',
      description: "You've had a business idea brewing for months. The time feels right.",
      requiresKnowledge: 8,
      options: [
        { text: 'Launch it now', subtext: '-$1500 investment',
          effects: { money: -1500, knowledge: 4, happiness: 10, health: -5 },
          successChance: 'knowledge', successMoney: 3500, failMoney: 0 },
        { text: 'Plan more, launch next month',
          effects: { money: 0, knowledge: 2, happiness: 2, health: 0 } },
        { text: 'Abandon the idea',
          effects: { money: 0, knowledge: 0, happiness: -8, health: 0 } },
      ]
    },
    {
      id: 'hd_job_apply',
      title: 'Job Opening Spotted',
      description: 'A promising job listing appeared. It pays significantly more than your current role.',
      options: [
        { text: 'Apply carefully with custom resume',
          effects: { money: 0, knowledge: 1, happiness: 5, health: -3 },
          successChance: 'knowledge', careerChange: true },
        { text: 'Quick apply and hope for the best',
          effects: { money: 0, knowledge: 0, happiness: 0, health: 0 },
          successChance: 0.25, careerChange: true },
        { text: "I'm happy where I am",
          effects: { money: 0, knowledge: 0, happiness: 2, health: 0 } },
      ]
    },
    {
      id: 'hd_stock_tip',
      title: 'Hot Stock Tip',
      description: 'You see a viral post claiming a small tech company is about to explode in value.',
      requiresKnowledge: 4,
      options: [
        { text: 'Research and invest small', subtext: '-$300 • Calculated risk',
          effects: { money: -300, knowledge: 2, happiness: 5, health: 0 },
          successChance: 0.45, successMoney: 900, failMoney: 0 },
        { text: 'Go all in — buy $1000 worth',
          effects: { money: -1000, knowledge: 0, happiness: 5, health: -5 },
          successChance: 0.3, successMoney: 3000, failMoney: 0 },
        { text: 'Ignore it — probably a scam',
          effects: { money: 0, knowledge: 1, happiness: 0, health: 0 } },
      ]
    },
    {
      id: 'hd_budget',
      title: 'Time to Budget',
      description: "Your finances are a mess. You haven't tracked spending in months.",
      options: [
        { text: 'Create a detailed budget', subtext: 'Mindful money management',
          effects: { money: 200, knowledge: 3, happiness: 5, health: 0 } },
        { text: 'Do a quick overview',
          effects: { money: 50, knowledge: 1, happiness: 0, health: 0 } },
        { text: "I'll deal with it another time",
          effects: { money: -100, knowledge: 0, happiness: -3, health: 0 } },
      ]
    },
    {
      id: 'hd_relax',
      title: 'Rest and Recharge',
      description: "You've been working hard. The couch is calling.",
      options: [
        { text: 'Watch a documentary — learn something',
          effects: { money: 0, knowledge: 1, happiness: 10, health: 5 } },
        { text: 'Mindlessly scroll social media for hours',
          effects: { money: 0, knowledge: 0, happiness: -5, health: -3 } },
        { text: 'Meditate and journal',
          effects: { money: 0, knowledge: 1, happiness: 15, health: 8 } },
      ]
    },
    {
      id: 'hd_rental',
      title: 'Real Estate Opportunity',
      description: 'A friend is selling a small rental property. You could invest.',
      requiresKnowledge: 10,
      options: [
        { text: 'Buy it as an investment', subtext: '-$8000 down payment',
          effects: { money: -8000, knowledge: 3, happiness: 10, health: -3 },
          successChance: 'knowledge', successMoney: 15000, failMoney: -2000 },
        { text: "I'm interested, but need more time",
          effects: { money: 0, knowledge: 2, happiness: 2, health: 0 } },
        { text: 'Pass on it',
          effects: { money: 0, knowledge: 0, happiness: -2, health: 0 } },
      ]
    },
  ],

  /* ── GYM ── */
  gym: [
    {
      id: 'gym_workout',
      title: 'Morning at the Gym',
      description: "The gym is quiet. You have the equipment to yourself.",
      options: [
        { text: 'Push yourself hard today',
          effects: { money: 0, knowledge: 0, happiness: 5, health: 12 } },
        { text: 'Moderate workout — steady progress',
          effects: { money: 0, knowledge: 0, happiness: 8, health: 8 } },
        { text: 'Light session, then sauna',
          effects: { money: 0, knowledge: 0, happiness: 12, health: 5 } },
      ]
    },
    {
      id: 'gym_class',
      title: 'Fitness Class Sign-Up',
      description: 'A new fitness class is starting. The instructor looks excellent.',
      options: [
        { text: 'Join the class', subtext: '-$80/month',
          effects: { money: -80, knowledge: 1, happiness: 12, health: 10 } },
        { text: 'Watch one session first',
          effects: { money: 0, knowledge: 0, happiness: 5, health: 2 } },
        { text: 'Stick to solo training',
          effects: { money: 0, knowledge: 0, happiness: 2, health: 6 } },
      ]
    },
    {
      id: 'gym_meet',
      title: 'Interesting Person at the Gym',
      description: 'Someone catches your eye between sets — athletic, focused, and friendly-looking.',
      options: [
        { text: 'Start a conversation', subtext: 'Could be a new connection',
          effects: { money: 0, knowledge: 0, happiness: 10, health: 0, relationship: { npcType: 'gym', delta: 15 } } },
        { text: 'Smile and nod — keep it casual',
          effects: { money: 0, knowledge: 0, happiness: 5, health: 0, relationship: { npcType: 'gym', delta: 5 } } },
        { text: 'Stay focused on your workout',
          effects: { money: 0, knowledge: 0, happiness: 0, health: 5 } },
      ]
    },
    {
      id: 'gym_trainer',
      title: 'Personal Trainer Offer',
      description: 'The gym trainer approaches you with a personal training package.',
      options: [
        { text: 'Hire them', subtext: '-$200/month • Expert guidance',
          effects: { money: -200, knowledge: 2, happiness: 8, health: 18 } },
        { text: 'Ask for just one session',
          effects: { money: -60, knowledge: 3, happiness: 5, health: 8 } },
        { text: 'Decline politely',
          effects: { money: 0, knowledge: 0, happiness: 0, health: 4 } },
      ]
    },
    {
      id: 'gym_skip',
      title: 'Skipping the Gym',
      description: "You're exhausted and the gym feels like the last place you want to be.",
      options: [
        { text: 'Push through it anyway',
          effects: { money: 0, knowledge: 0, happiness: -5, health: 10 } },
        { text: 'Light walk outside instead',
          effects: { money: 0, knowledge: 0, happiness: 5, health: 4 } },
        { text: 'Go home and rest',
          effects: { money: 0, knowledge: 0, happiness: 8, health: -3 } },
      ]
    },
    {
      id: 'gym_competition',
      title: 'Fitness Competition',
      description: "The gym is hosting a local fitness challenge with a cash prize.",
      options: [
        { text: 'Enter the competition',
          effects: { money: 0, knowledge: 0, happiness: 0, health: 5 },
          successChance: 'health', successMoney: 500, successHappiness: 20, failHappiness: -5 },
        { text: 'Cheer from the sidelines',
          effects: { money: 0, knowledge: 0, happiness: 8, health: 0 } },
        { text: 'Ignore it entirely',
          effects: { money: 0, knowledge: 0, happiness: -2, health: 3 } },
      ]
    },
  ],

  /* ── CAFÉ ── */
  cafe: [
    {
      id: 'cafe_socialize',
      title: 'Lively Crowd Today',
      description: 'The café is buzzing with energy. Groups are laughing, networking, and enjoying coffee.',
      options: [
        { text: 'Join the group at the big table',
          effects: { money: 0, knowledge: 0, happiness: 15, health: 0, relationship: { npcType: 'social', delta: 10 } } },
        { text: 'Work quietly at your corner table',
          effects: { money: 200, knowledge: 2, happiness: 5, health: 0 } },
        { text: 'Order to-go and leave',
          effects: { money: 0, knowledge: 0, happiness: 2, health: 0 } },
      ]
    },
    {
      id: 'cafe_network',
      title: 'Networking Event Tonight',
      description: "The café is hosting a young professionals' mixer. Business cards are flying.",
      options: [
        { text: 'Network aggressively', subtext: 'Make as many contacts as possible',
          effects: { money: 0, knowledge: 2, happiness: 5, health: -3, relationship: { npcType: 'professional', delta: 12 } },
          careerBonus: true },
        { text: 'Have a few meaningful conversations',
          effects: { money: 0, knowledge: 1, happiness: 10, health: 0, relationship: { npcType: 'professional', delta: 8 } } },
        { text: 'Observe from the bar',
          effects: { money: 0, knowledge: 0, happiness: 5, health: 0 } },
      ]
    },
    {
      id: 'cafe_date',
      title: 'Coffee Date',
      description: "You're meeting someone you've been talking to. Nervous energy fills the air.",
      trigger: 'has_romantic_interest',
      options: [
        { text: 'Be genuine and open',
          effects: { money: -30, knowledge: 0, happiness: 18, health: 0, relationship: { npcType: 'romantic', delta: 20 } } },
        { text: 'Keep it light and fun',
          effects: { money: -30, knowledge: 0, happiness: 12, health: 0, relationship: { npcType: 'romantic', delta: 10 } } },
        { text: 'Bail at the last minute',
          effects: { money: 0, knowledge: 0, happiness: -10, health: 0, relationship: { npcType: 'romantic', delta: -15 } } },
      ]
    },
    {
      id: 'cafe_overheard',
      title: 'Overheard Opportunity',
      description: 'Two businesspeople at the next table are talking about a new investment fund.',
      requiresKnowledge: 4,
      options: [
        { text: 'Politely introduce yourself',
          effects: { money: 0, knowledge: 2, happiness: 8, health: 0, relationship: { npcType: 'professional', delta: 8 } },
          careerBonus: true },
        { text: 'Listen carefully and take notes',
          effects: { money: 0, knowledge: 3, happiness: 3, health: 0 } },
        { text: 'Mind your own business',
          effects: { money: 0, knowledge: 0, happiness: 0, health: 0 } },
      ]
    },
    {
      id: 'cafe_interview',
      title: 'Job Interview at Café',
      description: "A recruiter wants to meet you here. This could change everything.",
      options: [
        { text: 'Come fully prepared', subtext: 'Research + practice beforehand',
          effects: { money: 0, knowledge: 2, happiness: 5, health: -5 },
          successChance: 'knowledge', careerChange: true },
        { text: 'Wing it and rely on charm',
          effects: { money: 0, knowledge: 0, happiness: 0, health: 0 },
          successChance: 0.3, careerChange: true },
        { text: 'Cancel at the last minute',
          effects: { money: 0, knowledge: 0, happiness: -8, health: 0 } },
      ]
    },
    {
      id: 'cafe_old_friend',
      title: 'Unexpected Reunion',
      description: "You run into an old friend you haven't seen in years.",
      options: [
        { text: 'Catch up over coffee',
          effects: { money: -15, knowledge: 0, happiness: 20, health: 0, relationship: { npcType: 'friend', delta: 25 } } },
        { text: 'Brief hello then go your separate ways',
          effects: { money: 0, knowledge: 0, happiness: 8, health: 0, relationship: { npcType: 'friend', delta: 8 } } },
        { text: 'Pretend you didn\'t see them',
          effects: { money: 0, knowledge: 0, happiness: -5, health: 0 } },
      ]
    },
  ],

  /* ── OFFICE / WORK ── */
  office: [
    {
      id: 'off_diligent',
      title: 'Busy Season at Work',
      description: 'Deadlines are piling up and your boss is watching.',
      options: [
        { text: 'Work diligently — exceed expectations',
          effects: { money: 200, knowledge: 2, happiness: -5, health: -5 }, careerBonus: true },
        { text: 'Meet the minimum requirements',
          effects: { money: 0, knowledge: 0, happiness: 2, health: 0 } },
        { text: 'Cut corners — good enough',
          effects: { money: 0, knowledge: 0, happiness: 5, health: 5 }, careerPenalty: true },
      ]
    },
    {
      id: 'off_extra_project',
      title: 'Extra Project Offer',
      description: 'Your manager asks if you can handle an additional project this month.',
      options: [
        { text: 'Accept eagerly',
          effects: { money: 400, knowledge: 3, happiness: -8, health: -8 }, careerBonus: true },
        { text: 'Accept with conditions — negotiate scope',
          effects: { money: 200, knowledge: 2, happiness: 0, health: -3 } },
        { text: 'Decline — too much on your plate',
          effects: { money: 0, knowledge: 0, happiness: 5, health: 5 } },
      ]
    },
    {
      id: 'off_raise',
      title: 'Ask for a Raise',
      description: "It's been a year. You've delivered solid results. Time to negotiate.",
      requiresKnowledge: 3,
      options: [
        { text: 'Negotiate firmly with data', subtext: 'High risk, high reward',
          effects: { money: 0, knowledge: 1, happiness: 5, health: 0 },
          successChance: 'knowledge', successSalary: 400, failRelationship: -5 },
        { text: 'Ask humbly — see what they say',
          effects: { money: 0, knowledge: 0, happiness: 0, health: 0 },
          successChance: 0.5, successSalary: 200 },
        { text: "Wait for a better time",
          effects: { money: 0, knowledge: 0, happiness: -3, health: 0 } },
      ]
    },
    {
      id: 'off_coworker',
      title: 'Difficult Coworker Situation',
      description: 'A coworker keeps taking credit for your work. It\'s becoming a problem.',
      options: [
        { text: 'Confront them professionally',
          effects: { money: 0, knowledge: 2, happiness: -5, health: -3 } },
        { text: 'Report to HR',
          effects: { money: 0, knowledge: 1, happiness: -8, health: -3 } },
        { text: 'Let it go and document everything',
          effects: { money: 0, knowledge: 1, happiness: -12, health: -5 } },
        { text: 'Sabotage them subtly', subtext: 'Risky move',
          effects: { money: 0, knowledge: 0, happiness: 2, health: 0 }, careerPenalty: true },
      ]
    },
    {
      id: 'off_happy_hour',
      title: 'Office Happy Hour',
      description: "The team is heading to a bar after work. Team morale needs a boost.",
      options: [
        { text: 'Go and be social',
          effects: { money: -60, knowledge: 0, happiness: 15, health: -3, relationship: { npcType: 'coworker', delta: 12 } } },
        { text: 'Stop by for one drink',
          effects: { money: -20, knowledge: 0, happiness: 8, health: 0, relationship: { npcType: 'coworker', delta: 6 } } },
        { text: 'Skip it — need the rest',
          effects: { money: 0, knowledge: 0, happiness: 2, health: 5 } },
      ]
    },
    {
      id: 'off_promotion',
      title: 'Promotion Opening',
      description: 'A senior position just opened above you. Your manager suggested you apply.',
      requiresKnowledge: 10,
      options: [
        { text: 'Apply aggressively', subtext: 'Full portfolio and presentation',
          effects: { money: 0, knowledge: 2, happiness: 5, health: -5 },
          successChance: 'knowledge', promoteCareer: true },
        { text: 'Submit a simple application',
          effects: { money: 0, knowledge: 1, happiness: 0, health: 0 },
          successChance: 0.35, promoteCareer: true },
        { text: "I'm not ready yet",
          effects: { money: 0, knowledge: 2, happiness: -5, health: 0 } },
      ]
    },
    {
      id: 'off_mentor',
      title: 'Mentoring Opportunity',
      description: 'A junior employee asks if you can mentor them. Takes time but builds your profile.',
      options: [
        { text: 'Take them under your wing',
          effects: { money: 0, knowledge: 3, happiness: 12, health: -3 }, careerBonus: true },
        { text: 'Offer occasional advice only',
          effects: { money: 0, knowledge: 1, happiness: 5, health: 0 } },
        { text: 'Too busy right now',
          effects: { money: 0, knowledge: 0, happiness: -3, health: 0 } },
      ]
    },
    {
      id: 'off_conference',
      title: 'Industry Conference',
      description: 'Your company is sending representatives to a major industry conference.',
      options: [
        { text: 'Volunteer to present your work',
          effects: { money: 0, knowledge: 3, happiness: 5, health: -5 }, careerBonus: true },
        { text: 'Attend and network',
          effects: { money: 0, knowledge: 2, happiness: 8, health: -2, relationship: { npcType: 'professional', delta: 10 } } },
        { text: 'Skip it — stay home',
          effects: { money: 0, knowledge: 0, happiness: 5, health: 5 } },
      ]
    },
  ],

  /* ── PARK / OUTDOORS ── */
  park: [
    {
      id: 'park_walk',
      title: 'Sunday Morning Walk',
      description: 'The park is peaceful. Birds, joggers, and a gentle breeze.',
      options: [
        { text: 'Long peaceful walk + journaling',
          effects: { money: 0, knowledge: 1, happiness: 18, health: 6 } },
        { text: 'Morning jog',
          effects: { money: 0, knowledge: 0, happiness: 10, health: 10 } },
        { text: 'Sit on a bench and think',
          effects: { money: 0, knowledge: 2, happiness: 12, health: 2 } },
      ]
    },
    {
      id: 'park_volunteer',
      title: 'Community Clean-Up',
      description: 'The neighborhood is organizing a park clean-up day.',
      options: [
        { text: 'Join and help out',
          effects: { money: 0, knowledge: 0, happiness: 20, health: 5, relationship: { npcType: 'neighbor', delta: 15 } } },
        { text: 'Donate supplies instead',
          effects: { money: -50, knowledge: 0, happiness: 10, health: 0 } },
        { text: 'Stay home',
          effects: { money: 0, knowledge: 0, happiness: -2, health: 0 } },
      ]
    },
    {
      id: 'park_picnic',
      title: 'Group Picnic Invitation',
      description: "Friends are organizing a weekend picnic in the park.",
      options: [
        { text: 'Go and bring something special',
          effects: { money: -40, knowledge: 0, happiness: 22, health: 5, relationship: { npcType: 'friend', delta: 18 } } },
        { text: 'Show up empty-handed',
          effects: { money: 0, knowledge: 0, happiness: 15, health: 3, relationship: { npcType: 'friend', delta: 8 } } },
        { text: 'Skip it',
          effects: { money: 0, knowledge: 0, happiness: -5, health: 0 } },
      ]
    },
  ],

  /* ── LIBRARY ── */
  library: [
    {
      id: 'lib_study',
      title: 'Deep Study Session',
      description: 'The library is quiet and focused. Perfect for serious learning.',
      options: [
        { text: 'Intensive finance and business study',
          effects: { money: 0, knowledge: 5, happiness: 3, health: -3 } },
        { text: 'General knowledge reading',
          effects: { money: 0, knowledge: 3, happiness: 8, health: 0 } },
        { text: 'Browse casually',
          effects: { money: 0, knowledge: 1, happiness: 5, health: 0 } },
      ]
    },
    {
      id: 'lib_research',
      title: 'Investment Research',
      description: 'Poring over financial reports and market analysis.',
      requiresKnowledge: 6,
      options: [
        { text: 'Deep research on specific companies',
          effects: { money: 0, knowledge: 4, happiness: -2, health: -2 },
          successChance: 'knowledge', successMoney: 800 },
        { text: 'Broad market overview',
          effects: { money: 0, knowledge: 2, happiness: 3, health: 0 } },
        { text: 'Read something non-financial',
          effects: { money: 0, knowledge: 1, happiness: 10, health: 0 } },
      ]
    },
  ],

  /* ── RANDOM / LIFE EVENTS ── */
  random_events: [
    {
      id: 'ev_medical',
      title: 'Health Issue Appears',
      description: "You've been feeling off lately. Something isn't right.",
      options: [
        { text: 'See a doctor immediately',
          effects: { money: -400, knowledge: 0, happiness: -5, health: 20 } },
        { text: 'Get basic medication and rest',
          effects: { money: -80, knowledge: 0, happiness: -8, health: 8 } },
        { text: 'Power through — it\'ll pass',
          effects: { money: 0, knowledge: 0, happiness: -10, health: -15 } },
      ]
    },
    {
      id: 'ev_car',
      title: 'Car Breaks Down',
      description: 'Your car has given up. Repair or replace?',
      options: [
        { text: 'Full repair at the shop',
          effects: { money: -800, knowledge: 0, happiness: -5, health: 0 } },
        { text: 'Fix what you can yourself',
          effects: { money: -200, knowledge: 2, happiness: -8, health: -3 } },
        { text: 'Use public transit for now',
          effects: { money: -100, knowledge: 0, happiness: -10, health: 5 } },
      ]
    },
    {
      id: 'ev_bonus',
      title: 'Unexpected Windfall!',
      description: 'A tax refund, a gift, or a surprise bonus — money appears.',
      options: [
        { text: 'Invest it all',
          effects: { money: 0, knowledge: 1, happiness: 5, health: 0 },
          successChance: 'knowledge', successMoney: 1800, failMoney: 500 },
        { text: 'Save half, spend half',
          effects: { money: 750, knowledge: 0, happiness: 15, health: 0 } },
        { text: 'Treat yourself',
          effects: { money: 500, knowledge: 0, happiness: 25, health: 0 } },
      ]
    },
    {
      id: 'ev_market_crash',
      title: 'Market Crash',
      description: 'Breaking news: the stock market is in freefall. Your portfolio is taking hits.',
      options: [
        { text: 'Panic sell everything',
          effects: { money: -1500, knowledge: 0, happiness: -15, health: -5 } },
        { text: 'Hold steady — don\'t react',
          effects: { money: -300, knowledge: 2, happiness: -10, health: -3 } },
        { text: 'Buy more while prices are low', subtext: 'Risky but smart move',
          requiresKnowledge: 8,
          effects: { money: -1000, knowledge: 3, happiness: -5, health: 0 },
          successChance: 0.7, successMoney: 3000 },
      ]
    },
    {
      id: 'ev_job_offer',
      title: 'Recruiter Reaches Out',
      description: 'A headhunter messaged you about a competitive opportunity at another company.',
      options: [
        { text: 'Interview for the position',
          effects: { money: 0, knowledge: 1, happiness: 8, health: -3 },
          successChance: 'knowledge', careerChange: true },
        { text: 'Engage but don\'t commit yet',
          effects: { money: 0, knowledge: 1, happiness: 5, health: 0 } },
        { text: 'Ignore — I\'m loyal to my current role',
          effects: { money: 0, knowledge: 0, happiness: 2, health: 0 } },
      ]
    },
    {
      id: 'ev_layoff',
      title: 'Company Restructuring',
      description: 'Your company just announced layoffs. Your name is on the list.',
      options: [
        { text: 'Negotiate a severance package',
          effects: { money: 3000, knowledge: 2, happiness: -15, health: -5 }, jobLoss: true },
        { text: 'Fight to keep your position',
          effects: { money: 0, knowledge: 0, happiness: -20, health: -8 },
          successChance: 0.4, jobLoss: false, failJobLoss: true },
        { text: 'Accept it gracefully',
          effects: { money: 1500, knowledge: 0, happiness: -10, health: 0 }, jobLoss: true },
      ]
    },
    {
      id: 'ev_inheritance',
      title: 'Surprise Inheritance',
      description: 'A distant relative has passed away and left you something.',
      options: [
        { text: 'Invest the entire sum wisely',
          effects: { money: 8000, knowledge: 2, happiness: 5, health: 0 } },
        { text: 'Split between savings and lifestyle',
          effects: { money: 8000, knowledge: 0, happiness: 15, health: 0 } },
        { text: 'Donate some to charity',
          effects: { money: 5000, knowledge: 0, happiness: 25, health: 0 } },
      ]
    },
    {
      id: 'ev_health_scare',
      title: 'Health Scare',
      description: "A routine checkup reveals something the doctor wants to monitor closely.",
      options: [
        { text: 'Follow all medical advice rigorously',
          effects: { money: -600, knowledge: 0, happiness: -10, health: 18 } },
        { text: 'Make lifestyle changes naturally',
          effects: { money: 0, knowledge: 1, happiness: -5, health: 10 } },
        { text: 'Ignore the warning',
          effects: { money: 0, knowledge: 0, happiness: 0, health: -20 } },
      ]
    },
    {
      id: 'ev_dangerous',
      title: 'Dangerous Temptation',
      description: 'At a party, someone offers you substances promising a great time.',
      options: [
        { text: 'Decline firmly',
          effects: { money: 0, knowledge: 0, happiness: -3, health: 5 } },
        { text: 'Try it once',
          effects: { money: -200, knowledge: 0, happiness: 10, health: -25 }, dangerRisk: true },
        { text: 'Leave the party',
          effects: { money: 0, knowledge: 0, happiness: -5, health: 3 } },
      ]
    },
  ],

  /* ── RELATIONSHIP ── */
  relationship: [
    {
      id: 'rel_ask_out',
      title: 'Take a Chance',
      description: 'You\'ve built some chemistry with {{npc_name}}. Maybe it\'s time to make a move.',
      trigger: 'npc_interest',
      options: [
        { text: 'Ask them out directly',
          effects: { money: 0, knowledge: 0, happiness: 0, health: 0 },
          successChance: 'stats', relationship: { delta: 25 }, successHappiness: 25, failHappiness: -10 },
        { text: 'Drop hints and see what happens',
          effects: { money: 0, knowledge: 0, happiness: 5, health: 0, relationship: { delta: 8 } } },
        { text: 'Not yet — build more connection',
          effects: { money: 0, knowledge: 0, happiness: 2, health: 0, relationship: { delta: 5 } } },
      ]
    },
    {
      id: 'rel_dinner',
      title: 'Dinner with {{npc_name}}',
      description: 'A nice evening together. How do you make the most of it?',
      trigger: 'has_partner',
      options: [
        { text: 'Splurge on a nice restaurant',
          effects: { money: -120, knowledge: 0, happiness: 20, health: 0, relationship: { delta: 18 } } },
        { text: 'Cook at home — personal touch',
          effects: { money: -20, knowledge: 0, happiness: 22, health: 5, relationship: { delta: 20 } } },
        { text: 'Casual fast food — keep it easy',
          effects: { money: -25, knowledge: 0, happiness: 5, health: -3, relationship: { delta: 3 } } },
      ]
    },
    {
      id: 'rel_conflict',
      title: 'Relationship Tension',
      description: "{{npc_name}} feels like you haven't been present lately. There's distance between you.",
      trigger: 'has_partner',
      options: [
        { text: 'Have an honest conversation',
          effects: { money: 0, knowledge: 0, happiness: -5, health: 0, relationship: { delta: 15 } } },
        { text: 'Apologize and plan something special',
          effects: { money: -80, knowledge: 0, happiness: 8, health: 0, relationship: { delta: 18 } } },
        { text: 'Dismiss it — you\'re fine',
          effects: { money: 0, knowledge: 0, happiness: -5, health: 0, relationship: { delta: -20 } } },
      ]
    },
    {
      id: 'rel_breakup',
      title: 'The Relationship is Strained',
      description: 'Things with {{npc_name}} have deteriorated. A decision looms.',
      trigger: 'has_partner_low_rel',
      options: [
        { text: 'Try to repair things — commit to change',
          effects: { money: 0, knowledge: 0, happiness: -5, health: -3, relationship: { delta: 15 } } },
        { text: 'End it kindly',
          effects: { money: 0, knowledge: 0, happiness: -20, health: 0 }, breakup: true },
        { text: 'End it coldly',
          effects: { money: 0, knowledge: 0, happiness: -10, health: 0 }, breakup: true },
      ]
    },
    {
      id: 'rel_friend_help',
      title: '{{npc_name}} Needs Help',
      description: 'Your friend is going through a rough patch and reaches out.',
      trigger: 'has_friend',
      options: [
        { text: 'Drop everything to help',
          effects: { money: -100, knowledge: 0, happiness: 15, health: -3, relationship: { delta: 25 } } },
        { text: 'Offer advice and emotional support',
          effects: { money: 0, knowledge: 0, happiness: 10, health: 0, relationship: { delta: 15 } } },
        { text: 'I\'m too busy right now',
          effects: { money: 0, knowledge: 0, happiness: -8, health: 0, relationship: { delta: -10 } } },
      ]
    },
  ],
};

/* ─────────────────────────────────────────────────────────
   NPC DEFINITIONS
   ───────────────────────────────────────────────────────── */
const NPC_DATA = [
  {
    id: 'alex',
    name: 'Alex',
    pronouns: 'they/them',
    type: 'coworker',
    location: 'office',
    skinColor: 0xC68642,
    hairColor: 0x2C1A0E,
    hairStyle: 'B',
    outfitColor: 0x37474F,
    personality: 'analytical and dry-witted',
    relationship: 0,
  },
  {
    id: 'jordan',
    name: 'Jordan',
    pronouns: 'she/her',
    type: 'romantic_interest',
    location: 'cafe',
    skinColor: 0xFDDCB5,
    hairColor: 0x6B3A2A,
    hairStyle: 'C',
    outfitColor: 0x9C27B0,
    personality: 'creative and adventurous',
    relationship: 0,
  },
  {
    id: 'sam',
    name: 'Sam',
    pronouns: 'he/him',
    type: 'friend',
    location: 'gym',
    skinColor: 0x8D5524,
    hairColor: 0x2C1A0E,
    hairStyle: 'A',
    outfitColor: 0xE65100,
    personality: 'energetic and loyal',
    relationship: 0,
  },
  {
    id: 'morgan',
    name: 'Morgan',
    pronouns: 'she/her',
    type: 'boss',
    location: 'office',
    skinColor: 0xFDDCB5,
    hairColor: 0xE8E8D0,
    hairStyle: 'B',
    outfitColor: 0x2C3E50,
    personality: 'demanding but fair',
    relationship: 5,
  },
  {
    id: 'riley',
    name: 'Riley',
    pronouns: 'he/him',
    type: 'friend',
    location: 'cafe',
    skinColor: 0xF0C27F,
    hairColor: 0xC49A3C,
    hairStyle: 'A',
    outfitColor: 0x2E7D32,
    personality: 'easygoing and thoughtful',
    relationship: 0,
  },
  {
    id: 'casey',
    name: 'Casey',
    pronouns: 'she/her',
    type: 'neighbor',
    location: 'park',
    skinColor: 0x4A2912,
    hairColor: 0x2C1A0E,
    hairStyle: 'C',
    outfitColor: 0x3B5998,
    personality: 'warm and community-minded',
    relationship: 0,
  },
  {
    id: 'drew',
    name: 'Drew',
    pronouns: 'he/him',
    type: 'business_contact',
    location: 'office',
    skinColor: 0xFDDCB5,
    hairColor: 0x2E4057,
    hairStyle: 'A',
    outfitColor: 0x1B5E20,
    personality: 'ambitious and competitive',
    relationship: 0,
  },
  {
    id: 'parker',
    name: 'Parker',
    pronouns: 'they/them',
    type: 'romantic_interest',
    location: 'gym',
    skinColor: 0xC68642,
    hairColor: 0x8B1A1A,
    hairStyle: 'B',
    outfitColor: 0x6A1B9A,
    personality: 'calm and introspective',
    relationship: 0,
  },
];

/* ─────────────────────────────────────────────────────────
   CAREER DATA
   ───────────────────────────────────────────────────────── */
const CAREER_DATA = [
  // Tier 0 — Entry Level
  {
    id: 'unemployed',
    title: 'Unemployed',
    company: '',
    tier: 0,
    salary: 0,
    requiresKnowledge: 0,
    promotionId: null,
    promotionKnowledge: 0,
    promotionMonths: 0,
  },
  {
    id: 'barista',
    title: 'Barista',
    company: 'City Brew Coffee',
    tier: 1,
    salary: 1800,
    requiresKnowledge: 0,
    promotionId: 'shift_manager',
    promotionKnowledge: 5,
    promotionMonths: 8,
  },
  {
    id: 'sales_rep',
    title: 'Sales Representative',
    company: 'Apex Solutions',
    tier: 1,
    salary: 2400,
    requiresKnowledge: 2,
    promotionId: 'account_manager',
    promotionKnowledge: 8,
    promotionMonths: 12,
  },
  {
    id: 'data_entry',
    title: 'Data Entry Clerk',
    company: 'Global Finance Ltd.',
    tier: 1,
    salary: 2000,
    requiresKnowledge: 1,
    promotionId: 'analyst_junior',
    promotionKnowledge: 7,
    promotionMonths: 10,
  },
  {
    id: 'teaching_assistant',
    title: 'Teaching Assistant',
    company: 'Community College',
    tier: 1,
    salary: 1700,
    requiresKnowledge: 3,
    promotionId: 'teacher',
    promotionKnowledge: 10,
    promotionMonths: 14,
  },

  // Tier 2 — Mid Level
  {
    id: 'shift_manager',
    title: 'Shift Manager',
    company: 'City Brew Coffee',
    tier: 2,
    salary: 2600,
    requiresKnowledge: 5,
    promotionId: 'cafe_manager',
    promotionKnowledge: 10,
    promotionMonths: 14,
  },
  {
    id: 'account_manager',
    title: 'Account Manager',
    company: 'Apex Solutions',
    tier: 2,
    salary: 3800,
    requiresKnowledge: 8,
    promotionId: 'sales_director',
    promotionKnowledge: 15,
    promotionMonths: 18,
  },
  {
    id: 'analyst_junior',
    title: 'Financial Analyst',
    company: 'Global Finance Ltd.',
    tier: 2,
    salary: 3400,
    requiresKnowledge: 7,
    promotionId: 'analyst_senior',
    promotionKnowledge: 13,
    promotionMonths: 16,
  },
  {
    id: 'teacher',
    title: 'Teacher',
    company: 'Riverside School',
    tier: 2,
    salary: 3000,
    requiresKnowledge: 10,
    promotionId: 'dept_head',
    promotionKnowledge: 16,
    promotionMonths: 24,
  },
  {
    id: 'developer_junior',
    title: 'Junior Developer',
    company: 'Tech Forge',
    tier: 2,
    salary: 4000,
    requiresKnowledge: 8,
    promotionId: 'developer_senior',
    promotionKnowledge: 14,
    promotionMonths: 16,
  },

  // Tier 3 — Senior Level
  {
    id: 'cafe_manager',
    title: 'Café Manager',
    company: 'City Brew Coffee',
    tier: 3,
    salary: 3800,
    requiresKnowledge: 10,
    promotionId: 'franchise_owner',
    promotionKnowledge: 18,
    promotionMonths: 24,
  },
  {
    id: 'sales_director',
    title: 'Sales Director',
    company: 'Apex Solutions',
    tier: 3,
    salary: 6000,
    requiresKnowledge: 15,
    promotionId: 'vp_sales',
    promotionKnowledge: 20,
    promotionMonths: 24,
  },
  {
    id: 'analyst_senior',
    title: 'Senior Analyst',
    company: 'Global Finance Ltd.',
    tier: 3,
    salary: 5500,
    requiresKnowledge: 13,
    promotionId: 'finance_manager',
    promotionKnowledge: 18,
    promotionMonths: 20,
  },
  {
    id: 'developer_senior',
    title: 'Senior Developer',
    company: 'Tech Forge',
    tier: 3,
    salary: 6500,
    requiresKnowledge: 14,
    promotionId: 'tech_lead',
    promotionKnowledge: 19,
    promotionMonths: 20,
  },
  {
    id: 'dept_head',
    title: 'Department Head',
    company: 'Riverside School',
    tier: 3,
    salary: 4500,
    requiresKnowledge: 16,
    promotionId: 'principal',
    promotionKnowledge: 20,
    promotionMonths: 30,
  },

  // Tier 4 — Executive
  {
    id: 'franchise_owner',
    title: 'Franchise Owner',
    company: 'City Brew Coffee',
    tier: 4,
    salary: 7000,
    requiresKnowledge: 18,
    promotionId: null,
    promotionKnowledge: 0,
    promotionMonths: 0,
  },
  {
    id: 'vp_sales',
    title: 'VP of Sales',
    company: 'Apex Solutions',
    tier: 4,
    salary: 9500,
    requiresKnowledge: 20,
    promotionId: 'cco',
    promotionKnowledge: 25,
    promotionMonths: 36,
  },
  {
    id: 'finance_manager',
    title: 'Finance Manager',
    company: 'Global Finance Ltd.',
    tier: 4,
    salary: 8000,
    requiresKnowledge: 18,
    promotionId: 'cfo',
    promotionKnowledge: 25,
    promotionMonths: 36,
  },
  {
    id: 'tech_lead',
    title: 'Tech Lead',
    company: 'Tech Forge',
    tier: 4,
    salary: 9000,
    requiresKnowledge: 19,
    promotionId: 'cto',
    promotionKnowledge: 25,
    promotionMonths: 36,
  },
  {
    id: 'principal',
    title: 'Principal',
    company: 'Riverside School',
    tier: 4,
    salary: 6000,
    requiresKnowledge: 20,
    promotionId: null,
    promotionKnowledge: 0,
    promotionMonths: 0,
  },

  // Tier 5 — C-Suite
  {
    id: 'cco',
    title: 'Chief Commercial Officer',
    company: 'Apex Solutions',
    tier: 5,
    salary: 15000,
    requiresKnowledge: 25,
    promotionId: null,
    promotionKnowledge: 0,
    promotionMonths: 0,
  },
  {
    id: 'cfo',
    title: 'Chief Financial Officer',
    company: 'Global Finance Ltd.',
    tier: 5,
    salary: 18000,
    requiresKnowledge: 25,
    promotionId: null,
    promotionKnowledge: 0,
    promotionMonths: 0,
  },
  {
    id: 'cto',
    title: 'Chief Technology Officer',
    company: 'Tech Forge',
    tier: 5,
    salary: 17000,
    requiresKnowledge: 25,
    promotionId: null,
    promotionKnowledge: 0,
    promotionMonths: 0,
  },
];

/* ─────────────────────────────────────────────────────────
   LOCATION DEFINITIONS
   ───────────────────────────────────────────────────────── */
const LOCATION_DATA = {
  home: {
    id: 'home',
    label: 'Home',
    icon: '🏠',
    color: 0x8BC34A,
    triggers: ['home_desk', 'random_events'],
    outfitType: 'casual',
    ambientDesc: 'Your apartment — a reflection of your life so far.',
  },
  office: {
    id: 'office',
    label: 'Office',
    icon: '🏢',
    color: 0x2196F3,
    triggers: ['office', 'relationship'],
    outfitType: 'formal',
    ambientDesc: 'The workplace where your career takes shape.',
    requiresJob: true,
  },
  gym: {
    id: 'gym',
    label: 'Gym',
    icon: '💪',
    color: 0xF44336,
    triggers: ['gym', 'relationship'],
    outfitType: 'athletic',
    ambientDesc: 'The smell of effort and ambition.',
  },
  cafe: {
    id: 'cafe',
    label: 'Café',
    icon: '☕',
    color: 0xFF9800,
    triggers: ['cafe', 'relationship'],
    outfitType: 'casual',
    ambientDesc: 'Coffee, conversation, and endless possibilities.',
  },
  park: {
    id: 'park',
    label: 'Park',
    icon: '🌳',
    color: 0x4CAF50,
    triggers: ['park', 'relationship'],
    outfitType: 'casual',
    ambientDesc: 'Open air and clear thinking.',
  },
  library: {
    id: 'library',
    label: 'Library',
    icon: '📚',
    color: 0x9C27B0,
    triggers: ['library'],
    outfitType: 'casual',
    ambientDesc: 'Knowledge waits patiently on every shelf.',
  },
};

/* ─────────────────────────────────────────────────────────
   ACTION ANIMATIONS DATA
   What plays during the 4-second action overlay
   ───────────────────────────────────────────────────────── */
const ACTION_ANIM_DATA = {
  home_desk: { emoji: '💻', text: 'Working at the desk...' },
  gym:       { emoji: '🏋️', text: 'Breaking a sweat...' },
  cafe:      { emoji: '☕', text: 'At the café...' },
  office:    { emoji: '📊', text: 'In the office...' },
  park:      { emoji: '🌿', text: 'Out in the park...' },
  library:   { emoji: '📖', text: 'Deep in study...' },
  random_events: { emoji: '🌟', text: 'Life happens...' },
  relationship: { emoji: '💕', text: 'Spending time together...' },
};

/* ─────────────────────────────────────────────────────────
   WEATHER TYPES
   ───────────────────────────────────────────────────────── */
const WEATHER_TYPES = ['sunny', 'cloudy', 'rainy', 'overcast', 'sunny', 'sunny'];
