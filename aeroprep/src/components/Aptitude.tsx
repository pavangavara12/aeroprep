import React, { useState, useEffect } from 'react';
import type { UserProgress, QuizQuestion } from '../types';
import { ClockIcon, MindIcon, CheckCircleIcon, AwardIcon, BookOpenIcon, ChevronLeftIcon } from './Icons';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { SectionHero, SideNav, StatTile, ProgressRing, MiniBarChart, DividerLabel } from './Shared';
import type { SideNavItem } from './Shared';
import { SkillIllustration } from './graphics/SkillIllustration';
import { postJson } from '../services/apiClient';

interface AptitudeProps {
  progress: UserProgress;
  onAddScore: (score: number) => void;
  onCompleteLesson: (lessonId: string) => void;
}

export const Aptitude: React.FC<AptitudeProps> = ({ progress, onAddScore, onCompleteLesson }) => {
  const [activeTab, setActiveTab] = useState<'quant' | 'logical' | 'verbal' | 'mocktest'>('quant');
  const [selectedSet, setSelectedSet] = useState<number | null>(null);

  const chunkQuestions = (arr: QuizQuestion[], size: number): QuizQuestion[][] => {
    const chunks: QuizQuestion[][] = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
  };

  const switchDrillTab = (tab: 'quant' | 'logical' | 'verbal' | 'mocktest') => {
    setActiveTab(tab);
    setSelectedSet(null);
  };

  // QUANT DATA
  const quantQuestions: QuizQuestion[] = [
    {
      id: "q-1",
      question: "A and B can complete a project together in 12 days. If A works alone, he can complete it in 20 days. How many days will it take B to complete the project alone?",
      options: ["25 days", "30 days", "35 days", "40 days"],
      correctIndex: 1,
      explanation: "Let the total work be 60 units (LCM of 12 and 20).\n- Combined rate (A + B) = 60 / 12 = 5 units/day.\n- A's individual rate = 60 / 20 = 3 units/day.\n- B's individual rate = 5 - 3 = 2 units/day.\n- Days required for B = Total work / B's rate = 60 / 2 = 30 days."
    },
    {
      id: "q-2",
      question: "A laptop is sold at a 15% discount. If the sale price is $680, what was the original list price of the laptop?",
      options: ["$750", "$800", "$820", "$850"],
      correctIndex: 1,
      explanation: "Sale price represents 100% - 15% = 85% of the original list price.\n- Equation: 0.85 * List Price = $680\n- List Price = $680 / 0.85 = $800."
    },
    {
      id: "q-3",
      question: "The average age of 5 friends is 24 years. A 6th friend joins the group and the new average becomes 25 years. What is the age of the 6th friend?",
      options: ["27 years", "28 years", "29 years", "30 years"],
      correctIndex: 3,
      explanation: "- Total age of 5 friends = 5 x 24 = 120 years.\n- Total age of 6 friends = 6 x 25 = 150 years.\n- Age of 6th friend = 150 - 120 = 30 years."
    },
    {
      id: "q-4",
      question: "A sum invested at simple interest amounts to $1,320 in 2 years and to $1,440 in 4 years. What is the principal sum invested?",
      options: ["$1,000", "$1,100", "$1,200", "$1,250"],
      correctIndex: 2,
      explanation: "- Interest earned between year 2 and year 4 = $1,440 - $1,320 = $120, over 2 years, so annual interest = $60.\n- Interest for the first 2 years = 2 x $60 = $120.\n- Principal = Amount at 2 years - Interest for 2 years = $1,320 - $120 = $1,200."
    },
    {
      id: "q-5",
      question: "Two trains, 150m and 100m long, run on parallel tracks in the same direction at 60 km/h and 42 km/h respectively. How long does the faster train take to completely pass the slower one?",
      options: ["30 seconds", "45 seconds", "50 seconds", "60 seconds"],
      correctIndex: 2,
      explanation: "- Relative speed = 60 - 42 = 18 km/h = 18 x (5/18) = 5 m/s.\n- Total distance to cover = sum of lengths = 150 + 100 = 250 m.\n- Time = Distance / Speed = 250 / 5 = 50 seconds."
    },
    {
      id: "q-6",
      question: "A container has milk and water in the ratio 5:3. After adding 16 litres of water, the ratio becomes 5:7. What was the original quantity of milk in the container?",
      options: ["16 litres", "20 litres", "24 litres", "28 litres"],
      correctIndex: 1,
      explanation: "- Let milk = 5x litres and water = 3x litres.\n- After adding 16L of water: 5x / (3x + 16) = 5/7.\n- Cross-multiply: 35x = 15x + 80, so 20x = 80, giving x = 4.\n- Milk = 5x = 5 x 4 = 20 litres. (Check: water = 12 + 16 = 28, and 20:28 simplifies to 5:7.)"
    },
    {
      id: "q-7",
      question: "A shopkeeper marks up an item by 40% above cost price, then offers a 20% discount on the marked price. What is the shopkeeper's net profit percentage?",
      options: ["8%", "10%", "12%", "15%"],
      correctIndex: 2,
      explanation: "- Let cost price = 100. Marked price = 140.\n- Selling price after 20% discount = 140 x 0.8 = 112.\n- Profit = 112 - 100 = 12, so profit percentage = 12%."
    },
    {
      id: "q-8",
      question: "Pipe A can fill a tank in 6 hours and Pipe B can fill it in 8 hours. If both pipes are opened together but Pipe A is shut off after 2 hours, how long will Pipe B take to fill the remaining tank on its own?",
      options: ["3 hours 20 minutes", "4 hours", "4 hours 40 minutes", "5 hours"],
      correctIndex: 0,
      explanation: "- Rate of A = 1/6 tank/hr, Rate of B = 1/8 tank/hr.\n- In 2 hours together: 2(1/6 + 1/8) = 2(4/24 + 3/24) = 2(7/24) = 7/12 of the tank filled.\n- Remaining work = 1 - 7/12 = 5/12 of the tank.\n- Time for B alone to finish = (5/12) ÷ (1/8) = (5/12) x 8 = 40/12 = 10/3 hours = 3 hours 20 minutes."
    },
    {
      id: "q-9",
      question: "The compound interest on a sum for 2 years at 10% per annum is $2,100. What is the simple interest on the same sum for the same period and rate?",
      options: ["$1,900", "$2,000", "$2,050", "$2,100"],
      correctIndex: 1,
      explanation: "- Let principal = P. CI for 2 years at 10% = P[(1.1)^2 - 1] = P(0.21) = 2100, so P = 10,000.\n- Simple Interest = (P x R x T)/100 = (10000 x 10 x 2)/100 = $2,000."
    },
    {
      id: "q-10",
      question: "A boat travels 30 km downstream in 2 hours and returns upstream in 3 hours. What is the speed of the boat in still water?",
      options: ["10 km/h", "12.5 km/h", "15 km/h", "17.5 km/h"],
      correctIndex: 1,
      explanation: "- Downstream speed = 30/2 = 15 km/h. Upstream speed = 30/3 = 10 km/h.\n- Speed of boat in still water = (Downstream + Upstream)/2 = (15+10)/2 = 12.5 km/h."
    },
    {
      id: "q-11",
      question: "In how many ways can the letters of the word 'MANAGE' be arranged so that all vowels always come together?",
      options: ["72", "120", "144", "240"],
      correctIndex: 0,
      explanation: "- MANAGE has 6 letters: M, A, N, A, G, E — the vowels are A, A, E and the consonants are M, N, G.\n- Treat the vowel block (A, A, E) as a single unit. This gives 4 units to arrange: M, N, G, [block].\n- Arrangements of these 4 distinct units = 4! = 24.\n- Arrangements within the vowel block = 3!/2! = 3 (dividing by 2! since 'A' repeats).\n- Total arrangements = 24 x 3 = 72."
    },
    {
      id: "q-12",
      question: "A and B invest $8,000 and $12,000 respectively in a business. After 6 months, C joins with $16,000. If the total profit at the end of the year is $21,000, what is C's share?",
      options: ["$4,800", "$5,600", "$6,000", "$6,400"],
      correctIndex: 2,
      explanation: "- A's investment x time = 8,000 x 12 = 96,000.\n- B's investment x time = 12,000 x 12 = 144,000.\n- C's investment x time = 16,000 x 6 = 96,000 (C joined after 6 months, so only invested for 6 of the 12 months).\n- Ratio A:B:C = 96,000 : 144,000 : 96,000 = 2 : 3 : 2, total parts = 7.\n- C's share = (2/7) x 21,000 = $6,000."
    },
    {
      id: "q-13",
      question: "In a survey of 72 students, 40% responded positively. How many students responded positively?",
      options: ["25", "31", "35", "28"],
      correctIndex: 3,
      explanation: "- 40% of 72 = (40/100) x 72 = 28.\n- So 28 students responded positively."
    },
    {
      id: "q-14",
      question: "In a survey of 85 voters, 20% responded positively. How many voters responded positively?",
      options: ["25", "13", "17", "21"],
      correctIndex: 2,
      explanation: "- 20% of 85 = (20/100) x 85 = 17.\n- So 17 voters responded positively."
    },
    {
      id: "q-15",
      question: "In a survey of 150 employees, 60% responded positively. How many employees responded positively?",
      options: ["97", "105", "83", "90"],
      correctIndex: 3,
      explanation: "- 60% of 150 = (60/100) x 150 = 90.\n- So 90 employees responded positively."
    },
    {
      id: "q-16",
      question: "In a survey of 240 members, 25% responded positively. How many members responded positively?",
      options: ["72", "48", "60", "84"],
      correctIndex: 2,
      explanation: "- 25% of 240 = (25/100) x 240 = 60.\n- So 60 members responded positively."
    },
    {
      id: "q-17",
      question: "A retailer buys an item for $500 and sells it at a 20% profit. What is the selling price?",
      options: ["$625", "$580", "$650", "$600"],
      correctIndex: 3,
      explanation: "- Cost price = $500, profit = 20% of 500 = $100.\n- Selling price = $500 + $100 = $600."
    },
    {
      id: "q-18",
      question: "A retailer buys an item for $800 and sells it at a 15% loss. What is the selling price?",
      options: ["$720", "$760", "$648", "$680"],
      correctIndex: 3,
      explanation: "- Cost price = $800, loss = 15% of 800 = $120.\n- Selling price = $800 - $120 = $680."
    },
    {
      id: "q-19",
      question: "A retailer buys an item for $1200 and sells it at a 25% profit. What is the selling price?",
      options: ["$1452", "$1560", "$1500", "$1620"],
      correctIndex: 2,
      explanation: "- Cost price = $1200, profit = 25% of 1200 = $300.\n- Selling price = $1200 + $300 = $1500."
    },
    {
      id: "q-20",
      question: "A retailer buys an item for $960 and sells it at a 10% loss. What is the selling price?",
      options: ["$912", "$960", "$864", "$826"],
      correctIndex: 2,
      explanation: "- Cost price = $960, loss = 10% of 960 = $96.\n- Selling price = $960 - $96 = $864."
    },
    {
      id: "q-21",
      question: "Find the simple interest on a principal of $4000 at 5% per annum for 3 years.",
      options: ["$600", "$550", "$680", "$733"],
      correctIndex: 0,
      explanation: "- Simple Interest = (P x R x T) / 100 = (4000 x 5 x 3) / 100 = $600."
    },
    {
      id: "q-22",
      question: "Find the simple interest on a principal of $6000 at 8% per annum for 2 years.",
      options: ["$885", "$1160", "$960", "$1080"],
      correctIndex: 2,
      explanation: "- Simple Interest = (P x R x T) / 100 = (6000 x 8 x 2) / 100 = $960."
    },
    {
      id: "q-23",
      question: "Find the simple interest on a principal of $5000 at 6% per annum for 4 years.",
      options: ["$1138", "$1300", "$1366", "$1200"],
      correctIndex: 3,
      explanation: "- Simple Interest = (P x R x T) / 100 = (5000 x 6 x 4) / 100 = $1200."
    },
    {
      id: "q-24",
      question: "Find the simple interest on a principal of $10000 at 7% per annum for 2 years.",
      options: ["$1733", "$1275", "$1600", "$1400"],
      correctIndex: 3,
      explanation: "- Simple Interest = (P x R x T) / 100 = (10000 x 7 x 2) / 100 = $1400."
    },
    {
      id: "q-25",
      question: "Find the average of the following test scores: 12, 15, 18, 21, 24.",
      options: ["23", "20", "18", "15"],
      correctIndex: 2,
      explanation: "- Sum = 12 + 15 + 18 + 21 + 24 = 90.\n- Count = 5.\n- Average = 90/5 = 18."
    },
    {
      id: "q-26",
      question: "Find the average of the following ages in years: 45, 52, 38, 61, 49.",
      options: ["46", "54", "51", "49"],
      correctIndex: 3,
      explanation: "- Sum = 45 + 52 + 38 + 61 + 49 = 245.\n- Count = 5.\n- Average = 245/5 = 49."
    },
    {
      id: "q-27",
      question: "Find the average of the following daily sales in dollars: 200, 250, 175, 225, 300.",
      options: ["230", "232", "235", "227"],
      correctIndex: 0,
      explanation: "- Sum = 200 + 250 + 175 + 225 + 300 = 1150.\n- Count = 5.\n- Average = 1150/5 = 230."
    },
    {
      id: "q-28",
      question: "Find the average of the following hours worked: 8, 10, 14, 9, 12, 7.",
      options: ["15", "10", "7", "12"],
      correctIndex: 1,
      explanation: "- Sum = 8 + 10 + 14 + 9 + 12 + 7 = 60.\n- Count = 6.\n- Average = 60/6 = 10."
    },
    {
      id: "q-29",
      question: "A train covers a distance of 300 km at a certain speed. If the speed is increased by 5 km/h, the time taken reduces by 2 hours. Find the original speed of the train.",
      options: ["20 km/h", "25 km/h", "30 km/h", "35 km/h"],
      correctIndex: 1,
      explanation: "- Let original speed = s km/h. Time at original speed = 300/s hours; time at (s+5) = 300/(s+5) hours.\n- Given: 300/s - 300/(s+5) = 2.\n- Multiplying through: 300(s+5) - 300s = 2s(s+5), so 1500 = 2s^2 + 10s.\n- This gives s^2 + 5s - 750 = 0. Solving: s = (-5 + sqrt(25+3000))/2 = (-5+55)/2 = 25.\n- Original speed = 25 km/h."
    },
    {
      id: "q-30",
      question: "Two cars start from the same point and travel in opposite directions. Car A travels at 60 km/h and Car B at 80 km/h. After how many hours will they be 350 km apart?",
      options: ["2 hours", "2.5 hours", "3 hours", "3.5 hours"],
      correctIndex: 1,
      explanation: "- Relative speed (opposite directions) = 60 + 80 = 140 km/h.\n- Time = Distance / Relative Speed = 350 / 140 = 2.5 hours."
    },
    {
      id: "q-31",
      question: "A can complete a task in 12 days and B can complete the same task in 18 days. If they work together, how many days will they take to finish the task?",
      options: ["7.2 days", "7.5 days", "8 days", "9 days"],
      correctIndex: 0,
      explanation: "- A's rate = 1/12 per day, B's rate = 1/18 per day.\n- Combined rate = 1/12 + 1/18 = 3/36 + 2/36 = 5/36 per day.\n- Time together = 36/5 = 7.2 days."
    },
    {
      id: "q-32",
      question: "15 workers can complete a construction job in 20 days. How many workers are needed to complete the same job in 12 days?",
      options: ["20 workers", "22 workers", "25 workers", "30 workers"],
      correctIndex: 2,
      explanation: "- Total work = 15 x 20 = 300 worker-days.\n- Workers needed for 12 days = 300 / 12 = 25 workers."
    },
    {
      id: "q-33",
      question: "The ratio of ages of A and B is 3:5. After 6 years, the ratio becomes 2:3. What is A's current age?",
      options: ["12 years", "15 years", "18 years", "20 years"],
      correctIndex: 2,
      explanation: "- Let A = 3x, B = 5x.\n- After 6 years: (3x+6)/(5x+6) = 2/3.\n- Cross-multiply: 3(3x+6) = 2(5x+6), so 9x + 18 = 10x + 12, giving x = 6.\n- A's current age = 3x = 18 years."
    },
    {
      id: "q-34",
      question: "A mixture contains milk and water in the ratio 4:1. If 5 litres of water is added, the ratio becomes 2:1. What was the original quantity of milk?",
      options: ["20 litres", "24 litres", "28 litres", "32 litres"],
      correctIndex: 0,
      explanation: "- Let milk = 4x litres and water = x litres.\n- After adding 5L of water: 4x / (x+5) = 2/1.\n- Cross-multiply: 4x = 2x + 10, so 2x = 10, giving x = 5.\n- Milk = 4x = 20 litres. (Check: water = 5+5 = 10, and 20:10 simplifies to 2:1.)"
    },
  ];

  // LOGICAL DATA
  const logicalQuestions: QuizQuestion[] = [
    {
      id: "l-1",
      question: "Pointing to a photograph, Robert says: 'She is the daughter of my grandfather's only son.' How is the lady in the photograph related to Robert?",
      options: ["Mother", "Aunt", "Sister", "Cousin"],
      correctIndex: 2,
      explanation: "- 'Grandpointer's only son' refers to Robert's father (since Robert's grandfather has only one son).\n- 'Daughter of my father' refers to Robert's sister.\n- Therefore, the lady is Robert's Sister."
    },
    {
      id: "l-2",
      question: "In a certain code, every letter of a word is shifted forward by 1 place in the alphabet (A becomes B, B becomes C, and so on). If this rule is applied, how would 'SHIELD' be coded?",
      options: ["TIJFME", "THJELD", "TJJFME", "TIKEME"],
      correctIndex: 0,
      explanation: "Shift each letter forward by exactly one place:\n- S -> T\n- H -> I\n- I -> J\n- E -> F\n- L -> M\n- D -> E\nCombining these gives 'TIJFME'."
    },
    {
      id: "l-3",
      question: "Complete the number series: 3, 8, 15, 24, 35, ?",
      options: ["46", "48", "50", "44"],
      correctIndex: 1,
      explanation: "Look at the differences between consecutive terms: 8-3=5, 15-8=7, 24-15=9, 35-24=11. The differences increase by 2 each time (5, 7, 9, 11, so next is 13).\n- Next term = 35 + 13 = 48."
    },
    {
      id: "l-4",
      question: "If 'TABLE' is coded as 20-1-2-12-5 using each letter's position in the alphabet, how would 'CHAIR' be coded the same way?",
      options: ["3-8-1-9-18", "3-8-1-9-19", "3-9-1-8-18", "4-8-1-9-18"],
      correctIndex: 0,
      explanation: "Map each letter of CHAIR to its position in the alphabet:\n- C = 3, H = 8, A = 1, I = 9, R = 18.\n- This gives '3-8-1-9-18'."
    },
    {
      id: "l-5",
      question: "Five colleagues sit in a row facing north: Priya is to the right of Aman but to the left of Sunil. Rekha is to the right of Sunil, and Vikram sits at one of the ends, to the left of Aman. What is the correct seating order from left to right?",
      options: [
        "Vikram, Aman, Priya, Sunil, Rekha",
        "Aman, Vikram, Priya, Sunil, Rekha",
        "Vikram, Priya, Aman, Sunil, Rekha",
        "Rekha, Sunil, Priya, Aman, Vikram"
      ],
      correctIndex: 0,
      explanation: "- Vikram sits at an end, to the left of Aman, so Vikram is first: Vikram, Aman, ...\n- Priya is right of Aman but left of Sunil: Vikram, Aman, Priya, Sunil, ...\n- Rekha is right of Sunil: Vikram, Aman, Priya, Sunil, Rekha."
    },
    {
      id: "l-6",
      question: "Statement: All engineers at the firm are certified in cloud architecture. Rohan is a certified cloud architect. Conclusion: Rohan is an engineer at the firm. Is this conclusion logically valid?",
      options: [
        "Valid — the conclusion follows directly.",
        "Invalid — certification alone doesn't confirm he works at the firm.",
        "Valid — only firm engineers can be certified.",
        "Cannot be determined from the given information without knowing his job title."
      ],
      correctIndex: 1,
      explanation: "The statement only tells us that engineers at the firm are certified (Engineer → Certified). It does not say that everyone who is certified must be an engineer at the firm (it doesn't establish Certified → Engineer). This is the classic 'affirming the consequent' logical fallacy, so the conclusion is invalid."
    },
    {
      id: "l-7",
      question: "In a certain code language, 'PLAN' is written as 'QMBO' and 'TREE' is written as 'USFF'. How would 'STAR' be written in the same code?",
      options: ["TUBS", "TUCS", "TUBT", "TVBS"],
      correctIndex: 0,
      explanation: "Each letter is shifted forward by 1 in the alphabet (P→Q, L→M, A→B, N→O; T→U, R→S, E→F, E→F).\n- Applying the same rule to 'STAR': S→T, T→U, A→B, R→S.\n- This gives 'TUBS'."
    },
    {
      id: "l-8",
      question: "Complete the analogy: 'Doctor is to Hospital as Teacher is to ____'",
      options: ["Blackboard", "School", "Student", "Book"],
      correctIndex: 1,
      explanation: "A Doctor's primary place of work is a Hospital. Following the same relationship (person to their primary workplace), a Teacher's primary place of work is a School."
    },
    {
      id: "l-9",
      question: "Four friends — Ajay, Bala, Chetan, and Deepak — are standing in a queue. Ajay is not at either end. Bala is immediately in front of Chetan. Deepak is at the front of the queue. What is the correct order from front to back?",
      options: [
        "Deepak, Bala, Chetan, Ajay",
        "Deepak, Ajay, Bala, Chetan",
        "Deepak, Bala, Ajay, Chetan",
        "Bala, Chetan, Deepak, Ajay"
      ],
      correctIndex: 1,
      explanation: "- Deepak is at the front: Deepak, _, _, _.\n- Ajay is not at either end, so Ajay must be in position 2 or 3.\n- Bala is immediately in front of Chetan (Bala, Chetan consecutive, Bala first).\n- The only arrangement satisfying all conditions is: Deepak, Ajay, Bala, Chetan."
    },
    {
      id: "l-10",
      question: "Statement: 'Some managers are engineers. All engineers are graduates.' Which conclusion definitely follows?",
      options: [
        "All managers are graduates.",
        "Some managers are graduates.",
        "No managers are graduates.",
        "All graduates are managers."
      ],
      correctIndex: 1,
      explanation: "Since some managers are engineers, and all engineers are graduates, that same subset of managers (the ones who are engineers) must also be graduates. This only guarantees 'Some managers are graduates' — not that ALL managers are graduates, since the statement only confirms 'some' managers are engineers."
    },
    {
      id: "l-11",
      question: "Look at this series: 2, 6, 12, 20, 30, ? What number should come next?",
      options: ["40", "42", "44", "46"],
      correctIndex: 1,
      explanation: "Each term is n(n+1): 1x2=2, 2x3=6, 3x4=12, 4x5=20, 5x6=30, so the next term is 6x7 = 42."
    },
    {
      id: "l-12",
      question: "A is the brother of B. C is the mother of A. D is the father of C. How is B related to D?",
      options: ["Grandson/Granddaughter", "Son", "Nephew", "Uncle"],
      correctIndex: 0,
      explanation: "- C is the mother of A, and A is B's brother, so C is also B's mother.\n- D is the father of C, meaning D is C's father, i.e. B's grandfather.\n- Therefore B is D's grandson or granddaughter."
    },
    {
      id: "l-13",
      question: "Look at this series: 5, 9, 13, 17, 21, ? What number should come next?",
      options: ["21", "25", "27", "31"],
      correctIndex: 1,
      explanation: "- Each term increases by 4.\n- Following this pattern, the next term is 25."
    },
    {
      id: "l-14",
      question: "Look at this series: 100, 93, 86, 79, 72, ? What number should come next?",
      options: ["71", "65", "53", "83"],
      correctIndex: 1,
      explanation: "- Each term decreases by 7.\n- Following this pattern, the next term is 65."
    },
    {
      id: "l-15",
      question: "Look at this series: 1, 1, 2, 3, 5, ? What number should come next?",
      options: ["9", "11", "6", "8"],
      correctIndex: 3,
      explanation: "- Each term is the sum of the two preceding terms (Fibonacci pattern).\n- Following this pattern, the next term is 8."
    },
    {
      id: "l-16",
      question: "Look at this series: 3, 9, 27, ? What number should come next?",
      options: ["105", "81", "89", "65"],
      correctIndex: 1,
      explanation: "- Each term is multiplied by 3.\n- Following this pattern, the next term is 81."
    },
    {
      id: "l-17",
      question: "In a certain code, 'TIGER' is written as 'VKIGT'. How would 'MONEY' be written in the same code?",
      options: ["OQPGA", "NPOFZ", "PRQHB", "AGPQO"],
      correctIndex: 0,
      explanation: "- Each letter is shifted forward by 2 place(s) in the alphabet (e.g. T->V).\n- Applying the same shift to 'MONEY' letter by letter gives 'OQPGA'."
    },
    {
      id: "l-18",
      question: "In a certain code, 'TIGER' is written as 'WLJHU'. How would 'WATER' be written in the same code?",
      options: ["YCVGT", "UHWDZ", "ZDWHU", "AEXIV"],
      correctIndex: 2,
      explanation: "- Each letter is shifted forward by 3 place(s) in the alphabet (e.g. T->W).\n- Applying the same shift to 'WATER' letter by letter gives 'ZDWHU'."
    },
    {
      id: "l-19",
      question: "In a certain code, 'TIGER' is written as 'UJHFS'. How would 'CHAIR' be written in the same code?",
      options: ["EJCKT", "SJBID", "FKDLU", "DIBJS"],
      correctIndex: 3,
      explanation: "- Each letter is shifted forward by 1 place(s) in the alphabet (e.g. T->U).\n- Applying the same shift to 'CHAIR' letter by letter gives 'DIBJS'."
    },
    {
      id: "l-20",
      question: "In a certain code, 'TIGER' is written as 'XMKIV'. How would 'APPLE' be written in the same code?",
      options: ["DSSOH", "ETTPI", "IPTTE", "FUUQJ"],
      correctIndex: 1,
      explanation: "- Each letter is shifted forward by 4 place(s) in the alphabet (e.g. T->X).\n- Applying the same shift to 'APPLE' letter by letter gives 'ETTPI'."
    },
    {
      id: "l-21",
      question: "Pointing to a photograph, Rani said, 'This man's son is my father's brother's son.' How is the man in the photograph related to Rani?",
      options: ["Uncle", "Grandfather", "Father", "Cousin's father"],
      correctIndex: 3,
      explanation: "- 'My father's brother's son' is Rani's cousin.\n- The man's son is Rani's cousin, so the man is the father of Rani's cousin — i.e., the man is Rani's uncle (her father's brother).\n- Since the man is described as the father of the cousin, the most precise relation to Rani is that he is her uncle, described here as the 'cousin's father'."
    },
    {
      id: "l-22",
      question: "A introduced B saying, 'She is the daughter of my grandfather's only son.' How is B related to A?",
      options: ["Sister", "Mother", "Cousin", "Aunt"],
      correctIndex: 0,
      explanation: "- A's grandfather's only son must be A's father (since it's the only son).\n- B is the daughter of A's father, which makes B the sister of A."
    },
    {
      id: "l-23",
      question: "Pointing to a man, a woman said, 'His mother is the only daughter of my mother.' How is the woman related to the man?",
      options: ["Sister", "Mother", "Aunt", "Grandmother"],
      correctIndex: 1,
      explanation: "- 'The only daughter of my mother' means the woman herself (since she is her mother's only daughter).\n- So the man's mother is the woman herself, making the woman the man's mother."
    },
    {
      id: "l-24",
      question: "P is the brother of Q. R is the mother of P. S is the father of R. How is Q related to S?",
      options: ["Son", "Grandson/Granddaughter", "Daughter", "Nephew"],
      correctIndex: 1,
      explanation: "- R is P's mother, and Q is P's sibling, so R is also Q's mother.\n- S is R's father, meaning S is Q's grandfather.\n- Therefore Q is S's grandson or granddaughter."
    },
    {
      id: "l-25",
      question: "Introducing a man, a woman said, 'His wife is the only daughter of my father.' How is the woman related to the man?",
      options: ["Sister", "Wife", "Mother", "Daughter"],
      correctIndex: 1,
      explanation: "- 'The only daughter of my father' refers to the woman herself (since she is her father's only daughter).\n- The man's wife is the woman herself, so the woman is the man's wife."
    },
    {
      id: "l-26",
      question: "A is B's sister. C is B's mother. D is C's father. E is D's mother. How is A related to D?",
      options: ["Grandson", "Granddaughter", "Daughter", "Niece"],
      correctIndex: 1,
      explanation: "- C is B's mother, and A is B's sister, so C is also A's mother.\n- D is C's father, meaning D is A's grandfather.\n- Therefore A is D's granddaughter."
    },
    {
      id: "l-27",
      question: "Statements: 'All pens are pencils. All pencils are erasers.' Conclusion: 'All pens are erasers.' Is this conclusion valid?",
      options: ["Valid", "Invalid", "Cannot be determined", "Only partially valid"],
      correctIndex: 0,
      explanation: "- All pens are pencils (Pens ⊆ Pencils), and all pencils are erasers (Pencils ⊆ Erasers).\n- By transitivity, all pens must be erasers. The conclusion logically follows, so it is valid."
    },
    {
      id: "l-28",
      question: "Statements: 'Some doctors are teachers. All teachers are readers.' Conclusion: 'All doctors are readers.' Is this conclusion valid?",
      options: ["Valid", "Invalid", "Cannot be determined", "Only partially valid"],
      correctIndex: 1,
      explanation: "- Only 'some' doctors are teachers, not all. So we can only conclude that some doctors (the ones who are teachers) are readers.\n- The conclusion claims ALL doctors are readers, which is a stronger claim than the statements support, so it is invalid."
    },
    {
      id: "l-29",
      question: "Statements: 'No cats are dogs. All dogs are animals.' Conclusion: 'Some animals are not cats.' Is this conclusion valid?",
      options: ["Valid", "Invalid", "Cannot be determined", "Only partially valid"],
      correctIndex: 0,
      explanation: "- All dogs are animals, and no cats are dogs, meaning dogs and cats are entirely separate groups.\n- Since dogs are animals and dogs are not cats, at least some animals (the dogs) are not cats. The conclusion is valid."
    },
    {
      id: "l-30",
      question: "Statements: 'All squares are rectangles. Some rectangles are red.' Conclusion: 'Some squares are red.' Is this conclusion valid?",
      options: ["Valid", "Invalid", "Cannot be determined", "Only partially valid"],
      correctIndex: 2,
      explanation: "- All squares are rectangles, but only 'some' rectangles are red — and we don't know whether the red rectangles overlap with the square group.\n- The red rectangles could be entirely non-square ones, so we cannot definitively conclude that some squares are red. It cannot be determined."
    },
    {
      id: "l-31",
      question: "Statements: 'All employees at the firm attended the training. Ravi attended the training.' Conclusion: 'Ravi is an employee at the firm.'",
      options: ["Valid", "Invalid", "Cannot be determined", "Only partially valid"],
      correctIndex: 1,
      explanation: "- The statement tells us Employee → Attended Training, not the reverse.\n- Ravi attending the training does not confirm he is an employee — outside visitors could also have attended. This is the 'affirming the consequent' fallacy, so the conclusion is invalid."
    },
    {
      id: "l-32",
      question: "Statements: 'All athletes are disciplined. Meera is disciplined.' Conclusion: 'Meera is an athlete.'",
      options: ["Valid", "Invalid", "Cannot be determined", "Only partially valid"],
      correctIndex: 1,
      explanation: "- The statement establishes Athlete → Disciplined, but does not establish that everyone disciplined is an athlete.\n- Meera being disciplined doesn't confirm she's an athlete; she could be disciplined for other reasons. The conclusion is invalid."
    },
    {
      id: "l-33",
      question: "Statements: 'Some managers are analysts. All analysts are detail-oriented.' Conclusion: 'Some managers are detail-oriented.'",
      options: ["Valid", "Invalid", "Cannot be determined", "Only partially valid"],
      correctIndex: 0,
      explanation: "- Some managers are analysts, and all analysts are detail-oriented.\n- That subset of managers (who are analysts) must therefore be detail-oriented, confirming that at least some managers are detail-oriented. The conclusion is valid."
    },
  ];

  // VERBAL DATA
  const verbalQuestions: QuizQuestion[] = [
    {
      id: "v-1",
      question: "Select the word that is closest in meaning (synonym) to: 'PRAGMATIC'",
      options: ["Theoretical", "Idealistic", "Practical", "Arrogant"],
      correctIndex: 2,
      explanation: "'Pragmatic' means dealing with things sensibly and realistically in a way that is based on practical rather than theoretical considerations."
    },
    {
      id: "v-2",
      question: "Complete the sentence: 'Despite facing multiple technical obstacles, the team ______ to deliver the alpha build on time.'",
      options: ["neglected", "managed", "postponed", "hesitated"],
      correctIndex: 1,
      explanation: "'Despite' indicates a contrast. Facing obstacles would normally delay work, so managing to deliver on time is the correct logical completion."
    },
    {
      id: "v-3",
      question: "Select the word that is closest in meaning (synonym) to: 'METICULOUS'",
      options: ["Careless", "Thorough", "Hasty", "Indifferent"],
      correctIndex: 1,
      explanation: "'Meticulous' means showing great attention to detail and being very careful and precise, which is closest to 'thorough'."
    },
    {
      id: "v-4",
      question: "Choose the word that is most nearly OPPOSITE in meaning to: 'CANDID'",
      options: ["Honest", "Blunt", "Evasive", "Direct"],
      correctIndex: 2,
      explanation: "'Candid' means truthful and straightforward. Its opposite is 'evasive', meaning tending to avoid giving direct answers."
    },
    {
      id: "v-5",
      question: "Fill in the blank with the most appropriate word: 'The manager's feedback was so ______ that no one was sure whether the project had succeeded or failed.'",
      options: ["ambiguous", "transparent", "conclusive", "articulate"],
      correctIndex: 0,
      explanation: "The sentence describes confusion about the outcome, which matches 'ambiguous' (open to more than one interpretation)."
    },
    {
      id: "v-6",
      question: "Identify the correctly punctuated sentence.",
      options: [
        "Its important that every candidate submit's their resume before Friday.",
        "It's important that every candidate submits their resume before Friday.",
        "Its' important, that every candidate submit their resume before Friday.",
        "It is important that every candidate, submits, their resume before Friday."
      ],
      correctIndex: 1,
      explanation: "'It's' is the correct contraction for 'it is', and 'submits' (not 'submit's') is the correct verb form agreeing with 'every candidate'. No unnecessary commas are needed in this sentence."
    },
    {
      id: "v-7",
      question: "Select the word that is closest in meaning (synonym) to: 'AUTONOMOUS'",
      options: ["Dependent", "Self-governing", "Chaotic", "Supervised"],
      correctIndex: 1,
      explanation: "'Autonomous' means having the freedom to govern itself or act independently, which is closest in meaning to 'self-governing'."
    },
    {
      id: "v-8",
      question: "Choose the word that is most nearly OPPOSITE in meaning to: 'CONCISE'",
      options: ["Brief", "Verbose", "Clear", "Precise"],
      correctIndex: 1,
      explanation: "'Concise' means giving information clearly in a few words. Its opposite is 'verbose', meaning using far more words than necessary."
    },
    {
      id: "v-9",
      question: "Complete the sentence: 'The new intern was ______ about asking questions, worried it might make her look inexperienced.'",
      options: ["eager", "hesitant", "enthusiastic", "vocal"],
      correctIndex: 1,
      explanation: "The phrase 'worried it might make her look inexperienced' signals reluctance, which matches 'hesitant' (showing uncertainty or reluctance)."
    },
    {
      id: "v-10",
      question: "Identify the sentence with correct subject-verb agreement.",
      options: [
        "Each of the candidates were asked to submit their portfolio.",
        "Each of the candidates was asked to submit their portfolio.",
        "Each of the candidates have been asked to submit their portfolio.",
        "Each of the candidates are asked to submit their portfolio."
      ],
      correctIndex: 1,
      explanation: "'Each' is singular, so it takes a singular verb — 'was', not 'were/are/have been'. 'Each of the candidates was asked...' is grammatically correct."
    },
    {
      id: "v-11",
      question: "Select the word that is closest in meaning (synonym) to: 'RETICENT'",
      options: ["Talkative", "Reserved", "Confident", "Curious"],
      correctIndex: 1,
      explanation: "'Reticent' describes someone not revealing their thoughts or feelings readily — closest in meaning to 'reserved'."
    },
    {
      id: "v-12",
      question: "Fill in the blank with the most appropriate word: 'The company's new policy was met with ______ from employees who felt it was implemented without consultation.'",
      options: ["enthusiasm", "resistance", "indifference", "gratitude"],
      correctIndex: 1,
      explanation: "The clause 'felt it was implemented without consultation' implies employees pushed back, matching 'resistance' (opposition to something)."
    },
    {
      id: "v-13",
      question: "Choose the word closest in meaning to 'METICULOUS'.",
      options: ["Careless", "Very careful and precise", "Fast-paced", "Confused"],
      correctIndex: 1,
      explanation: "'METICULOUS' means 'very careful and precise', making that the correct choice."
    },
    {
      id: "v-14",
      question: "Choose the word closest in meaning to 'BENEVOLENT'.",
      options: ["Kind and generous", "Hostile", "Indifferent", "Arrogant"],
      correctIndex: 0,
      explanation: "'BENEVOLENT' means 'kind and generous', making that the correct choice."
    },
    {
      id: "v-15",
      question: "Choose the word closest in meaning to 'PRAGMATIC'.",
      options: ["Idealistic", "Practical and realistic", "Emotional", "Careless"],
      correctIndex: 1,
      explanation: "'PRAGMATIC' means 'practical and realistic', making that the correct choice."
    },
    {
      id: "v-16",
      question: "Choose the word closest in meaning to 'CANDID'.",
      options: ["Secretive", "Honest and direct", "Confusing", "Formal"],
      correctIndex: 1,
      explanation: "'CANDID' means 'honest and direct', making that the correct choice."
    },
    {
      id: "v-17",
      question: "Choose the word closest in meaning to 'TENACIOUS'.",
      options: ["Persistent and determined", "Easily discouraged", "Lazy", "Forgetful"],
      correctIndex: 0,
      explanation: "'TENACIOUS' means 'persistent and determined', making that the correct choice."
    },
    {
      id: "v-18",
      question: "Choose the word closest in meaning to 'PRUDENT'.",
      options: ["Reckless", "Sensible and cautious", "Aggressive", "Talkative"],
      correctIndex: 1,
      explanation: "'PRUDENT' means 'sensible and cautious', making that the correct choice."
    },
    {
      id: "v-19",
      question: "Choose the word most nearly OPPOSITE in meaning to 'ABUNDANT'.",
      options: ["Plentiful", "Scarce", "Excessive", "Generous"],
      correctIndex: 1,
      explanation: "'ABUNDANT' means the opposite of 'scarce', so 'Scarce' is the correct antonym."
    },
    {
      id: "v-20",
      question: "Choose the word most nearly OPPOSITE in meaning to 'TRANSPARENT'.",
      options: ["Clear", "Visible", "Opaque", "Honest"],
      correctIndex: 2,
      explanation: "'TRANSPARENT' means the opposite of 'opaque', so 'Opaque' is the correct antonym."
    },
    {
      id: "v-21",
      question: "Choose the word most nearly OPPOSITE in meaning to 'VOLUNTARY'.",
      options: ["Optional", "Willing", "Compulsory", "Free"],
      correctIndex: 2,
      explanation: "'VOLUNTARY' means the opposite of 'compulsory', so 'Compulsory' is the correct antonym."
    },
    {
      id: "v-22",
      question: "Choose the word most nearly OPPOSITE in meaning to 'EXPAND'.",
      options: ["Grow", "Increase", "Contract", "Extend"],
      correctIndex: 2,
      explanation: "'EXPAND' means the opposite of 'contract', so 'Contract' is the correct antonym."
    },
    {
      id: "v-23",
      question: "Choose the word most nearly OPPOSITE in meaning to 'GENUINE'.",
      options: ["Authentic", "Real", "Fake", "Sincere"],
      correctIndex: 2,
      explanation: "'GENUINE' means the opposite of 'fake', so 'Fake' is the correct antonym."
    },
    {
      id: "v-24",
      question: "Select the word that means: 'A person who is difficult to please'.",
      options: ["Fastidious", "Gregarious", "Frugal", "Obsolete"],
      correctIndex: 0,
      explanation: "The word 'Fastidious' precisely describes 'a person who is difficult to please'."
    },
    {
      id: "v-25",
      question: "Select the word that means: 'One who loves and looks after books'.",
      options: ["Philanthropist", "Bibliophile", "Bibliography", "Herbivore"],
      correctIndex: 1,
      explanation: "The word 'Bibliophile' precisely describes 'one who loves and looks after books'."
    },
    {
      id: "v-26",
      question: "Select the word that means: 'A statement that is difficult to understand due to ambiguity'.",
      options: ["Eloquent", "Ambiguous", "Concise", "Verbose"],
      correctIndex: 1,
      explanation: "The word 'Ambiguous' precisely describes 'a statement that is difficult to understand due to ambiguity'."
    },
    {
      id: "v-27",
      question: "Select the word that means: 'Government by a small, elite group'.",
      options: ["Democracy", "Anarchy", "Oligarchy", "Monarchy"],
      correctIndex: 2,
      explanation: "The word 'Oligarchy' precisely describes 'government by a small, elite group'."
    },
    {
      id: "v-28",
      question: "Complete the sentence: 'The manager's feedback was so ______ that no one was quite sure what changes were actually expected.'",
      options: ["precise", "vague", "detailed", "structured"],
      correctIndex: 1,
      explanation: "The phrase 'no one was quite sure what changes were expected' signals unclear feedback, matching 'vague'."
    },
    {
      id: "v-29",
      question: "Complete the sentence: 'Despite the tight deadline, the team remained ______ and delivered the project a day early.'",
      options: ["composed", "frantic", "distracted", "indifferent"],
      correctIndex: 0,
      explanation: "'Delivered the project a day early' despite a tight deadline implies staying calm under pressure — 'composed'."
    },
    {
      id: "v-30",
      question: "Complete the sentence: 'The new employee was quick to ______ credit to her teammates during the presentation.'",
      options: ["attribute", "withhold", "claim", "ignore"],
      correctIndex: 0,
      explanation: "'Quick to ... credit to her teammates' means she gave credit to them, matching 'attribute'."
    },
    {
      id: "v-31",
      question: "Complete the sentence: 'The CEO's ______ remarks during the town hall reassured anxious employees about the layoffs.'",
      options: ["candid", "evasive", "cryptic", "dismissive"],
      correctIndex: 0,
      explanation: "'Reassured anxious employees' suggests openness and honesty, matching 'candid' rather than evasive or dismissive remarks."
    },
    {
      id: "v-32",
      question: "Complete the sentence: 'His argument, while persuasive on the surface, was ultimately ______ once the data was checked.'",
      options: ["flawed", "flawless", "irrelevant", "celebrated"],
      correctIndex: 0,
      explanation: "'Once the data was checked' implies a problem was found, matching 'flawed'."
    },
    {
      id: "v-33",
      question: "Identify the grammatically correct sentence.",
      options: ["Neither of the applicants have submitted their resume on time.", "Neither of the applicants has submitted their resume on time.", "Neither of the applicants has submitted his resume on time, has they?", "Neither of the applicant have submit their resume on time."],
      correctIndex: 1,
      explanation: "'Neither' is singular and takes a singular verb — 'has', not 'have'. 'Neither of the applicants has submitted their resume on time' is grammatically correct."
    },
  ];

  // DRILL QUIZ HANDLER
  const [drillAnswers, setDrillAnswers] = useState<Record<string, number>>({});
  const [drillSubmitted, setDrillSubmitted] = useState<Record<string, boolean>>({});

  const handleDrillOption = (qId: string, optIndex: number) => {
    if (drillSubmitted[qId]) return;
    setDrillAnswers(prev => ({ ...prev, [qId]: optIndex }));
  };

  const handleDrillSubmit = (qId: string, correctIdx: number) => {
    if (drillAnswers[qId] === undefined || drillSubmitted[qId]) return;
    setDrillSubmitted(prev => ({ ...prev, [qId]: true }));
    if (drillAnswers[qId] === correctIdx) {
      onAddScore(20); // +20 XP per correct question
    }
  };

  // MOCK TEST SIMULATOR STATE
  const mockTestQuestions = [...quantQuestions, ...logicalQuestions, ...verbalQuestions];
  const [testActive, setTestActive] = useState(false);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [testAnswers, setTestAnswers] = useState<Record<string, number>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(2700); // 45 minutes for the full 36-question bank
  const drillSectionRef = useScrollReveal<HTMLDivElement>({ deps: [activeTab] });
  const [testFinished, setTestFinished] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Timer loop
  useEffect(() => {
    let interval: any;
    if (testActive && timeLeft > 0 && !testFinished) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && testActive && !testFinished) {
      handleFinishTest();
    }
    return () => clearInterval(interval);
  }, [testActive, timeLeft, testFinished]);

  const handleStartTest = () => {
    setTestActive(true);
    setCurrentTestIndex(0);
    setTestAnswers({});
    setFlaggedQuestions([]);
    setTimeLeft(2700);
    setTestFinished(false);
  };

  const handleTestOption = (qId: string, optIndex: number) => {
    setTestAnswers(prev => ({ ...prev, [qId]: optIndex }));
  };

  const handleToggleFlag = (qId: string) => {
    setFlaggedQuestions(prev => 
      prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]
    );
  };

  const handleFinishTest = () => {
    setTestActive(false);
    setTestFinished(true);

    // Calculate score
    let correctCount = 0;
    mockTestQuestions.forEach(q => {
      if (testAnswers[q.id] === q.correctIndex) {
        correctCount += 1;
      }
    });

    setTestScore(correctCount);
    const rewardXP = correctCount * 25; // 25 XP per correct answer
    
    if (rewardXP > 0) {
      onAddScore(rewardXP);
    }
    
    if (!progress.completedLessons.includes('apt-mocktest')) {
      onCompleteLesson('apt-mocktest');
    }

    // Persist attempt to database
    postJson('/api/aptitude/submit', {
      category: 'Timed Full Mock Simulator',
      totalQuestions: mockTestQuestions.length,
      correctCount,
      score: Math.round((correctCount / mockTestQuestions.length) * 100),
      timeSpentSec: 2700 - timeLeft,
    }).catch(() => {});
  };

  const renderSetPicker = (questions: QuizQuestion[], trackName: string, onPick: (setIndex: number) => void) => {
    const sets = chunkQuestions(questions, 10);
    return (
      <div className="set-grid reveal-item">
        {sets.map((set, idx) => {
          const answeredInSet = set.filter(q => drillSubmitted[q.id]).length;
          const correctInSet = set.filter(q => drillSubmitted[q.id] && drillAnswers[q.id] === q.correctIndex).length;
          const isDone = answeredInSet === set.length;
          return (
            <div
              key={idx}
              className={`set-card ${isDone ? 'set-card-done' : ''}`}
              onClick={() => onPick(idx)}
            >
              <div className="set-card-number">{idx + 1}</div>
              <h4 style={{ fontSize: '1rem', marginBottom: '4px' }}>Set {idx + 1}</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                {trackName} · {set.length} questions
              </p>
              {isDone ? (
                <span className="badge badge-emerald">Completed · {correctInSet}/{set.length} correct</span>
              ) : answeredInSet > 0 ? (
                <span className="badge badge-amber">{answeredInSet}/{set.length} answered</span>
              ) : (
                <span className="badge">Not started</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderDrillSection = (questions: QuizQuestion[], trackName: string) => {
    return (
      <div ref={drillSectionRef} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {questions.map((q) => {
          const isAnswered = drillSubmitted[q.id];
          const selectedOpt = drillAnswers[q.id];

          return (
            <div key={q.id} className="glass-panel reveal-item" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge badge-cyan">{trackName} Practice</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>+20 XP</span>
              </div>
              <h4 style={{ fontSize: '1.1rem', lineHeight: '1.4' }}>{q.question}</h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {q.options.map((opt, idx) => {
                  let optClass = "quiz-option";
                  if (isAnswered) {
                    if (idx === q.correctIndex) {
                      optClass += " quiz-option-correct";
                    } else if (idx === selectedOpt) {
                      optClass += " quiz-option-incorrect";
                    }
                  } else {
                    if (idx === selectedOpt) {
                      optClass += " quiz-option-selected";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      className={optClass}
                      onClick={() => handleDrillOption(q.id, idx)}
                      disabled={isAnswered}
                      style={{ margin: 0 }}
                    >
                      <div className="option-indicator">{String.fromCharCode(65 + idx)}</div>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>

              {!isAnswered && selectedOpt !== undefined && (
                <button className="btn btn-primary" onClick={() => handleDrillSubmit(q.id, q.correctIndex)} style={{ alignSelf: 'flex-start' }}>
                  Submit Answer
                </button>
              )}

              {isAnswered && (
                <div className="animate-fade-in" style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                  <h5 style={{ color: selectedOpt === q.correctIndex ? 'var(--accent-emerald)' : 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    {selectedOpt === q.correctIndex ? 'Correct! (+20 XP)' : 'Incorrect'}
                  </h5>
                  <pre style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-sans)', lineHeight: '1.5' }}>
                    {q.explanation}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Per-track stats for the overview panel
  const trackStats = (questions: QuizQuestion[]) => {
    const answered = questions.filter(q => drillSubmitted[q.id]).length;
    const correct = questions.filter(q => drillSubmitted[q.id] && drillAnswers[q.id] === q.correctIndex).length;
    const pct = questions.length ? Math.round((answered / questions.length) * 100) : 0;
    const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
    return { answered, correct, pct, accuracy, total: questions.length };
  };

  const drillMeta: Record<string, { data: QuizQuestion[]; name: string; color: string; tint: string }> = {
    quant: { data: quantQuestions, name: 'Quantitative', color: 'var(--accent)', tint: 'var(--accent-soft)' },
    logical: { data: logicalQuestions, name: 'Logical', color: 'var(--accent-violet)', tint: 'rgba(124,58,237,0.12)' },
    verbal: { data: verbalQuestions, name: 'Verbal', color: 'var(--accent-cyan)', tint: 'rgba(37,99,235,0.12)' },
  };

  const navItems: SideNavItem[] = [
    { id: 'quant', label: 'Quantitative', icon: <MindIcon size={18} />, count: quantQuestions.length },
    { id: 'logical', label: 'Logical Reasoning', icon: <BookOpenIcon size={18} />, count: logicalQuestions.length },
    { id: 'verbal', label: 'Verbal Ability', icon: <BookOpenIcon size={18} />, count: verbalQuestions.length },
    { id: 'mocktest', label: 'Timed Simulator', icon: <ClockIcon size={18} />, count: mockTestQuestions.length },
  ];

  const heroByTab: Record<string, { title: string; subtitle: string; color: string; tint: string }> = {
    quant: { title: 'Quantitative Drills', subtitle: 'Arithmetic, ratios, interest and speed problems — worked step by step.', color: 'var(--accent)', tint: 'var(--accent-soft)' },
    logical: { title: 'Logical Reasoning', subtitle: 'Pattern, sequence and deduction practice to sharpen analytical thinking.', color: 'var(--accent-violet)', tint: 'rgba(124,58,237,0.12)' },
    verbal: { title: 'Verbal Ability', subtitle: 'Grammar, vocabulary and comprehension accuracy drills.', color: 'var(--accent-cyan)', tint: 'rgba(37,99,235,0.12)' },
    mocktest: { title: 'Timed Test Simulator', subtitle: `A full ${mockTestQuestions.length}-question mock exam across all topics, under a 45-minute clock.`, color: 'var(--accent-rose)', tint: 'rgba(225,29,72,0.12)' },
  };

  const currentHero = heroByTab[activeTab];
  const drillActive = activeTab === 'quant' || activeTab === 'logical' || activeTab === 'verbal';

  return (
    <div className="animate-slide-up">
      <SectionHero
        icon={<MindIcon size={26} />}
        title={currentHero.title}
        subtitle={currentHero.subtitle}
        color={currentHero.color}
        tint={currentHero.tint}
        right={
          <span className="hero-skill-ill hero-skill-ill-solo" style={{ color: currentHero.color }}>
            <SkillIllustration kind="aptitude" size={84} />
          </span>
        }
      />

      <div className="section-shell">
        <SideNav items={navItems} active={activeTab} onSelect={(id) => switchDrillTab(id as typeof activeTab)} />

        <div className="panel-swap" key={activeTab}>

      {/* DRILL OVERVIEW STATS */}
      {drillActive && selectedSet === null && (() => {
        const s = trackStats(drillMeta[activeTab].data);
        return (
          <div className="panel" style={{ marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', minWidth: '210px' }}>
              <ProgressRing percentage={s.pct} size={92} stroke={7} color={drillMeta[activeTab].color} sublabel="done" />
              <div>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '2px' }}>{drillMeta[activeTab].name} Progress</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{s.answered} of {s.total} attempted</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', flex: 1, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '130px' }}>
                <StatTile icon={<CheckCircleIcon size={20} />} value={`${s.correct}`} label="Correct" color="var(--accent-emerald)" tint="rgba(5,150,105,0.12)" />
              </div>
              <div style={{ flex: 1, minWidth: '130px' }}>
                <StatTile icon={<AwardIcon size={20} />} value={`${s.accuracy}%`} label="Accuracy" color="var(--accent-violet)" tint="rgba(124,58,237,0.12)" />
              </div>
            </div>
            <div style={{ flexBasis: '100%', borderTop: '1px solid var(--card-border)', paddingTop: '16px' }}>
              <DividerLabel>Attempted across all tracks</DividerLabel>
              <MiniBarChart
                data={[
                  { label: 'Quant', value: trackStats(quantQuestions).pct, color: 'var(--accent)' },
                  { label: 'Logical', value: trackStats(logicalQuestions).pct, color: 'var(--accent-violet)' },
                  { label: 'Verbal', value: trackStats(verbalQuestions).pct, color: 'var(--accent-cyan)' },
                ]}
                max={100}
                suffix="%"
              />
            </div>
          </div>
        );
      })()}

      {/* DRILLS */}
      {activeTab === 'quant' && (
        selectedSet === null
          ? renderSetPicker(quantQuestions, "Quantitative", setSelectedSet)
          : <>
              <button className="btn btn-secondary" style={{ marginBottom: '20px' }} onClick={() => setSelectedSet(null)}><ChevronLeftIcon size={16} /> Back to sets</button>
              {renderDrillSection(chunkQuestions(quantQuestions, 10)[selectedSet], `Quantitative · Set ${selectedSet + 1}`)}
            </>
      )}
      {activeTab === 'logical' && (
        selectedSet === null
          ? renderSetPicker(logicalQuestions, "Logical", setSelectedSet)
          : <>
              <button className="btn btn-secondary" style={{ marginBottom: '20px' }} onClick={() => setSelectedSet(null)}><ChevronLeftIcon size={16} /> Back to sets</button>
              {renderDrillSection(chunkQuestions(logicalQuestions, 10)[selectedSet], `Logical · Set ${selectedSet + 1}`)}
            </>
      )}
      {activeTab === 'verbal' && (
        selectedSet === null
          ? renderSetPicker(verbalQuestions, "Verbal", setSelectedSet)
          : <>
              <button className="btn btn-secondary" style={{ marginBottom: '20px' }} onClick={() => setSelectedSet(null)}><ChevronLeftIcon size={16} /> Back to sets</button>
              {renderDrillSection(chunkQuestions(verbalQuestions, 10)[selectedSet], `Verbal · Set ${selectedSet + 1}`)}
            </>
      )}

      {/* MOCK TEST SIMULATOR */}
      {activeTab === 'mocktest' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {!testActive && !testFinished && (
            <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              <span className="badge badge-rose">Practice Exam</span>
              <h3 style={{ fontSize: '1.6rem' }}>Cognitive & Logic Evaluation</h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', fontSize: '0.95rem' }}>
                This simulator bundles {mockTestQuestions.length} reasoning questions across Quantitative, Logical, and Verbal topics. You have a total of 45 minutes to complete the test. You can flag questions and review them before submitting.
              </p>

              <div style={{ display: 'flex', gap: '24px', margin: '10px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClockIcon size={20} style={{ color: 'var(--accent-cyan)' }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>45 Minutes</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--accent-violet)' }}>{mockTestQuestions.length} Questions</span>
                </div>
              </div>

              <button className="btn btn-primary" onClick={handleStartTest}>
                Start Timed Simulator
              </button>
            </div>
          )}

          {/* ACTIVE TEST LAYOUT */}
          {testActive && (
            <div className="grid-dashboard">
              
              {/* Question card */}
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Question {currentTestIndex + 1} of {mockTestQuestions.length}
                  </span>
                  
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => handleToggleFlag(mockTestQuestions[currentTestIndex].id)}
                    style={{ padding: '6px 12px', fontSize: '0.75rem', borderColor: flaggedQuestions.includes(mockTestQuestions[currentTestIndex].id) ? 'var(--accent-amber)' : 'var(--card-border)', color: flaggedQuestions.includes(mockTestQuestions[currentTestIndex].id) ? 'var(--accent-amber)' : 'var(--text-secondary)' }}
                  >
                    {flaggedQuestions.includes(mockTestQuestions[currentTestIndex].id) ? '★ Flagged' : '☆ Flag for Review'}
                  </button>
                </div>

                <h4 style={{ fontSize: '1.2rem', lineHeight: '1.4' }}>
                  {mockTestQuestions[currentTestIndex].question}
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {mockTestQuestions[currentTestIndex].options.map((opt, idx) => {
                    const isSelected = testAnswers[mockTestQuestions[currentTestIndex].id] === idx;
                    return (
                      <button
                        key={idx}
                        className={`quiz-option ${isSelected ? 'quiz-option-selected' : ''}`}
                        onClick={() => handleTestOption(mockTestQuestions[currentTestIndex].id, idx)}
                        style={{ margin: 0 }}
                      >
                        <div className="option-indicator">{String.fromCharCode(65 + idx)}</div>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => setCurrentTestIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentTestIndex === 0}
                  >
                    Previous
                  </button>

                  {currentTestIndex < mockTestQuestions.length - 1 ? (
                    <button 
                      className="btn btn-secondary"
                      onClick={() => setCurrentTestIndex(prev => Math.min(mockTestQuestions.length - 1, prev + 1))}
                    >
                      Next Question
                    </button>
                  ) : (
                    <button className="btn btn-primary" onClick={handleFinishTest}>
                      Submit Exam
                    </button>
                  )}
                </div>
              </div>

              {/* Side Navigation/Timer panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Timer block */}
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Remaining Time</span>
                  <h3 style={{ fontSize: '2.5rem', fontFamily: 'monospace' }} className="gradient-text-cyan-violet">
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </h3>
                </div>

                {/* Question grid navigator */}
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h4 style={{ fontSize: '1rem' }}>Navigator</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {mockTestQuestions.map((q, idx) => {
                      const isAnswered = testAnswers[q.id] !== undefined;
                      const isFlagged = flaggedQuestions.includes(q.id);
                      const isActive = currentTestIndex === idx;

                      let btnStyle: React.CSSProperties = {
                        height: '40px',
                        borderRadius: '8px',
                        border: '1px solid var(--card-border)',
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      };

                      if (isActive) {
                        btnStyle.borderColor = 'var(--accent)';
                        btnStyle.background = 'var(--accent-soft)';
                        btnStyle.color = 'var(--accent)';
                      } else if (isFlagged) {
                        btnStyle.borderColor = 'var(--accent-amber)';
                        btnStyle.background = 'rgba(217, 119, 6, 0.1)';
                        btnStyle.color = 'var(--accent-amber)';
                      } else if (isAnswered) {
                        btnStyle.borderColor = 'var(--accent-emerald)';
                        btnStyle.background = 'rgba(5, 150, 105, 0.1)';
                        btnStyle.color = 'var(--accent-emerald)';
                      }

                      return (
                        <button
                          key={q.id}
                          style={btnStyle}
                          onClick={() => setCurrentTestIndex(idx)}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(5, 150, 105, 0.15)', border: '1px solid var(--accent-emerald)' }} />
                      <span>Answered</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(217, 119, 6, 0.15)', border: '1px solid var(--accent-amber)' }} />
                      <span>Flagged for Review</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MOCK TEST SUMMARY SCREEN */}
          {testFinished && (
            <div className="glass-panel animate-slide-up" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <span className="badge badge-emerald">Exam Completed</span>
                <ProgressRing
                  percentage={Math.round((testScore / mockTestQuestions.length) * 100)}
                  size={130}
                  stroke={10}
                  color={testScore / mockTestQuestions.length >= 0.6 ? 'var(--accent-emerald)' : 'var(--accent-amber)'}
                  sublabel="score"
                />
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>You scored <span className="gradient-text-cyan-violet" style={{ fontWeight: 800 }}>{testScore} / {mockTestQuestions.length}</span></h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                    Reward earned: +{testScore * 25} XP
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h4 style={{ fontSize: '1.2rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '8px' }}>Question Breakdowns & Correct Answers</h4>
                {mockTestQuestions.map((q, idx) => {
                  const userAnsIdx = testAnswers[q.id];
                  const isCorrect = userAnsIdx === q.correctIndex;

                  return (
                    <div key={q.id} style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '12px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Q{idx + 1}. {mockTestQuestions[idx].question.slice(0, 60)}...</span>
                        <span className={`badge ${isCorrect ? 'badge-emerald' : 'badge-rose'}`} style={{ flexShrink: 0 }}>
                          {isCorrect ? 'Correct' : userAnsIdx === undefined ? 'Unanswered' : 'Incorrect'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '10px', borderLeft: '2px solid var(--card-border)' }}>
                        <p style={{ marginBottom: '4px' }}><strong>Correct Answer:</strong> {q.options[q.correctIndex]}</p>
                        {userAnsIdx !== undefined && <p style={{ marginBottom: '6px' }}><strong>Your Answer:</strong> {q.options[userAnsIdx]}</p>}
                        <pre style={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-sans)', color: 'var(--text-muted)', background: 'var(--card-bg)', padding: '10px', borderRadius: '6px', border: '1px solid var(--card-border)' }}>
                          {q.explanation}
                        </pre>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button className="btn btn-primary" onClick={handleStartTest} style={{ alignSelf: 'center', marginTop: '10px' }}>
                Take Test Again
              </button>
            </div>
          )}

        </div>
      )}

        </div>
      </div>
    </div>
  );
};
