import React, { useState } from 'react';
import type { UserProgress, ScenarioNode } from '../types';
import { RefreshIcon, HeartIcon, BriefcaseIcon, MailIcon, ChevronLeftIcon } from './Icons';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { SectionHero, SideNav, ProgressRing, Meter } from './Shared';
import type { SideNavItem } from './Shared';
import { SkillIllustration } from './graphics/SkillIllustration';

interface SoftSkillsProps {
  progress: UserProgress;
  onAddScore: (score: number) => void;
  onCompleteLesson: (lessonId: string) => void;
}

export const SoftSkills: React.FC<SoftSkillsProps> = ({ progress, onAddScore, onCompleteLesson }) => {
  const [activeTab, setActiveTab] = useState<'conflict' | 'negotiation' | 'etiquette'>('conflict');

  // CONFLICT SIMULATOR STATE
  const [currentNodeId, setCurrentNodeId] = useState('start');
  const [morale, setMorale] = useState(60);
  const [trust, setTrust] = useState(60);
  const [delivery, setDelivery] = useState(60);
  const [simulationHistory, setSimulationHistory] = useState<string[]>([]);
  const [isConflictFinished, setIsConflictFinished] = useState(false);

  // Scenario nodes mapping
  const conflictNodes: Record<string, ScenarioNode> = {
    start: {
      id: "start",
      text: "You are the tech lead. Your senior engineer, David, refuses to write unit tests, saying: 'Tests are waste of time, I write clean code. Junior developers write bugs, not me. Let me write features.' The junior developer, Clara, is frustrated because David's feature commits frequently break her staging branches, causing major delays. What is your first step?",
      options: [
        {
          text: "Schedule a private 1-on-1 with David to explain how tests help the entire team's delivery and enforce writing them as a standard commit rule.",
          nextNodeId: "discuss_david",
          moraleChange: 5,
          trustChange: 10,
          deliveryChange: 5,
          feedback: "Great approach. Direct, private alignment preserves David's dignity while explaining the wider impact of team standards."
        },
        {
          text: "Reprimand David publicly during the next standup meeting so everyone understands that rules apply to senior staff too.",
          nextNodeId: "public_clash",
          moraleChange: -20,
          trustChange: -20,
          deliveryChange: -5,
          feedback: "Calling him out publicly breeds defensive behaviour, damages trust, and lowers overall team psychological safety."
        },
        {
          text: "Tell Clara that David is senior and she should learn how to work around his style rather than complaining.",
          nextNodeId: "dismiss_clara",
          moraleChange: -25,
          trustChange: -10,
          deliveryChange: -15,
          feedback: "Clara feels dismissed. This creates team friction and doesn't resolve the staging branch breakage."
        }
      ]
    },
    discuss_david: {
      id: "discuss_david",
      text: "In the 1-on-1, David responds: 'If I write tests, I will finish my tasks 30% slower. If the release timeline is delayed, the management will blame me, not you.' How do you address his timeline concerns?",
      options: [
        {
          text: "Promise to advocate to management to extend sprint allocations for test scaffolding, and offer to pair-program the initial tests with him.",
          nextNodeId: "david_agrees",
          moraleChange: 15,
          trustChange: 15,
          deliveryChange: 10,
          feedback: "Excellent. Offering support and resource buffers demonstrates leadership and active empathy, securing buy-in."
        },
        {
          text: "Tell him timelines are fixed and he must work overtime if necessary to write tests without falling behind.",
          nextNodeId: "david_burnout",
          moraleChange: -15,
          trustChange: -15,
          deliveryChange: -10,
          feedback: "Forcing overtime risks developer burnout, worsens team relations, and ultimately results in sloppy code/test quality."
        }
      ]
    },
    public_clash: {
      id: "public_clash",
      text: "David is furious about the public callout and starts working in isolation, refusing to review junior pull requests. Clara is completely blocked on reviews. How do you resolve this?",
      options: [
        {
          text: "Apologize privately to David for the public standup comment, explain your intent, and host a team retro to define collaborative guidelines.",
          nextNodeId: "david_agrees",
          moraleChange: 15,
          trustChange: 15,
          deliveryChange: 10,
          feedback: "Apologizing is a sign of mature leadership. It rebuilds trust and allows the team to draft common guidelines together."
        },
        {
          text: "Escalate David's insubordination to HR and write up a performance improvement warning.",
          nextNodeId: "escalated_hr",
          moraleChange: -30,
          trustChange: -25,
          deliveryChange: -20,
          feedback: "Escalating directly to HR shuts down direct negotiation, polarizes the team, and blocks delivery."
        }
      ]
    },
    dismiss_clara: {
      id: "dismiss_clara",
      text: "Clara feels unsupported and starts looking for other teams. She does not flag breaks in staging, resulting in a buggy client demo. The CTO is upset. What do you do?",
      options: [
        {
          text: "Take responsibility in front of the CTO, schedule a private session to fix testing bottlenecks, and restore review protocols.",
          nextNodeId: "david_agrees",
          moraleChange: 20,
          trustChange: 15,
          deliveryChange: 20,
          feedback: "Taking accountability and taking concrete action shows high professional integrity and satisfies the CTO."
        },
        {
          text: "Blame Clara's inexperience for the buggy demo in front of the CTO.",
          nextNodeId: "escalated_hr",
          moraleChange: -40,
          trustChange: -30,
          deliveryChange: -30,
          feedback: "Blaming a junior destroys manager trust and team morale. You will likely lose team support."
        }
      ]
    },
    david_agrees: {
      id: "david_agrees",
      text: "Resolution: David agrees to write tests. Clara feels valued, and team collaboration improves. Sprints are slightly adjusted, but the overall project stability prevents bug retrofits, saving time in the long run. Congratulations on managing the conflict!",
      options: []
    },
    david_burnout: {
      id: "david_burnout",
      text: "Resolution: David starts looking for a new job and does the bare minimum. Clara is still unhappy, and staging remains unstable. Project delivery is delayed due to high attrition. Consider checking your leadership strategies.",
      options: []
    },
    escalated_hr: {
      id: "escalated_hr",
      text: "Resolution: The team environment turns toxic. David resigns, Clara transfers to another group, and you have to rebuild the department from scratch while project timelines collapse.",
      options: []
    }
  };

  const handleConflictOption = (option: typeof conflictNodes['start']['options'][0]) => {
    const newMorale = Math.max(0, Math.min(100, morale + option.moraleChange));
    const newTrust = Math.max(0, Math.min(100, trust + option.trustChange));
    const newDelivery = Math.max(0, Math.min(100, delivery + option.deliveryChange));

    setMorale(newMorale);
    setTrust(newTrust);
    setDelivery(newDelivery);
    setSimulationHistory(prev => [...prev, option.feedback]);
    setCurrentNodeId(option.nextNodeId);

    // If the next node has no options, the simulator is finished
    if (conflictNodes[option.nextNodeId].options.length === 0) {
      setIsConflictFinished(true);
      if (newMorale >= 40 && newTrust >= 40 && newDelivery >= 40) {
        if (!progress.completedLessons.includes('soft-conflict')) {
          onAddScore(60);
          onCompleteLesson('soft-conflict');
        }
      }
    }
  };

  const handleResetConflict = () => {
    setCurrentNodeId('start');
    setMorale(60);
    setTrust(60);
    setDelivery(60);
    setSimulationHistory([]);
    setIsConflictFinished(false);
  };

  // NEGOTIATION SANDBOX STATE
  const [offerStage, setOfferStage] = useState(0);
  const [currentOffer, setCurrentOffer] = useState(85000);
  const [recruiterRapport, setRecruiterRapport] = useState(60);
  const [negotiationLog, setNegotiationLog] = useState<string[]>([]);
  const [negotiationFinished, setNegotiationFinished] = useState(false);

  const handleNegotiationChoice = (type: 'collaborative' | 'aggressive' | 'passive') => {
    let nextOffer = currentOffer;
    let rapportChange = 0;
    let message = "";
    let finished = false;

    if (offerStage === 0) {
      // First round counter-offer
      if (type === 'collaborative') {
        nextOffer = 95000;
        rapportChange = 10;
        message = "Candidate: 'Thank you for the offer. Based on my technical skills and the market averages for this location, I was hoping we could explore a base salary around $98,000. Is there flexibility here?'\nRecruiter: 'I appreciate you bringing data. We can't do $98,000, but I can bump our offer to $92,000. Let me check what we can do.'";
      } else if (type === 'aggressive') {
        nextOffer = 105000;
        rapportChange = -15;
        message = "Candidate: '$85,000 is way below my expectations. I have another offer for $105,000, and I won't accept a penny less here.'\nRecruiter: 'Oh, I see. That is the upper limit of our budget. I will have to consult with the hiring manager, but I cannot guarantee we can match that.'";
      } else {
        rapportChange = 5;
        finished = true;
        message = "Candidate: 'Thank you, $85,000 works for me. I accept.'\nRecruiter: 'Wonderful! We are excited to have you join us. I will send over the contract.'";
      }
    } else if (offerStage === 1) {
      // Second round counter-offer
      if (type === 'collaborative') {
        nextOffer = 95000;
        rapportChange = 5;
        finished = true;
        message = "Candidate: 'Thank you, $92,000 is much closer. If we can add 5 additional remote days per year, I am ready to sign today.'\nRecruiter: 'That sounds completely reasonable. We've updated the contract to $92,000 plus the remote allowance.'";
      } else if (type === 'aggressive') {
        nextOffer = 98000;
        rapportChange = -20;
        finished = true;
        message = "Candidate: '$92,000 is still not enough. I need at least $98,000 or I cannot sign.'\nRecruiter: 'Unfortunately, we cannot stretch our budget further. We will have to withdraw the offer at this time. We wish you the best.'";
      } else {
        rapportChange = 5;
        finished = true;
        message = "Candidate: '$92,000 works for me. I will sign the contract.'\nRecruiter: 'Outstanding! Welcome to the team.'";
      }
    }

    setRecruiterRapport(prev => Math.max(0, Math.min(100, prev + rapportChange)));
    setCurrentOffer(nextOffer);
    setNegotiationLog(prev => [...prev, message]);
    setOfferStage(prev => prev + 1);

    if (finished || offerStage >= 1) {
      setNegotiationFinished(true);
      if (rapportChange >= -10 && nextOffer > 85000) {
        if (!progress.completedLessons.includes('soft-negotiation')) {
          onAddScore(50);
          onCompleteLesson('soft-negotiation');
        }
      }
    }
  };

  const handleResetNegotiation = () => {
    setOfferStage(0);
    setCurrentOffer(85000);
    setRecruiterRapport(60);
    setNegotiationLog([]);
    setNegotiationFinished(false);
  };

  // ETIQUETTE STATE — bank of email diplomacy challenges
  const [etiquetteIndex, setEtiquetteIndex] = useState(0);
  const [etiquetteAnswers, setEtiquetteAnswers] = useState<Record<string, number>>({});
  const [etiquetteSubmitted, setEtiquetteSubmitted] = useState<Record<string, boolean>>({});
  const [etiquetteSet, setEtiquetteSet] = useState<number | null>(null);
  const etiquetteBankRef = useScrollReveal<HTMLDivElement>({ deps: [etiquetteIndex, etiquetteSet] });

  const chunkIntoSets = <T,>(arr: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
  };

  const etiquetteChallenges = [
    {
      id: "eti-1",
      rawEmail: `From: Candidate (David)&#10;To: Tech Lead (Sarah)&#10;Subject: WHAT IS GOING ON?&#10;&#10;Hey, why isn't the user database API finished yet? You promised it would be ready by Wednesday, and now I'm just sitting here doing nothing because my tasks depend on it. This is holding up the entire dashboard. Fix it as soon as possible so I can get back to work.`,
      question: "Choose the best professional polish to restructure David's passive-aggressive email while maintaining the urgency:",
      options: [
        "Hi Sarah - Just checking in on the database API. We had slated this for Wednesday, and the frontend dashboard team is currently blocked. Could you let us know if we can assist or if you have a revised ETA? Thank you!",
        "Hi Sarah - Is there any news on the API? I am unable to do any work because it is delayed. Please hurry up so we don't fail our sprint.",
        "Hello Sarah, the user database API is late. Please explain what is taking so long so I can tell my manager why my velocity is zero."
      ],
      correctIndex: 0,
      explanation: "Option A clearly highlights the impact of the blocker (frontend team blocked), references the original timeline (slated for Wednesday), and offers support (let us know if we can assist) in a constructive, collaborative tone. This prompts collaboration rather than defensiveness."
    },
    {
      id: "eti-2",
      rawEmail: `From: Priya (Junior Designer)&#10;To: Marketing Team (All)&#10;Subject: Feedback on my mockups???&#10;&#10;I sent the homepage mockups THREE days ago and nobody has responded. I guess my work isn't important enough for anyone to look at. I'll just assume it's approved since no one cares to reply.`,
      question: "Priya feels ignored and is venting sarcastically to the whole team. Which rewrite best raises the same concern professionally?",
      options: [
        "Hi team, following up on the homepage mockups I shared three days ago — could someone confirm they were received and share any feedback by Thursday so I can finalize the designs on schedule?",
        "Hi team, I sent mockups days ago and heard nothing back, which really isn't okay for a team that claims to value design.",
        "Hi team, since nobody replied, I'll take the silence as approval and move forward without further review."
      ],
      correctIndex: 0,
      explanation: "The first option restates the request neutrally, gives a clear deadline, and frames the ask around the shared goal (finalizing on schedule) rather than expressing frustration or making assumptions about the team's priorities."
    },
    {
      id: "eti-3",
      rawEmail: `From: Arjun (Team Lead)&#10;To: Meera (Engineer)&#10;Subject: Your PR&#10;&#10;This code is a mess. Did you even test this before opening the PR? I don't have time to fix your mistakes, please redo it properly this time.`,
      question: "Arjun's code review feedback is harsh and demoralizing. Which version delivers the same technical concern constructively?",
      options: [
        "Hi Meera, I found a few issues while reviewing — a couple of edge cases in the validation logic aren't covered by tests yet. Could you add test coverage for those and I'm happy to do a follow-up review?",
        "Hi Meera, please be more careful next time, this kind of thing shouldn't happen at your level.",
        "Meera, this PR needs a full rewrite, come find me if you have questions."
      ],
      correctIndex: 0,
      explanation: "This version is specific about the actual technical gap (missing edge case test coverage), offers a clear next step, and avoids personal judgments about Meera's competence or effort — all of which keep the feedback focused on the work rather than the person."
    },
    {
      id: "eti-4",
      rawEmail: `From: Sanjay (Client)&#10;To: Account Manager&#10;Subject: Unacceptable&#10;&#10;This is the second delay this month. Honestly I'm starting to wonder if your team can deliver anything on time. We need answers NOW.`,
      question: "You're the account manager replying to an upset client. Which response best de-escalates while still being direct about next steps?",
      options: [
        "Hi Sanjay, you're right to be frustrated — two delays in one month falls short of what we committed to. Here's exactly what caused this delay and the revised delivery date, along with two safeguards we're putting in place to prevent a repeat.",
        "Hi Sanjay, delays happen sometimes in software projects, I'm sure you understand these things take time.",
        "Hi Sanjay, we're doing our best, please be patient and we'll get back to you eventually."
      ],
      correctIndex: 0,
      explanation: "Acknowledging the frustration directly (without being defensive), being specific about cause and fix, and adding concrete safeguards rebuilds trust far more effectively than minimizing the issue or offering vague reassurance."
    },
    {
      id: "eti-5",
      rawEmail: `From: Karan (Intern)&#10;To: Whole Company Slack Channel&#10;Subject: (Slack message)&#10;&#10;lol whoever approved this deployment process needs to be fired, it broke prod again and now I have to stay late AGAIN because of someone else's incompetence`,
      question: "Karan is venting publicly about a process failure. What's the most professional way to raise this concern instead?",
      options: [
        "Hey team, prod broke again after today's deployment — could we do a quick retro on the deployment checklist this week? Happy to help document a fix so this doesn't recur.",
        "Hey team, this deployment process is a joke honestly, whoever set it up should really reconsider their career choices.",
        "Hey team, I'm not naming names but some of you know exactly whose fault this is."
      ],
      correctIndex: 0,
      explanation: "This response reports the same underlying problem (broken deployment process) but frames it around a fix (a retro on the checklist) rather than blame, and avoids public shaming — which tends to make people defensive rather than collaborative, especially in front of the whole company."
    },
    {
      id: "eti-6",
      rawEmail: `From: Divya (Peer)&#10;To: You&#10;Subject: Re: Shared doc&#10;&#10;You keep editing my sections without asking. Please stop touching my part of the document, it's honestly getting really annoying.`,
      question: "Divya is annoyed about unapproved edits to her section. Which reply best resolves this without escalating tension?",
      options: [
        "Hi Divya, sorry — I should have flagged those edits before making them. Would it help if I left suggestions in comments going forward instead of editing directly?",
        "Hi Divya, I was just trying to help, you don't need to make it a big deal.",
        "Hi Divya, technically it's a shared doc so anyone can edit any section."
      ],
      correctIndex: 0,
      explanation: "This reply takes ownership of the behavior that caused friction, apologizes briefly without over-explaining, and proposes a concrete process change (comments instead of direct edits) that addresses Divya's actual concern going forward."
    },
    {
      id: "eti-7",
      rawEmail: `From: Rohit (Product Manager)&#10;To: You (Developer)&#10;Subject: Missed deadline&#10;&#10;You said this feature would be done by Friday. It's Monday and there's nothing. This is exactly why I can't trust engineering estimates.`,
      question: "Rohit is frustrated about a missed deadline. Which reply best acknowledges the issue while rebuilding trust?",
      options: [
        "Hi Rohit, you're right, I missed the Friday date and should have flagged it earlier. I ran into an unexpected data migration issue — here's the updated timeline and I'll send a progress update every two days until it ships.",
        "Hi Rohit, these things happen in engineering, estimates are never exact so please keep that in mind next time.",
        "Hi Rohit, I was busy with other priorities, I'll get to it when I can."
      ],
      correctIndex: 0,
      explanation: "This response owns the miss directly, gives the actual reason without excuses, and offers a concrete plan (revised timeline plus regular updates) to rebuild trust — rather than minimizing the issue or sounding indifferent."
    },
    {
      id: "eti-8",
      rawEmail: `From: Ananya (New Hire)&#10;To: Manager&#10;Subject: Not getting enough support&#10;&#10;Nobody on this team ever explains anything properly, I've been left to figure everything out myself since day one and it's honestly not fair.`,
      question: "Ananya feels unsupported as a new hire. Which version raises the same concern constructively to her manager?",
      options: [
        "Hi, I wanted to flag that I've been ramping up mostly on my own — would it be possible to set up regular check-ins or pair me with someone for the first few weeks?",
        "Hi, the onboarding here is honestly pretty bad compared to my last company, nobody seems to care about helping new people.",
        "Hi, I don't think this team is a good fit for me given how little guidance I'm getting."
      ],
      correctIndex: 0,
      explanation: "This version names a specific, solvable gap (lack of structured onboarding) and proposes a concrete fix (check-ins or pairing), which is far more actionable for a manager than a general complaint or an implied threat to leave."
    },
    {
      id: "eti-9",
      rawEmail: `From: Vikram (Senior Engineer)&#10;To: Team Channel&#10;Subject: (Slack)&#10;&#10;can people PLEASE stop merging to main without review, we just broke the build for the third time this week, this is basic stuff`,
      question: "Vikram is publicly venting about repeated process violations. What's a more constructive way to raise the same issue with the team?",
      options: [
        "Hey team, we've had the build break 3 times this week from unreviewed merges to main — can we agree to require at least one approval before merging, starting today?",
        "Hey team, some people clearly don't understand how git works, please read the docs before touching main.",
        "Hey team, I'm disabling direct push access for everyone since apparently we can't be trusted."
      ],
      correctIndex: 0,
      explanation: "This message states the concrete impact (build broke 3 times), proposes a clear rule going forward (require approval before merging), and avoids blaming anyone's competence or taking a unilateral punitive action."
    },
    {
      id: "eti-10",
      rawEmail: `From: Farah (Client)&#10;To: Project Lead&#10;Subject: Scope creep&#10;&#10;Every time we ask for a small tweak you tell us it's 'out of scope' and want more money. This is getting exhausting and it feels like nickel and diming.`,
      question: "A client feels every request is being turned into a paid change order. Which reply best addresses the frustration while protecting the project scope?",
      options: [
        "Hi Farah, I hear you — let's walk through the last few requests together so we're aligned on what's covered under the original scope versus new work, and I'll share a simpler process for handling small tweaks going forward.",
        "Hi Farah, unfortunately that's just how software contracts work, any change requires a change order regardless of size.",
        "Hi Farah, I understand the frustration, I'll just approve these extra requests for free this time."
      ],
      correctIndex: 0,
      explanation: "This response validates the frustration, proposes a joint review to build shared understanding of the contract, and offers a clearer process going forward — protecting the scope without being rigid or simply giving away free work to avoid conflict."
    },
    {
      id: "eti-11",
      rawEmail: `From: Karthik (Colleague)&#10;To: You&#10;Subject: Re: Presentation credit&#10;&#10;I noticed the client presentation only had your name on it even though I built half the slides. Kind of frustrating not to be mentioned at all.`,
      question: "Karthik feels his contribution wasn't credited. Which reply best repairs this while keeping the relationship intact?",
      options: [
        "Hi Karthik, you're right, that was an oversight on my part — I've updated the slide credits and I'll make sure to call out your contribution directly with the client too.",
        "Hi Karthik, it was my presentation to give so I didn't think it mattered who built which slides.",
        "Hi Karthik, I can add your name next time if it's really that important to you."
      ],
      correctIndex: 0,
      explanation: "This reply takes clear ownership of the mistake, fixes it concretely (updated credits), and goes a step further to acknowledge the contribution with the client — rather than dismissing the concern or treating it as a minor annoyance."
    },
    {
      id: "eti-12",
      rawEmail: `From: Neha (Manager)&#10;To: You&#10;Subject: Performance concern&#10;&#10;I've noticed you've missed two team meetings this month without a heads up. I need to understand what's going on.`,
      question: "You're replying to your manager's direct but fair concern about missed meetings. Which response is most professional?",
      options: [
        "Hi Neha, that's fair — I should have given you a heads up both times. I had back-to-back client calls that ran long; going forward I'll send a quick message in advance if I know I'll be missing one.",
        "Hi Neha, those meetings usually aren't that useful for my work anyway, so I didn't think it was a big deal.",
        "Hi Neha, I didn't realize attendance was being tracked so closely."
      ],
      correctIndex: 0,
      explanation: "This response accepts the feedback without defensiveness, explains the real reason briefly, and commits to a specific behavior change (advance notice) — which is what rebuilds a manager's confidence, rather than dismissing the meetings' value or the concern itself."
    },
    {
      id: "eti-13",
      rawEmail: `From: Sana (Colleague)&#10;To: You&#10;Subject: (Slack, 11:47 PM)&#10;&#10;hey did you see my message from earlier? i need this by tomorrow morning, can you jump on a call now?`,
      question: "A colleague is messaging you late at night expecting an immediate call. Which reply best sets a boundary while staying helpful?",
      options: [
        "Sana, please stop messaging me this late, it's really not okay.",
        "Hi Sana, sure give me a minute, let me hop on a call now even though it's midnight.",
        "Hi Sana, I've logged off for the day so I can't jump on a call right now — I'll pick this up first thing tomorrow morning and we can sync before your deadline."
      ],
      correctIndex: 2,
      explanation: "This response is warm and helpful while protecting personal time — it commits to addressing the request first thing tomorrow rather than either caving to an unreasonable ask or reacting with irritation."
    },
    {
      id: "eti-14",
      rawEmail: `From: Team Lead&#10;To: You&#10;Subject: Re: Sprint planning&#10;&#10;You keep interrupting people mid-sentence in standups. It's becoming a pattern and a few teammates have mentioned it.`,
      question: "You're receiving direct feedback about interrupting teammates. Which reply best takes this on board?",
      options: [
        "Thanks for telling me directly — I didn't realize it was landing that way. I'll make a conscious effort to let people finish, and please flag it in the moment if it happens again.",
        "That's surprising, nobody has ever said anything to my face about it.",
        "I only interrupt when people are taking too long to get to the point, so it's kind of necessary."
      ],
      correctIndex: 0,
      explanation: "This response accepts the feedback without minimizing it or getting defensive, and invites ongoing accountability — which is what actually changes the pattern."
    },
    {
      id: "eti-15",
      rawEmail: `From: Priya (Manager)&#10;To: You&#10;Subject: New task&#10;&#10;I know it's Friday afternoon, but can you get this client deck done by Monday 9am? I know it's a big ask.`,
      question: "Your manager is making a demanding last-minute request but is acknowledging it. What's the best way to respond?",
      options: [
        "Hi Priya, I can make that work — I'll need the client's latest requirements doc to get started, and I'll send you a draft by Sunday evening for a quick look before Monday.",
        "Sure, no problem at all, I'll cancel my weekend plans.",
        "Honestly this isn't fair, you always do this on Fridays."
      ],
      correctIndex: 0,
      explanation: "This response agrees to help while proactively setting up for success (asking for what's needed and building in a review checkpoint) — rather than silently over-committing or venting frustration instead of engaging."
    },
    {
      id: "eti-16",
      rawEmail: `From: Arjun (Peer Engineer)&#10;To: You&#10;Subject: Re: API design&#10;&#10;I really don't think your approach to the API will scale. I think we should just do it my way.`,
      question: "A peer is dismissing your technical proposal without much discussion. What's the most constructive reply?",
      options: [
        "Fine, we'll do it your way, whatever.",
        "I hear your scaling concern — can we grab 15 minutes to walk through both approaches side by side and weigh the tradeoffs together before deciding?",
        "I've already thought this through, so let's just go with my design."
      ],
      correctIndex: 1,
      explanation: "This response treats the disagreement as something to work through together with concrete comparison, rather than digging in or passively giving up the discussion."
    },
    {
      id: "eti-17",
      rawEmail: `From: Client (via email)&#10;To: Account Manager&#10;Subject: Slow responses&#10;&#10;We've been waiting 3 days for a reply to a simple question. This is unacceptable for a client paying what we pay.`,
      question: "A client is frustrated about slow response times. Which reply best addresses this?",
      options: [
        "I'm sorry for the delay — that's on us, and it shouldn't have taken 3 days. Here's the answer to your question, and I'm setting up a same-day response commitment for anything you send going forward.",
        "Our SLA technically allows up to 5 business days for responses.",
        "We've been extremely busy with other clients, so response times can vary."
      ],
      correctIndex: 0,
      explanation: "This response apologizes without excuses, answers the actual question, and offers a concrete improvement — rather than justifying the delay or hiding behind fine print."
    },
    {
      id: "eti-18",
      rawEmail: `From: Teammate (in Demo)&#10;To: Team Channel&#10;Subject: (Slack)&#10;&#10;Great job on that feature demo! Wasn't sure who all worked on it though.`,
      question: "A teammate presented a feature you contributed heavily to without mentioning you. How do you raise this professionally afterward?",
      options: [
        "Hey, thanks! Quick note for next time — I worked on the backend logic for that feature, so it'd help my visibility with leadership if you can mention contributors when presenting shared work.",
        "You should have given me credit, that was really disrespectful of you.",
        "It's fine, I don't really care about getting credit for things."
      ],
      correctIndex: 0,
      explanation: "This response raises the specific gap and requests a concrete change for next time, without either escalating with an accusation or suppressing a legitimate concern."
    },
    {
      id: "eti-19",
      rawEmail: `From: Direct Report&#10;To: You (Manager)&#10;Subject: Re: Performance feedback&#10;&#10;I don't agree with this feedback at all, I think you're being too harsh.`,
      question: "Your direct report is pushing back on performance feedback you gave. What's the best way to respond as their manager?",
      options: [
        "I've made my decision on this feedback and it's not up for discussion.",
        "Maybe I was a bit harsh, let's just forget I said anything.",
        "I appreciate you telling me directly. Let's set up time to go through specific examples together so we're both clear on what I observed and you can share your perspective too."
      ],
      correctIndex: 2,
      explanation: "This response stays open to dialogue and grounds the conversation in specifics, rather than shutting down the conversation or retracting valid feedback altogether."
    },
    {
      id: "eti-20",
      rawEmail: `From: Backend Lead&#10;To: You (Frontend Lead)&#10;Subject: Production bug&#10;&#10;This bug is clearly a frontend issue, your team needs to fix this today.`,
      question: "A lead from another team is placing blame on your team for a bug before investigation. What's the best response?",
      options: [
        "This is clearly your team's fault based on the error logs, not ours.",
        "Let's get both teams on a quick call to trace where the issue is actually coming from — I want to fix this fast, and figuring out the root cause first will get us there quicker.",
        "Sure, we'll take a look, even though I'm fairly sure it's not on us."
      ],
      correctIndex: 1,
      explanation: "This response prioritizes solving the actual problem through joint investigation, rather than trading blame or passive-aggressively agreeing while implying fault lies elsewhere."
    },
    {
      id: "eti-21",
      rawEmail: `From: You&#10;To: Manager&#10;Subject: Draft: Compensation discussion&#10;&#10;(Draft you're preparing to send)`,
      question: "You're drafting a message to your manager asking for a raise. Which version is most professional and effective?",
      options: [
        "Hi [Manager], everyone else on the team makes more than me, this isn't fair.",
        "Hi [Manager], I'd like to set up time to discuss my compensation. Over the past year I've taken on [specific responsibilities/impact], and I'd like to talk through what a fair adjustment might look like.",
        "Hi [Manager], I think I deserve more money, can we talk about it sometime?"
      ],
      correctIndex: 1,
      explanation: "This version anchors the ask in specific, demonstrable impact and proposes a clear next step, rather than making a vague or comparison-based appeal."
    },
    {
      id: "eti-22",
      rawEmail: `From: Manager&#10;To: You&#10;Subject: Extra project&#10;&#10;Can you also take on the onboarding docs project? It's unpaid overtime but good visibility.`,
      question: "You're being asked to take on extra unpaid work framed as a visibility opportunity, but you're already at capacity. Which reply is most professional?",
      options: [
        "Sure, I'll just squeeze it in on nights and weekends.",
        "I appreciate you thinking of me for this — right now I'm at capacity with [current priorities], so I wouldn't be able to give it the quality it deserves. Could we revisit this after [milestone], or see if it could be scoped into my regular hours?",
        "No, I'm not doing unpaid work, that's not my job."
      ],
      correctIndex: 1,
      explanation: "This response declines without hostility, explains the real constraint, and proposes alternatives — rather than silently over-extending or refusing without offering a path forward."
    },
    {
      id: "eti-23",
      rawEmail: `From: You&#10;To: Team Channel&#10;Subject: (Slack)&#10;&#10;(Draft) - responding to a coworker who used harsh language toward a teammate in the group chat`,
      question: "A coworker used unprofessional, harsh language toward a teammate in a group chat. Which is the best way for you to address it?",
      options: [
        "Hey [Name], that comment came across pretty harshly toward [Teammate] — can we keep feedback constructive in the group chat, or take it to a DM if it's more personal?",
        "Wow, that's a really unprofessional thing to say, everyone can see it.",
        "I'll just stay out of it since it's not really my business."
      ],
      correctIndex: 0,
      explanation: "This response names the specific issue and proposes a constructive fix without publicly shaming the coworker or ignoring harmful behavior altogether."
    },
    {
      id: "eti-24",
      rawEmail: `From: You (Project Lead)&#10;To: Stakeholders&#10;Subject: Project timeline update&#10;&#10;(Draft) - explaining a 2-week delay caused by an unforeseen vendor issue`,
      question: "You need to inform stakeholders about a project delay caused by a vendor issue outside your control. Which version is most professional?",
      options: [
        "Hi all, I want to flag that the project will be delayed by about 2 weeks due to an unexpected vendor issue with [component]. Here's our mitigation plan and the updated timeline — happy to walk through details on our next call.",
        "The project is on track, just some minor adjustments to expect soon (hoping the delay resolves itself before anyone notices).",
        "Sorry, this is delayed because of the vendor, not much we can do, we'll update you when we know more."
      ],
      correctIndex: 0,
      explanation: "This version is transparent about the cause and timeline while showing a concrete plan — rather than being vague, unhelpful, or withholding the true extent of the delay."
    },
    {
      id: "eti-25",
      rawEmail: `From: Intern&#10;To: You (Mentor)&#10;Subject: Feeling lost&#10;&#10;I've asked the same question twice now and I still don't fully get it. I feel bad asking again.`,
      question: "An intern feels embarrassed about re-asking a question. What's the most supportive reply?",
      options: [
        "You should really try to remember things the first time I explain them.",
        "It's in the docs, just re-read the docs I sent you.",
        "No worries at all — this stuff takes a few passes to click for most people. Let's walk through it together one more time, and feel free to ask as many times as you need."
      ],
      correctIndex: 2,
      explanation: "This response normalizes the need to ask again and offers direct help, building psychological safety rather than shaming the intern or deflecting to documentation alone."
    },
    {
      id: "eti-26",
      rawEmail: `From: Colleague&#10;To: You&#10;Subject: Re: Project handoff&#10;&#10;You dropped the ball on the handoff docs, I had no idea what was going on when I picked this up.`,
      question: "A colleague is frustrated about an incomplete handoff. What's the best response?",
      options: [
        "The docs were fine, maybe you just missed something.",
        "You're right, the docs weren't thorough enough and that made things harder for you — I'm sorry. Let me fill in the gaps now, and I'll build a proper handoff template so this doesn't happen again.",
        "I gave you what I had, you could have just asked me if something was unclear."
      ],
      correctIndex: 1,
      explanation: "This response owns the gap, fixes it immediately, and prevents recurrence — instead of shifting responsibility back onto the colleague or denying the issue."
    },
    {
      id: "eti-27",
      rawEmail: `From: Manager&#10;To: You&#10;Subject: Re: Vacation request&#10;&#10;I saw your vacation request but we have a big release that week, can you push it?`,
      question: "Your manager is asking you to postpone planned vacation due to a release. Which reply best balances both needs?",
      options: [
        "That's not my problem, I already requested this time off.",
        "I understand the release is important — my flights and plans are already booked for that week, so could we look at coverage options instead, like [colleague] backing up my part, or shifting my tasks earlier?",
        "Sure, I'll just cancel my trip, the release matters more."
      ],
      correctIndex: 1,
      explanation: "This response respects the business need while protecting personal plans, proposing concrete alternatives — rather than sacrificing the vacation outright or refusing to engage with the request."
    },
    {
      id: "eti-28",
      rawEmail: `From: You&#10;To: Colleague&#10;Subject: (Draft) - responding after a colleague publicly corrected a minor error you made in a meeting, in a slightly condescending tone`,
      question: "A colleague publicly corrected a small mistake you made, in a slightly condescending tone. What's the most professional way to respond in the moment?",
      options: [
        "(Say nothing, but bring it up privately afterward, hoping they realize how they sounded.)",
        "Good catch, thanks — that's the right number, let me update it.",
        "There's no need to be condescending about it, I would have caught that myself."
      ],
      correctIndex: 1,
      explanation: "This response accepts the correction gracefully in the moment, which keeps the meeting on track — bigger tone concerns, if they persist, are better raised privately afterward rather than in the room."
    },
    {
      id: "eti-29",
      rawEmail: `From: Junior Developer&#10;To: You (Senior)&#10;Subject: Code review comments&#10;&#10;Your review comments feel really harsh, I've been dreading opening PRs from you.`,
      question: "A junior developer tells you your code review tone feels harsh. What's the best response?",
      options: [
        "I'm just being thorough, that's what good code review looks like.",
        "Thank you for telling me — that's not the impression I want to give. I'll work on framing feedback more constructively, and please call it out anytime it still feels off.",
        "I didn't realize you were so sensitive about feedback."
      ],
      correctIndex: 1,
      explanation: "This response takes the feedback seriously and commits to change without dismissing the junior developer's discomfort as oversensitivity."
    },
    {
      id: "eti-30",
      rawEmail: `From: Sales Lead&#10;To: Engineering&#10;Subject: Re: Feature request&#10;&#10;The client needs this by Friday or we lose the deal. Just make it happen.`,
      question: "Sales is pressuring engineering with an unrealistic deadline tied to a deal. What's the most constructive engineering response?",
      options: [
        "I want to help us land this deal — realistically, the full feature can't be built safely by Friday. Here's what we could ship by then as a first version, with the rest following the week after.",
        "That's not our timeline to promise, sales shouldn't have committed to that.",
        "Okay, we'll rush it and skip testing to hit Friday."
      ],
      correctIndex: 0,
      explanation: "This response stays solution-oriented by proposing a scoped-down deliverable, rather than blaming sales or compromising quality by skipping safeguards."
    },
    {
      id: "eti-31",
      rawEmail: `From: Colleague&#10;To: You&#10;Subject: (Slack)&#10;&#10;why does it feel like you're always disagreeing with my ideas in meetings? it's getting personal for me.`,
      question: "A colleague feels you're personally targeting their ideas in meetings. How do you best respond?",
      options: [
        "That's really not my intention, and I'm glad you told me. Let's talk it through — I want to make sure disagreement stays about the ideas, not about you.",
        "I only disagree when your ideas actually have problems, that's not personal.",
        "I hadn't noticed, maybe you're just reading into it too much."
      ],
      correctIndex: 0,
      explanation: "This response validates the colleague's experience and opens a real conversation, instead of dismissing their feelings or getting defensive about intent."
    },
    {
      id: "eti-32",
      rawEmail: `From: You&#10;To: Manager&#10;Subject: (Draft) - asking to be considered for a promotion&#10;&#10;(Draft)`,
      question: "You're drafting a message to ask your manager to be considered for a promotion. Which version is most effective?",
      options: [
        "Hi [Manager], [Colleague] got promoted and I've been here longer, so I should get one too.",
        "Hi [Manager], I think I'm overdue for a promotion, can you just make it happen?",
        "Hi [Manager], I'd like to discuss my growth path and being considered for [role]. I've taken ownership of [specific projects/impact] over the past year — could we set aside time to talk through what the path forward looks like?"
      ],
      correctIndex: 2,
      explanation: "This version anchors the request in concrete accomplishments and invites a real conversation about growth, rather than demanding an outcome or comparing unfavorably to a peer."
    },
    {
      id: "eti-33",
      rawEmail: `From: Product Manager&#10;To: You&#10;Subject: Re: Feature spec&#10;&#10;This spec is way too technical, none of the stakeholders will understand it.`,
      question: "A PM says your technical spec is inaccessible to stakeholders. What's the best response?",
      options: [
        "Stakeholders should just ask if they don't understand something.",
        "This is a technical document, it's supposed to be technical.",
        "Good point — let me add a plain-language summary at the top for stakeholders, and keep the technical detail further down for the engineering team."
      ],
      correctIndex: 2,
      explanation: "This response adapts to the audience's actual needs with a concrete fix, rather than putting the burden back on stakeholders or refusing to adjust."
    },
    {
      id: "eti-34",
      rawEmail: `From: Teammate&#10;To: You&#10;Subject: Re: Shared doc&#10;&#10;You deleted my section of the doc without asking, I spent hours on that.`,
      question: "A teammate is upset that you removed their work from a shared document without checking first. What's the best response?",
      options: [
        "You're right, I should have checked with you before removing it — I'm sorry for the lost time. Let's restore it from version history and figure out together what to keep.",
        "You should be using suggestion mode if you don't want your edits touched.",
        "It didn't seem relevant anymore, so I removed it, no big deal."
      ],
      correctIndex: 0,
      explanation: "This response owns the mistake, offers a concrete fix, and treats the teammate's effort as legitimate — instead of minimizing the impact or shifting blame to their tool settings."
    },
    {
      id: "eti-35",
      rawEmail: `From: You&#10;To: Vendor&#10;Subject: (Draft) - responding to a vendor who missed a delivery deadline for the third time&#10;&#10;(Draft)`,
      question: "A vendor has missed a delivery deadline for the third time. Which response is most professional while still holding them accountable?",
      options: [
        "No worries, whenever you get to it is fine, just keep us posted.",
        "This is getting ridiculous, we might just have to find a new vendor.",
        "This is the third missed deadline, and it's affecting our downstream timeline. I need a firm, realistic date by end of day, along with what's causing the delays so we can plan accordingly going forward."
      ],
      correctIndex: 2,
      explanation: "This response is direct about the pattern and its impact while staying professional and solution-focused, rather than either threatening prematurely or letting the pattern continue unaddressed."
    },
    {
      id: "eti-36",
      rawEmail: `From: Coworker&#10;To: You&#10;Subject: (Slack)&#10;&#10;honestly i think the new dress code policy is dumb and i'm not going to follow it, are you with me?`,
      question: "A coworker is trying to recruit you into openly ignoring a new workplace policy. What's the most professional response?",
      options: [
        "That's not my problem, do whatever you want.",
        "Yeah honestly it is pretty dumb, let's just ignore it.",
        "I get that it's an adjustment, but I'd rather raise concerns through the right channel — maybe we bring specific feedback to HR together instead of ignoring it outright."
      ],
      correctIndex: 2,
      explanation: "This response channels disagreement constructively rather than either joining in on rule-breaking or disengaging from a colleague's legitimate frustration."
    },
    {
      id: "eti-37",
      rawEmail: `From: HR&#10;To: You&#10;Subject: Exit interview&#10;&#10;Since you're leaving, we'd like your honest feedback on your time here.`,
      question: "You're leaving a company and asked for honest exit-interview feedback. What's the most professional approach?",
      options: [
        "Say everything was perfect and give no real feedback to avoid any awkwardness.",
        "Vent about every frustration and every person who wronged you, since you're leaving anyway so it doesn't matter.",
        "Share specific, constructive observations (e.g. workload distribution, communication gaps) framed around patterns rather than individuals, along with what worked well."
      ],
      correctIndex: 2,
      explanation: "Honest, specific, and professionally framed feedback is genuinely useful to the organization and preserves your reputation — venting personally or giving no feedback both waste the opportunity."
    },
    {
      id: "eti-38",
      rawEmail: `From: Teammate&#10;To: You&#10;Subject: Re: Pair programming&#10;&#10;I don't think pairing with you is working, you take over the keyboard too much.`,
      question: "A teammate says you dominate the keyboard during pair programming. What's the best response?",
      options: [
        "I just work faster when I'm driving, it's more efficient this way.",
        "Thanks for saying that directly — let's try switching the driver role every 15 minutes so we both get equal time, and call it out if I slip back into old habits.",
        "Maybe pairing just isn't for everyone."
      ],
      correctIndex: 1,
      explanation: "This response accepts the feedback and proposes a concrete structural fix (rotating driver), rather than justifying the behavior or dismissing the practice altogether."
    },
    {
      id: "eti-39",
      rawEmail: `From: You&#10;To: Team&#10;Subject: (Draft) - announcing that a beloved but outdated internal tool will be deprecated&#10;&#10;(Draft)`,
      question: "You need to announce that a widely-used internal tool is being deprecated, which some team members will be unhappy about. Which version is best?",
      options: [
        "Hi team, we'll be deprecating [Tool] on [date] in favor of [Replacement], mainly due to [specific reason]. Here's a migration guide and I'm holding office hours next week for anyone with concerns.",
        "Hi team, [Tool] is being shut down, please migrate everything before it stops working.",
        "Hi team, don't worry about [Tool], it'll probably be around for a while still."
      ],
      correctIndex: 0,
      explanation: "This version gives clear reasoning, a path forward, and support — rather than a bare directive or a vague, potentially misleading reassurance."
    },
    {
      id: "eti-40",
      rawEmail: `From: Manager&#10;To: You&#10;Subject: Re: Team conflict&#10;&#10;Two of your reports are constantly clashing and it's affecting the team. What's your plan?`,
      question: "As a manager, you're asked how you'll handle an ongoing clash between two direct reports. What's the best approach to describe?",
      options: [
        "I'll meet with each of them individually first to understand their perspective, then bring them together to agree on specific working norms going forward, and check in regularly after.",
        "I'll just let them work it out between themselves, it's not really my place to get involved.",
        "I'll tell them both to stop it or face consequences."
      ],
      correctIndex: 0,
      explanation: "This approach investigates before acting and builds a concrete resolution both parties agree to, rather than avoiding the issue or leading with threats."
    },
    {
      id: "eti-41",
      rawEmail: `From: Coworker&#10;To: You&#10;Subject: (Slack)&#10;&#10;can you cover my on-call shift this weekend? something came up.`,
      question: "A coworker asks you to cover their weekend on-call shift on short notice, and you already have plans. What's the best response?",
      options: [
        "Sorry, no, figure it out yourself.",
        "I've got plans I can't move this weekend, so I can't cover the full shift — but I could help you find someone else, or split it if part of the weekend works.",
        "Sure, no problem, I'll cancel my plans."
      ],
      correctIndex: 1,
      explanation: "This response is honest about your constraint while still trying to help find a solution, rather than over-committing or refusing without offering any support."
    },
    {
      id: "eti-42",
      rawEmail: `From: You&#10;To: Team&#10;Subject: (Draft) - responding after realizing you gave the team incorrect information in a meeting earlier that day&#10;&#10;(Draft)`,
      question: "You realize you gave the team incorrect information earlier that day. What's the best way to correct it?",
      options: [
        "Say nothing and hope nobody acted on the incorrect information.",
        "Wait until someone notices the mistake and points it out first.",
        "Correction to what I said earlier: [correct information]. Sorry for the confusion — wanted to flag it right away before anyone acted on the wrong info."
      ],
      correctIndex: 2,
      explanation: "Proactively correcting the error as soon as you notice it prevents downstream mistakes and builds trust — staying silent risks real consequences and looks worse if discovered later."
    },
    {
      id: "eti-43",
      rawEmail: `From: New Manager&#10;To: Team&#10;Subject: Re: Feedback on my first month&#10;&#10;I'd love honest feedback on how my first month as your manager has gone.`,
      question: "A new manager is asking the team for honest feedback on their first month. What's the best way to respond as a team member?",
      options: [
        "Say everything is going great even if you have concerns, since it's still early days.",
        "List every frustration from the past month in detail, since they asked for honesty.",
        "Share 1-2 specific, constructive observations (e.g. 'more context before reassigning tasks would help') alongside something that's working well, delivered privately or in the requested format."
      ],
      correctIndex: 2,
      explanation: "Balanced, specific, and privately-delivered feedback is genuinely useful and safe — empty positivity wastes the opportunity, and an unfiltered list can overwhelm a manager still finding their footing."
    },
    {
      id: "eti-44",
      rawEmail: `From: Colleague&#10;To: You&#10;Subject: (Slack)&#10;&#10;i noticed you didn't invite me to the planning meeting, was that on purpose?`,
      question: "A colleague is asking, somewhat pointedly, whether they were intentionally excluded from a meeting. What's the best response?",
      options: [
        "I don't remember who I invited, maybe it was a mistake, maybe not.",
        "It wasn't really relevant to your role, so I didn't think you needed to be there.",
        "Not intentional at all — that was an oversight on my part. Let me add you now and loop you in on what's been covered so far."
      ],
      correctIndex: 2,
      explanation: "This response takes the concern seriously, apologizes for the oversight, and fixes it immediately, rather than justifying the exclusion or leaving the question unresolved."
    },
    {
      id: "eti-45",
      rawEmail: `From: You&#10;To: Manager&#10;Subject: (Draft) - pushing back on a decision you disagree with, but ultimately need to implement&#10;&#10;(Draft)`,
      question: "You disagree with a decision your manager made but will ultimately need to implement it. Which is the most professional approach?",
      options: [
        "I want to flag my concern about [specific aspect] before we move forward — here's my reasoning. If we still decide to go ahead, I'll fully commit to making it work.",
        "Implement the decision without saying anything, even though you think it's wrong.",
        "Tell your team you disagree with the decision while implementing it, to distance yourself from it."
      ],
      correctIndex: 0,
      explanation: "Raising the concern once, clearly, and then committing fully either way ('disagree and commit') is the professional standard — silently complying wastes useful input, and undermining the decision to your team erodes trust."
    },
    {
      id: "eti-46",
      rawEmail: `From: Coworker&#10;To: You&#10;Subject: (Slack)&#10;&#10;honestly i think our manager plays favorites and it's so obvious, don't you agree?`,
      question: "A coworker is trying to get you to agree with a complaint about favoritism toward a colleague. What's the most professional response?",
      options: [
        "I haven't really noticed that myself, but if you've got specific concerns, it might be worth raising them with [Manager] or HR directly.",
        "Yeah, totally, I've noticed it too, it's so unfair.",
        "I don't want to get into this conversation at all, just drop it."
      ],
      correctIndex: 0,
      explanation: "This response neither joins in on unverified gossip nor shuts the person down completely — it redirects toward a constructive channel for a legitimate concern."
    },
    {
      id: "eti-47",
      rawEmail: `From: You&#10;To: Team&#10;Subject: (Draft) - onboarding message to a new team member joining next week&#10;&#10;(Draft)`,
      question: "You're writing a welcome message to a new team member starting next week. Which version sets the best tone?",
      options: [
        "Hi [Name], welcome, you'll figure things out as you go, that's how we all learned.",
        "Hi [Name], welcome, here's a huge document to read before your first day.",
        "Welcome to the team, [Name]! We're excited to have you starting [date]. I'll send over a short onboarding guide beforehand, and please reach out anytime with questions — no such thing as a silly one here."
      ],
      correctIndex: 2,
      explanation: "This version is warm, sets clear expectations, and lowers the barrier to asking questions — rather than leaving the new hire to sink-or-swim or overwhelming them before they've even started."
    },
    {
      id: "eti-48",
      rawEmail: `From: Client&#10;To: You&#10;Subject: Re: Invoice dispute&#10;&#10;This invoice has an error, you're charging us for work that was never completed.`,
      question: "A client disputes an invoice, claiming they were charged for incomplete work. What's the best first response?",
      options: [
        "Our billing team doesn't typically make mistakes, but I'll check.",
        "Thank you for flagging this — let me pull the project records and verify what was completed versus billed, and I'll get back to you within 24 hours with a corrected invoice if there's an error.",
        "That work was completed, I'm sure the invoice is correct."
      ],
      correctIndex: 1,
      explanation: "This response takes the dispute seriously and commits to verifying facts before responding definitively, rather than being defensive or dismissing the client's claim outright."
    },
    {
      id: "eti-49",
      rawEmail: `From: Teammate&#10;To: You&#10;Subject: (Slack)&#10;&#10;i feel like i'm doing way more work than everyone else on this team and nobody notices.`,
      question: "A teammate feels overworked and unnoticed. What's the most supportive response?",
      options: [
        "That sounds exhausting, and I'm glad you told me. Can we look at the task breakdown together and see if things need rebalancing, and also make sure your contributions are visible to the team?",
        "Everyone feels that way sometimes, try not to worry about it too much.",
        "Maybe you're just slower at your tasks than you think, that's why it feels like more."
      ],
      correctIndex: 0,
      explanation: "This response validates the feeling and moves toward concrete action (rebalancing, visibility), rather than dismissing the concern or subtly blaming the teammate."
    },
    {
      id: "eti-50",
      rawEmail: `From: You&#10;To: Team&#10;Subject: (Draft) - responding to a viral internal complaint thread about unclear project priorities&#10;&#10;(Draft)`,
      question: "An internal thread has blown up with complaints about unclear project priorities. As the lead, how do you best respond?",
      options: [
        "I'll look into it eventually, there's a lot going on right now.",
        "I hear the frustration about unclear priorities — that's on me to fix. I'll share a prioritized roadmap by end of week and set up a standing channel for priority questions going forward.",
        "I think people are overreacting, priorities have been clear from my side."
      ],
      correctIndex: 1,
      explanation: "This response acknowledges the real problem, takes ownership, and commits to a concrete fix — rather than dismissing the concern or deferring it indefinitely."
    },
    {
      id: "eti-51",
      rawEmail: `From: Colleague&#10;To: You&#10;Subject: Re: Design feedback&#10;&#10;Your feedback on my design felt more like you redesigning it than actually giving feedback.`,
      question: "A colleague feels you overstepped by redesigning their work instead of giving feedback. What's the best response?",
      options: [
        "That's fair, I got a bit too hands-on there — my intent was just to illustrate an idea, not take over. Let's talk through the actual concerns so you can decide the direction.",
        "I was just trying to show you the better way to do it.",
        "If you didn't want feedback, you shouldn't have asked for it."
      ],
      correctIndex: 0,
      explanation: "This response acknowledges overstepping and hands ownership back to the colleague, rather than justifying the takeover or framing the colleague as the problem."
    },
    {
      id: "eti-52",
      rawEmail: `From: You&#10;To: Manager&#10;Subject: (Draft) - requesting flexible working hours due to a personal commitment&#10;&#10;(Draft)`,
      question: "You need to ask your manager for flexible hours due to a personal commitment. Which version is most professional?",
      options: [
        "Hi [Manager], I have a recurring personal commitment on [days] that requires some schedule flexibility — I'd shift my hours to [proposed schedule] to make sure my work coverage stays the same. Could we discuss?",
        "Hi [Manager], I probably won't be around at the usual times anymore, just letting you know.",
        "Hi [Manager], I need flexible hours now, hope that's fine."
      ],
      correctIndex: 0,
      explanation: "This version proposes a specific, workable plan and frames it as a discussion, rather than presenting a vague or unilateral change."
    },
    {
      id: "eti-53",
      rawEmail: `From: Coworker&#10;To: You&#10;Subject: (Slack)&#10;&#10;can you write my status update for the client call? i'm swamped and you know the project better anyway.`,
      question: "A coworker asks you to write their status update for a client call, citing their workload. What's the best response?",
      options: [
        "I can share the key project details with you so you can put the update together in your own words — I don't think I should be the one writing it since it needs to come from you.",
        "That's your job, not mine, figure it out.",
        "Sure, send me the format and I'll just write the whole thing for you."
      ],
      correctIndex: 0,
      explanation: "This response offers real help (sharing details) while keeping ownership where it belongs, rather than either enabling avoidance or refusing to help at all."
    },
    {
      id: "eti-54",
      rawEmail: `From: You&#10;To: Team&#10;Subject: (Draft) - responding after a team member publicly took credit for your idea in a company-wide meeting&#10;&#10;(Draft)`,
      question: "A team member took credit for your idea in a company-wide meeting. What's the best way to handle it afterward?",
      options: [
        "Talk to them privately afterward: 'In the meeting, that idea came from our conversation last week — I'd appreciate being included next time this comes up publicly.'",
        "Let it go completely and never mention it, to avoid seeming petty.",
        "Call them out in front of everyone right when it happens to set the record straight."
      ],
      correctIndex: 0,
      explanation: "Addressing it privately and specifically preserves the relationship while still asserting the issue — calling it out publicly can escalate unnecessarily, and staying silent lets the pattern continue."
    },
    {
      id: "eti-55",
      rawEmail: `From: Manager&#10;To: You&#10;Subject: Re: Budget cut&#10;&#10;We need to cut your project budget by 30% starting next quarter, figure out what to deprioritize.`,
      question: "Your manager informs you of a significant budget cut. What's the most constructive response?",
      options: [
        "That's going to be really hard, I don't know if we can make it work at all.",
        "Understood — let me put together a few scenarios showing what we can still deliver at different budget levels, and I'll bring recommendations for what to deprioritize by [date].",
        "This is unfair, we already committed to deliverables based on the old budget."
      ],
      correctIndex: 1,
      explanation: "This response moves quickly to problem-solving with concrete next steps, rather than reacting with only concern or grievance without an actionable path forward."
    },
    {
      id: "eti-56",
      rawEmail: `From: You&#10;To: Colleague&#10;Subject: (Draft) - politely declining a colleague's invitation to a work happy hour due to personal reasons&#10;&#10;(Draft)`,
      question: "You need to decline a colleague's invite to an after-work happy hour without over-explaining personal reasons. What's the best version?",
      options: [
        "I can't come because [long personal explanation you'd rather not share].",
        "Thanks for the invite! I can't make it this time, but I hope it's a great time — count me in for the next one.",
        "Maybe, I'll see how I feel closer to the time (with no intention of going)."
      ],
      correctIndex: 1,
      explanation: "This response declines warmly and clearly without over-sharing or leaving false hope, which is the most respectful way to decline a social invite."
    },
    {
      id: "eti-57",
      rawEmail: `From: Teammate&#10;To: You&#10;Subject: (Slack)&#10;&#10;i think you've been avoiding me since our disagreement last week, are we okay?`,
      question: "A teammate directly asks if things are okay after a past disagreement. What's the best response?",
      options: [
        "I appreciate you asking directly — I don't think I've been avoiding you on purpose, but let's grab coffee and clear the air properly, just in case there's something lingering.",
        "Yeah I'm still a bit annoyed about what happened, so I've been keeping some distance.",
        "No, everything's totally fine, nothing's wrong at all (while still avoiding them)."
      ],
      correctIndex: 0,
      explanation: "This response engages honestly and offers to resolve any lingering tension directly, rather than denying an issue that may exist or admitting distance without offering to fix it."
    },
    {
      id: "eti-58",
      rawEmail: `From: You&#10;To: Manager&#10;Subject: (Draft) - reporting that you made a mistake that caused a minor production issue&#10;&#10;(Draft)`,
      question: "You made a mistake that caused a minor production issue. How do you best report it to your manager?",
      options: [
        "Wanted to flag right away — a change I made caused [specific issue]. It's already fixed / here's my plan to fix it, and here's what I'll do differently to prevent it next time.",
        "Wait to see if anyone notices before saying anything.",
        "Mention it vaguely without specifying that it was your change that caused it."
      ],
      correctIndex: 0,
      explanation: "Prompt, specific, solution-oriented disclosure builds trust and limits damage — waiting or being vague about ownership erodes trust further if discovered later."
    },
    {
      id: "eti-59",
      rawEmail: `From: Colleague&#10;To: You&#10;Subject: Re: Meeting notes&#10;&#10;The notes you sent don't match what I remember being decided at all.`,
      question: "A colleague disputes your meeting notes. What's the most constructive response?",
      options: [
        "Maybe you weren't paying close attention during the meeting.",
        "My notes are accurate, I wrote them right after the meeting.",
        "Let's compare notes — can you share what you remember being decided? I want to make sure whatever we send out is accurate for everyone."
      ],
      correctIndex: 2,
      explanation: "This response treats the discrepancy as something to resolve collaboratively, rather than asserting authority or blaming the colleague's attention."
    },
    {
      id: "eti-60",
      rawEmail: `From: You&#10;To: Team&#10;Subject: (Draft) - responding to repeated tardiness from a team member in daily standups&#10;&#10;(Draft)`,
      question: "A team member is repeatedly late to daily standups. As their lead, what's the best way to address it?",
      options: [
        "Hey [Name], I've noticed you've been joining standup a few minutes late this week — is everything okay, or is there a scheduling conflict we should work around?",
        "Publicly note their lateness in the standup in front of everyone each time it happens.",
        "Say nothing and hope they eventually notice and self-correct."
      ],
      correctIndex: 0,
      explanation: "This response addresses the pattern privately and with curiosity about the cause, rather than public shaming or ignoring a pattern that affects the team."
    },
    {
      id: "eti-61",
      rawEmail: `From: Recruiter&#10;To: You&#10;Subject: Re: Offer&#10;&#10;We can't move on salary, but we can offer more vacation days. Does that work?`,
      question: "A recruiter offers extra vacation days instead of a salary increase you asked for. What's the best response?",
      options: [
        "Extra vacation days are a nice addition — thank you. I'd still like to understand if there's any flexibility on base salary, even a smaller adjustment, since that's my main priority.",
        "Sure, that's fine, I'll just take the vacation days instead.",
        "That's not good enough, I need the full salary increase or I'm walking away."
      ],
      correctIndex: 0,
      explanation: "This response acknowledges the offer positively while still advocating for the original priority, rather than settling immediately or escalating unnecessarily."
    },
    {
      id: "eti-62",
      rawEmail: `From: Colleague&#10;To: You&#10;Subject: (Slack)&#10;&#10;i noticed you've been quiet in meetings lately, everything okay?`,
      question: "A colleague checks in after noticing you've been unusually quiet in meetings. What's the best way to respond if you have been going through a tough time?",
      options: [
        "Why are you even asking, that's kind of a weird thing to bring up.",
        "Everything is completely fine, nothing at all going on (even though there is).",
        "Thanks for noticing and checking in — I've had a lot on my plate lately, but I'm managing. I appreciate you asking."
      ],
      correctIndex: 2,
      explanation: "This response accepts the check-in graciously and shares an appropriate amount without over-disclosing, rather than deflecting entirely or reacting defensively to a caring gesture."
    },
    {
      id: "eti-63",
      rawEmail: `From: You&#10;To: Client&#10;Subject: (Draft) - informing a client that a feature they requested won't be built due to technical constraints&#10;&#10;(Draft)`,
      question: "You need to tell a client that a feature they requested isn't technically feasible as scoped. Which version is best?",
      options: [
        "After reviewing this closely, [Feature] isn't feasible as originally scoped due to [specific constraint]. Here are two alternative approaches that could achieve a similar outcome — happy to walk through the tradeoffs.",
        "We'll try to figure something out eventually (with no real plan or alternative).",
        "This isn't possible, sorry, we'll have to leave it out."
      ],
      correctIndex: 0,
      explanation: "This version is honest about the constraint while offering constructive alternatives, rather than giving a flat no or a vague non-answer."
    },
    {
      id: "eti-64",
      rawEmail: `From: Direct Report&#10;To: You (Manager)&#10;Subject: Re: Workload&#10;&#10;I'm burning out, I don't think I can keep up this pace.`,
      question: "A direct report tells you they're burning out. What's the best response as their manager?",
      options: [
        "Thank you for telling me — your wellbeing matters more than any deadline. Let's go through your workload together and figure out what to redistribute or push back right away.",
        "Everyone's busy right now, we just need to push through this crunch period.",
        "Maybe you need to work on your time management skills."
      ],
      correctIndex: 0,
      explanation: "This response takes the disclosure seriously and acts immediately on workload, rather than normalizing burnout or implying it's a personal failing."
    },
    {
      id: "eti-65",
      rawEmail: `From: Coworker&#10;To: You&#10;Subject: (Slack)&#10;&#10;can you lie for me and tell the manager i was on the call earlier? i wasn't but it'll look bad if she finds out.`,
      question: "A coworker is asking you to lie to your manager on their behalf. What's the most professional way to decline?",
      options: [
        "Sure, I've got your back, I'll tell her you were there.",
        "No way, and I'm telling her what you just asked me to do.",
        "I'm not comfortable saying that since it isn't true — I think it's better if you just let her know directly what happened. I can support you in figuring out how to explain it if that helps."
      ],
      correctIndex: 2,
      explanation: "This response declines the dishonest request firmly but supportively, offering real help instead — rather than complying with deception or escalating punitively."
    },
    {
      id: "eti-66",
      rawEmail: `From: You&#10;To: Team&#10;Subject: (Draft) - responding to a well-meaning but factually incorrect comment made by a senior leader in an all-hands&#10;&#10;(Draft)`,
      question: "A senior leader made a well-meaning but factually incorrect statement in an all-hands meeting. How do you best handle it?",
      options: [
        "Say nothing at all, since correcting a senior leader could be seen as overstepping.",
        "Follow up with them privately afterward: 'Just wanted to flag, the number mentioned for [topic] might be outdated — happy to share the latest figures if useful.'",
        "Correct them publicly in the meeting in front of everyone to make sure the record is set straight immediately."
      ],
      correctIndex: 1,
      explanation: "A private, respectful correction preserves both accuracy and the leader's standing — public correction can embarrass unnecessarily, while silence lets misinformation spread."
    },
    {
      id: "eti-67",
      rawEmail: `From: Peer&#10;To: You&#10;Subject: Re: Shared responsibility&#10;&#10;I feel like I always end up doing the less interesting parts of our shared projects.`,
      question: "A peer feels they're consistently assigned the less interesting parts of shared work. What's the best response?",
      options: [
        "That's a fair thing to raise — let's look at how we've been splitting tasks and agree on a fairer rotation for who gets which part going forward.",
        "The interesting parts usually go to whoever gets there first, that's just how it's worked out.",
        "I didn't realize you cared that much about which parts you get."
      ],
      correctIndex: 0,
      explanation: "This response takes the concern seriously and proposes a fair, ongoing solution, rather than dismissing it or defending an ad-hoc status quo."
    },
    {
      id: "eti-68",
      rawEmail: `From: You&#10;To: Manager&#10;Subject: (Draft) - disagreeing with being assigned as the sole owner of a high-risk, under-resourced project&#10;&#10;(Draft)`,
      question: "You've been assigned as sole owner of a high-risk project without enough resources. How do you best raise this with your manager?",
      options: [
        "I want to flag a concern before taking this on: given [specific risks], I don't think I can deliver this safely without [additional resource/support]. Can we discuss what's realistic?",
        "Refuse the project outright without explaining your reasoning.",
        "Just accept the assignment and hope it works out somehow."
      ],
      correctIndex: 0,
      explanation: "This response raises specific, evidence-based concerns and proposes a path forward, rather than silently accepting an unreasonable setup or refusing without justification."
    },
    {
      id: "eti-69",
      rawEmail: `From: Colleague&#10;To: You&#10;Subject: (Slack)&#10;&#10;i saw you talking to hr today, is everything okay? are you leaving?`,
      question: "A colleague is prying about a private HR conversation you had. What's the best response?",
      options: [
        "That's none of your business, why are you even asking that.",
        "Yeah I was talking about leaving actually, don't tell anyone though.",
        "I'd rather keep that between me and HR for now, but thanks for checking in on me."
      ],
      correctIndex: 2,
      explanation: "This response protects your privacy warmly without oversharing or reacting harshly to a nosy but likely well-intentioned question."
    },
    {
      id: "eti-70",
      rawEmail: `From: You&#10;To: Team&#10;Subject: (Draft) - responding after your idea was rejected in favor of a competing proposal you disagree with&#10;&#10;(Draft)`,
      question: "Your idea was rejected in favor of a competing proposal you still disagree with. How do you respond professionally?",
      options: [
        "Quietly work in ways that make the chosen approach more likely to fail so your idea looks better in hindsight.",
        "I still think [my approach] had some advantages worth remembering if [competing approach] runs into issues, but I'm fully on board with moving forward with the team's decision.",
        "Keep bringing up your rejected idea repeatedly in every subsequent meeting."
      ],
      correctIndex: 1,
      explanation: "This response accepts the decision and commits to it while preserving your perspective for the record, rather than undermining the team's choice or relitigating it endlessly."
    },
    {
      id: "eti-71",
      rawEmail: `From: Client&#10;To: You&#10;Subject: Re: Contract renewal&#10;&#10;We're considering not renewing because a competitor is offering a lower price.`,
      question: "A client is threatening not to renew due to a competitor's lower price. What's the best response?",
      options: [
        "Our price is fair for the value we provide, so we won't be adjusting anything.",
        "We can't compete on price, so there's not much we can do.",
        "I appreciate you being upfront about this. Before we talk pricing, can we walk through what's been working and what hasn't on our end — I want to make sure we're solving the right problem, not just matching a number."
      ],
      correctIndex: 2,
      explanation: "This response seeks to understand the real concern before reacting on price alone, rather than conceding immediately or dismissing the client's comparison outright."
    },
    {
      id: "eti-72",
      rawEmail: `From: Teammate&#10;To: You&#10;Subject: (Slack)&#10;&#10;i think our manager is going to lay some of us off soon, i heard it from someone in finance.&#10;&#10;you should probably start looking for a new job just in case.`,
      question: "A teammate shares unverified layoff rumors and suggests you start job hunting. What's the most level-headed response?",
      options: [
        "That rumor is definitely not true, don't even think about it.",
        "Oh no, I need to start applying to jobs right now just in case.",
        "I appreciate you giving me a heads up, but since it's not confirmed, I'd rather not make big decisions off a rumor — I'll keep an eye out for anything official though."
      ],
      correctIndex: 2,
      explanation: "This response takes the information in without overreacting to an unverified rumor or dismissing it outright, staying grounded until there's confirmed information."
    },
    {
      id: "eti-73",
      rawEmail: `From: You&#10;To: Manager&#10;Subject: (Draft) - requesting to switch teams due to a difficult working relationship with your current lead&#10;&#10;(Draft)`,
      question: "You want to request a team switch due to a difficult relationship with your current lead. Which version is most professional?",
      options: [
        "I don't want to say why, I just want to be moved to a new team quietly.",
        "I need to switch teams immediately, my lead is impossible to work with and I can't take it anymore.",
        "I'd like to explore moving to a different team. I've tried to work through some friction with my current lead directly, but I think a change would help me contribute at my best — happy to discuss."
      ],
      correctIndex: 2,
      explanation: "This version is honest about wanting change, shows you tried to resolve things first, and stays professional — rather than venting or withholding context that would help your manager act."
    },
    {
      id: "eti-74",
      rawEmail: `From: Teammate&#10;To: You&#10;Subject: (Slack)&#10;&#10;i think you're being too nice in your feedback, people don't actually improve unless you're blunt with them.`,
      question: "A teammate suggests you should be harsher when giving feedback. What's the best response?",
      options: [
        "You're right, I should probably be a lot harsher from now on.",
        "I think feedback can be direct and kind at the same time — I'd rather people feel safe enough to actually hear it and act on it, than shut down from bluntness.",
        "I'll give feedback however I want, that's not up for discussion."
      ],
      correctIndex: 1,
      explanation: "This response holds a thoughtful position on tone without being defensive or simply agreeing to change an approach that's actually working."
    },
    {
      id: "eti-75",
      rawEmail: `From: You&#10;To: Colleague&#10;Subject: (Draft) - congratulating a colleague on a promotion you also applied for&#10;&#10;(Draft)`,
      question: "A colleague got a promotion you also applied for. How do you respond most professionally?",
      options: [
        "Congrats I guess, though I think I was equally if not more qualified.",
        "Congratulations, [Name] — really well deserved. I'd love to grab time with my manager to understand what I can focus on for next time.",
        "Ignore the news entirely and avoid the colleague for a while."
      ],
      correctIndex: 1,
      explanation: "This response is genuinely gracious while still advocating for your own growth afterward, rather than undercutting the colleague's achievement or withdrawing socially."
    },
    {
      id: "eti-76",
      rawEmail: `From: Manager&#10;To: You&#10;Subject: Re: Mistake in client deliverable&#10;&#10;The client caught an error in the report we sent — how did this happen?`,
      question: "Your manager is asking how an error reached a client deliverable. What's the best way to respond?",
      options: [
        "I'm not totally sure, maybe it was a typo or something.",
        "Here's what happened: [specific cause]. I've already corrected it and sent an update to the client, and I'm adding a review step to catch this before send-off going forward.",
        "I did check it, so I'm not sure how the client even found an error."
      ],
      correctIndex: 1,
      explanation: "This response gives a clear, specific account, shows the fix was already made, and proposes a process improvement — rather than being vague or implicitly denying responsibility."
    },
    {
      id: "eti-77",
      rawEmail: `From: Coworker&#10;To: You&#10;Subject: (Slack)&#10;&#10;i noticed you've stopped putting your camera on in meetings, is something up?`,
      question: "A coworker asks about a change in your meeting behavior (camera off) in a caring way. What's the best response?",
      options: [
        "Thanks for asking — nothing's wrong, just been more comfortable that way lately, but I appreciate you checking in.",
        "That's a really weird thing to bring up, mind your own business.",
        "(Ignore the message entirely without responding.)"
      ],
      correctIndex: 0,
      explanation: "This response accepts the caring check-in graciously while keeping the reason private if you'd prefer, rather than reacting defensively or ignoring a kind gesture."
    },
    {
      id: "eti-78",
      rawEmail: `From: You&#10;To: Team&#10;Subject: (Draft) - responding to a well-liked team member's proposal that you believe is technically flawed&#10;&#10;(Draft)`,
      question: "A popular team member proposed something you believe is technically flawed. How do you raise this without it feeling personal?",
      options: [
        "I really like the direction here — one thing I want to stress-test is [specific technical concern], since it could affect [impact]. Can we dig into that part together?",
        "Say the whole idea is flawed and shouldn't move forward at all.",
        "Say nothing in the meeting since the idea is popular, but complain about it privately to others afterward."
      ],
      correctIndex: 0,
      explanation: "This response engages with the specific technical issue constructively and publicly, rather than undermining privately or rejecting the whole idea without nuance."
    },
    {
      id: "eti-79",
      rawEmail: `From: Client&#10;To: You&#10;Subject: Re: Feature timeline&#10;&#10;Your competitor said they could do this in half the time, can you match that?`,
      question: "A client compares your timeline unfavorably to a competitor's claim. What's the most professional response?",
      options: [
        "I can't speak to their process, but I can walk you through exactly what goes into our timeline so you can judge for yourself — and see if there's anything we can safely streamline together.",
        "They're probably lying about that timeline, don't believe them.",
        "Sure, we can match that timeline (even though it isn't realistic)."
      ],
      correctIndex: 0,
      explanation: "This response stays honest and transparent about your own process rather than disparaging a competitor or over-promising to win the comparison."
    },
    {
      id: "eti-80",
      rawEmail: `From: Direct Report&#10;To: You (Manager)&#10;Subject: Re: Career growth&#10;&#10;I feel stuck, like there's no path for me to grow here.`,
      question: "A direct report expresses feeling stuck in their career growth. What's the best response as their manager?",
      options: [
        "Growth takes time, just keep doing good work and it'll happen eventually.",
        "Maybe this isn't the right company for you if you feel that way.",
        "That's important to talk through — let's map out what growth could look like for you here, including specific skills or projects that could get you there, and revisit it regularly."
      ],
      correctIndex: 2,
      explanation: "This response takes the concern seriously and builds a concrete plan, rather than offering vague reassurance or prematurely suggesting they leave."
    },
    {
      id: "eti-81",
      rawEmail: `From: You&#10;To: Colleague&#10;Subject: (Draft) - asking a colleague to stop making jokes at your expense in team meetings&#10;&#10;(Draft)`,
      question: "A colleague keeps making jokes at your expense in team meetings, and you want it to stop. What's the best way to raise this?",
      options: [
        "Make an equally cutting joke back at them in the next meeting.",
        "Say nothing and just laugh along even though it bothers you.",
        "Hey, can we talk for a sec? The jokes about me in meetings have been landing wrong for me lately — I'd appreciate it if we could dial that back."
      ],
      correctIndex: 2,
      explanation: "Raising it directly and privately is the clearest way to change the pattern, rather than tolerating it silently or escalating with a retaliatory joke."
    },
    {
      id: "eti-82",
      rawEmail: `From: Manager&#10;To: You&#10;Subject: Re: Idea&#10;&#10;I really like your idea, but I don't think leadership will go for it.`,
      question: "Your manager likes your idea personally but doubts leadership will approve it. What's the best response?",
      options: [
        "That's disappointing, I guess there's no point pursuing it then.",
        "Leadership never wants to try anything new around here.",
        "I appreciate that — would it help if I put together a short business case addressing likely concerns, so we have something concrete to bring to leadership together?"
      ],
      correctIndex: 2,
      explanation: "This response looks for a constructive way forward despite the doubt, rather than giving up immediately or venting frustration about leadership."
    },
    {
      id: "eti-83",
      rawEmail: `From: Coworker&#10;To: You&#10;Subject: (Slack)&#10;&#10;can you approve my PR real quick without really reviewing it? i just need it merged fast.`,
      question: "A coworker asks you to rubber-stamp a pull request without actually reviewing it. What's the most professional response?",
      options: [
        "I want to help you move fast, but I'd rather do a quick real review than just approve blind — give me 10 minutes and I'll get it back to you.",
        "No, I'm not approving anything of yours ever again without a full review.",
        "Sure, approving now, no worries."
      ],
      correctIndex: 0,
      explanation: "This response protects code quality while still being responsive and helpful, rather than compromising standards or reacting punitively to the request."
    },
    {
      id: "eti-84",
      rawEmail: `From: You&#10;To: Team&#10;Subject: (Draft) - responding after being asked in a meeting a technical question you don't know the answer to&#10;&#10;(Draft)`,
      question: "You're asked a technical question in a meeting that you genuinely don't know the answer to. What's the best response?",
      options: [
        "Good question — I don't want to guess and give you the wrong answer. Let me check and follow up by [specific time] today.",
        "Give a vague, confident-sounding answer that might not actually be correct.",
        "Say 'I don't know' and move on without committing to find out."
      ],
      correctIndex: 0,
      explanation: "This response is honest about the gap while committing to close it, which builds more trust than guessing or leaving the question unresolved."
    },
    {
      id: "eti-85",
      rawEmail: `From: You&#10;To: Manager&#10;Subject: (Draft) - explaining you need to leave a meeting early for a personal appointment&#10;&#10;(Draft)`,
      question: "You need to leave a recurring meeting early for a personal appointment. What's the best way to communicate this?",
      options: [
        "Say you have 'something come up' without any specifics, right as the meeting starts.",
        "Heads up, I'll need to drop off the call at [time] today for a personal appointment — happy to catch up on anything I miss afterward.",
        "Just leave the meeting silently without saying anything."
      ],
      correctIndex: 1,
      explanation: "Giving advance, clear notice with an offer to catch up respects everyone's time and avoids confusion, unlike leaving unannounced or a vague last-minute mention."
    },
    {
      id: "eti-86",
      rawEmail: `From: Colleague&#10;To: You&#10;Subject: (Slack)&#10;&#10;i think you should have backed me up more in that meeting when the client pushed back on my proposal.`,
      question: "A colleague feels you didn't support them enough during a client pushback. What's the best response?",
      options: [
        "That's fair feedback — I should have jumped in more clearly to back your reasoning. Let's debrief on the client's concerns and figure out our joint next move.",
        "I didn't necessarily agree with your proposal either, so I wasn't going to pretend otherwise.",
        "I didn't think you needed backup, you seemed to be handling it fine."
      ],
      correctIndex: 0,
      explanation: "This response accepts the feedback and moves toward collaborative next steps, rather than revealing disagreement in a way that undermines the colleague further or dismissing their need for support."
    },
    {
      id: "eti-87",
      rawEmail: `From: You&#10;To: Team&#10;Subject: (Draft) - responding to repeated scope creep requests from a well-meaning stakeholder&#10;&#10;(Draft)`,
      question: "A well-meaning stakeholder keeps adding small requests that add up to significant scope creep. How do you address this?",
      options: [
        "I want to make sure we can deliver everything well — could we log new requests like this in a backlog and review together which ones fit in this phase versus the next?",
        "Tell the stakeholder to stop making requests entirely.",
        "Just keep saying yes to each small request since they seem minor individually."
      ],
      correctIndex: 0,
      explanation: "This response creates a sustainable process for handling requests without shutting the stakeholder down or letting scope creep continue unchecked."
    },
    {
      id: "eti-88",
      rawEmail: `From: Manager&#10;To: You&#10;Subject: Re: Team restructuring&#10;&#10;Your role is changing as part of a reorg — some of your responsibilities are moving to another team.`,
      question: "Your manager informs you that your role is changing due to a reorg. What's the most constructive response?",
      options: [
        "Okay (with no further engagement, planning to quietly start job hunting).",
        "This feels like a demotion, I don't think this is fair to me.",
        "Thanks for letting me know directly — could we talk through what my responsibilities will look like going forward, and how this affects my growth path?"
      ],
      correctIndex: 2,
      explanation: "This response engages constructively to understand the change and its implications, rather than reacting defensively or disengaging without seeking clarity."
    },
    {
      id: "eti-89",
      rawEmail: `From: Coworker&#10;To: You&#10;Subject: (Slack)&#10;&#10;i heard you're the one who reported the issue with my expense report to finance, is that true?`,
      question: "A coworker confronts you, believing you reported an issue with their expense report. What's the best response if you genuinely didn't do this?",
      options: [
        "Get defensive and demand to know who told them that, without addressing the actual question.",
        "I'm not going to say whether it was me or not.",
        "That wasn't me — I haven't spoken to finance about your expenses at all. If you want, I'm happy to help you figure out where that idea might have come from."
      ],
      correctIndex: 2,
      explanation: "This response answers the direct question honestly and calmly, offering to help clear up confusion, rather than being evasive or escalating defensively."
    },
    {
      id: "eti-90",
      rawEmail: `From: You&#10;To: Team&#10;Subject: (Draft) - responding to a teammate who consistently submits work at the last possible minute, technically meeting deadlines but stressing the team&#10;&#10;(Draft)`,
      question: "A teammate consistently submits work right at the deadline, technically on time but creating stress for the team. How do you best raise this?",
      options: [
        "Say nothing since they're technically meeting the deadline every time.",
        "I've noticed things tend to land right at the deadline, which makes it tight for review on our end — could we agree on an internal buffer, like submitting a day early when possible?",
        "Move the actual deadline earlier without telling them, to trick them into submitting sooner."
      ],
      correctIndex: 1,
      explanation: "This response names the real impact and proposes a transparent process fix, rather than tolerating ongoing stress or resorting to a manipulative workaround."
    },
    {
      id: "eti-91",
      rawEmail: `From: Client&#10;To: You&#10;Subject: Re: Feedback session&#10;&#10;Honestly, this whole engagement has felt disorganized from our side.`,
      question: "A client gives blunt, general negative feedback about the engagement. What's the best first response?",
      options: [
        "I'm surprised to hear that, I thought things were going well.",
        "We've had a lot of internal changes, that's probably why it feels that way.",
        "Thank you for the honesty — that's valuable and I want to understand it better. Could you walk me through one or two specific moments where it felt disorganized, so I can address the real root causes?"
      ],
      correctIndex: 2,
      explanation: "This response welcomes the feedback and seeks specifics to act on, rather than being surprised/defensive or explaining away the issue with internal excuses."
    },
    {
      id: "eti-92",
      rawEmail: `From: You&#10;To: Team&#10;Subject: (Draft) - responding after noticing a pattern of one voice dominating brainstorm sessions&#10;&#10;(Draft)`,
      question: "You've noticed one person consistently dominates brainstorm sessions, leaving less room for others. How do you address this as the facilitator?",
      options: [
        "Directly call out the dominant person in the next session for talking too much.",
        "Keep running sessions the same way and hope quieter voices eventually speak up.",
        "For our next brainstorm, let's try a round-robin format where everyone shares an idea before we open up discussion, so we get a wider range of input first."
      ],
      correctIndex: 2,
      explanation: "This response changes the structure to fix the pattern for everyone, rather than singling someone out publicly or hoping the dynamic resolves itself."
    },
    {
      id: "eti-93",
      rawEmail: `From: Manager&#10;To: You&#10;Subject: Re: Team survey results&#10;&#10;Your team's engagement scores dropped this quarter, what's your read on it?`,
      question: "Your manager asks about a drop in your team's engagement scores. What's the most constructive response?",
      options: [
        "I want to dig into the specifics rather than guess — let me talk to the team directly about what's changed, and I'll come back with a clearer picture and a plan.",
        "Scores like that don't really mean much, people are probably just in a bad mood.",
        "I'm not sure, maybe it's just a rough patch, it'll probably fix itself."
      ],
      correctIndex: 0,
      explanation: "This response commits to real investigation and action, rather than dismissing the data or hoping the problem resolves without intervention."
    },
    {
      id: "eti-94",
      rawEmail: `From: Coworker&#10;To: You&#10;Subject: (Slack)&#10;&#10;i noticed you get way more support from our manager than the rest of us, must be nice.`,
      question: "A coworker implies you're getting favoritism from your manager. What's the best way to respond?",
      options: [
        "I mean, I do work harder than most people, so maybe that's why.",
        "I hadn't thought about it that way — if you feel like support is uneven across the team, that seems worth raising with our manager directly so it's addressed for everyone.",
        "That's not true at all, I don't get any special treatment."
      ],
      correctIndex: 1,
      explanation: "This response takes the underlying concern seriously and redirects it constructively, rather than denying it defensively or implying the coworker is less deserving."
    },
    {
      id: "eti-95",
      rawEmail: `From: You&#10;To: Team&#10;Subject: (Draft) - responding to a proposal to permanently cut team lunch/social budget to save costs&#10;&#10;(Draft)`,
      question: "Leadership proposes permanently cutting the team's social budget to save costs, and morale concerns come up. How do you best raise this?",
      options: [
        "I understand the cost pressure — could we look at a smaller but still meaningful version of the social budget, since it's had a real impact on team morale and retention?",
        "That's fine, whatever leadership decides is fine, no pushback needed.",
        "This is a terrible idea and will destroy team morale completely."
      ],
      correctIndex: 0,
      explanation: "This response acknowledges the real constraint while advocating with a specific compromise, rather than overreacting or accepting the cut without any input."
    },
    {
      id: "eti-96",
      rawEmail: `From: Coworker&#10;To: You&#10;Subject: (Slack)&#10;&#10;honestly i think you got the promotion because you're closer with the manager, not because you earned it.`,
      question: "A coworker suggests your promotion was due to favoritism rather than merit. What's the best way to respond?",
      options: [
        "Maybe you're right, I guess I did get lucky with the relationship.",
        "That's a really unfair thing to say, I earned this completely on my own.",
        "I can understand why that might sting if it's not clear why the decision was made — I'm happy to share what I focused on this past year if that's useful, and it might help to ask our manager directly about the criteria too."
      ],
      correctIndex: 2,
      explanation: "This response responds to a painful accusation with empathy and transparency rather than defensiveness or false modesty that concedes an unfounded claim."
    },
    {
      id: "eti-97",
      rawEmail: `From: You&#10;To: Manager&#10;Subject: (Draft) - flagging that a teammate's repeated absences are affecting your shared deliverables&#10;&#10;(Draft)`,
      question: "A teammate's repeated absences are affecting shared deliverables, and you need to flag this to your manager. What's the best approach?",
      options: [
        "Complain about the teammate to other colleagues instead of raising it with your manager.",
        "Say nothing and just quietly absorb the extra work yourself every time.",
        "I wanted to flag that [Teammate]'s absences have affected [specific deliverable] a couple of times recently — not trying to get them in trouble, just want to make sure we can plan around it going forward."
      ],
      correctIndex: 2,
      explanation: "This response raises the issue through the right channel with a constructive framing, rather than silently overloading yourself or venting sideways instead of addressing it."
    },
    {
      id: "eti-98",
      rawEmail: `From: Client&#10;To: You&#10;Subject: Re: Miscommunication&#10;&#10;I feel like every time we talk, we come away with different understandings of what was agreed.`,
      question: "A client feels recurring miscommunication is happening after your conversations. What's the best response?",
      options: [
        "That happens sometimes, we'll try to be clearer I guess.",
        "I think you might just be misremembering our conversations.",
        "That's a fair concern — from now on, I'll send a short written summary after each call so we're both aligned on what was agreed before moving forward."
      ],
      correctIndex: 2,
      explanation: "This response proposes a concrete process fix (written summaries) rather than blaming the client's memory or offering only a vague acknowledgment."
    },
    {
      id: "eti-99",
      rawEmail: `From: You&#10;To: Team&#10;Subject: (Draft) - responding after realizing a decision you championed turned out to be the wrong call&#10;&#10;(Draft)`,
      question: "A decision you strongly championed turned out to be wrong. How do you best address this with the team?",
      options: [
        "Quietly hope everyone forgets whose idea it originally was.",
        "I want to own this — the direction I pushed for didn't pan out the way I expected. Here's what I think we should do now, and what I've learned for next time.",
        "Point out that others agreed to it too, so it wasn't only your call."
      ],
      correctIndex: 1,
      explanation: "This response takes clear ownership and moves forward constructively, rather than deflecting responsibility or hoping the mistake goes unnoticed."
    },
    {
      id: "eti-100",
      rawEmail: `From: Coworker&#10;To: You&#10;Subject: (Slack)&#10;&#10;can you tell our manager that the delay on my part was actually caused by a dependency on your team? it wasn't really, but it'd help me.`,
      question: "A coworker asks you to falsely tell your manager that a delay was caused by your team instead of theirs. What's the best response?",
      options: [
        "Absolutely not, and I'm telling our manager exactly what you just asked me.",
        "Sure, I'll cover for you this once.",
        "I'm not comfortable saying that since it isn't accurate — but if there's a real reason for the delay, I'm glad to help you think through how to explain it honestly."
      ],
      correctIndex: 2,
      explanation: "This response declines the dishonest request while still offering genuine support, rather than complying with the falsehood or reacting punitively."
    },
  ];

  const etiquetteSets = chunkIntoSets(etiquetteChallenges, 10);
  const currentSetQuestions = etiquetteSet !== null ? etiquetteSets[etiquetteSet] : [];
  const currentEtiquette = etiquetteSet !== null ? currentSetQuestions[etiquetteIndex] : undefined;

  const handleEtiquetteSubmit = (index: number) => {
    if (!currentEtiquette || etiquetteSubmitted[currentEtiquette.id]) return;
    setEtiquetteAnswers(prev => ({ ...prev, [currentEtiquette.id]: index }));
    setEtiquetteSubmitted(prev => ({ ...prev, [currentEtiquette.id]: true }));
    if (index === currentEtiquette.correctIndex) {
      onAddScore(15);
      const answeredCount = Object.keys(etiquetteSubmitted).length + 1;
      if (answeredCount >= etiquetteChallenges.length && !progress.completedLessons.includes('soft-etiquette')) {
        onCompleteLesson('soft-etiquette');
        onAddScore(25);
      }
    }
  };

  const handleNextEtiquette = () => {
    if (etiquetteIndex < currentSetQuestions.length - 1) {
      setEtiquetteIndex(prev => prev + 1);
    } else {
      // Reached the end of this set — return to the set picker
      setEtiquetteSet(null);
      setEtiquetteIndex(0);
    }
  };

  const pickEtiquetteSet = (setIdx: number) => {
    setEtiquetteSet(setIdx);
    setEtiquetteIndex(0);
  };

  const navItems: SideNavItem[] = [
    { id: 'conflict', label: 'Conflict Resolution', icon: <HeartIcon size={18} /> },
    { id: 'negotiation', label: 'Negotiation Sandbox', icon: <BriefcaseIcon size={18} /> },
    { id: 'etiquette', label: 'Email Etiquette', icon: <MailIcon size={18} />, count: etiquetteSets.length },
  ];

  const heroByTab: Record<string, { title: string; subtitle: string; color: string; tint: string }> = {
    conflict: { title: 'Conflict Resolution Quest', subtitle: 'Navigate a high-stakes team dispute while protecting morale, trust and delivery.', color: 'var(--accent-cyan)', tint: 'rgba(37,99,235,0.12)' },
    negotiation: { title: 'Negotiation Sandbox', subtitle: 'Practice advocating for your market value while keeping recruiter rapport high.', color: 'var(--accent)', tint: 'var(--accent-soft)' },
    etiquette: { title: 'Email Etiquette Polisher', subtitle: 'Rewrite tense workplace emails into clear, diplomatic messages.', color: 'var(--accent-amber)', tint: 'rgba(217,119,6,0.12)' },
  };

  const currentHero = heroByTab[activeTab];

  return (
    <div className="animate-slide-up">
      <SectionHero
        icon={<HeartIcon size={26} />}
        title={currentHero.title}
        subtitle={currentHero.subtitle}
        color={currentHero.color}
        tint={currentHero.tint}
        right={
          <span className="hero-skill-ill hero-skill-ill-solo" style={{ color: currentHero.color }}>
            <SkillIllustration kind="softskills" size={84} />
          </span>
        }
      />

      <div className="section-shell">
        <SideNav items={navItems} active={activeTab} onSelect={(id) => setActiveTab(id as typeof activeTab)} />

        <div className="panel-swap" key={activeTab}>

      {/* CONFLICT TAB */}
      {activeTab === 'conflict' && (
        <div className="grid-dashboard">
          
          {/* Main workspace */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <span className="badge badge-cyan" style={{ marginBottom: '8px' }}>Scenario: Test Coverage Dispute</span>
              <h3 style={{ fontSize: '1.2rem', lineHeight: '1.5', marginBottom: '16px' }}>
                {conflictNodes[currentNodeId].text}
              </h3>
            </div>

            {/* Simulation Feedback history */}
            {simulationHistory.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                <h5 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Recent Step Feedback</h5>
                <p style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>{simulationHistory[simulationHistory.length - 1]}</p>
              </div>
            )}

            {/* Options */}
            {!isConflictFinished ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {conflictNodes[currentNodeId].options.map((option, idx) => (
                  <button
                    key={idx}
                    className="quiz-option"
                    onClick={() => handleConflictOption(option)}
                    style={{ margin: 0 }}
                  >
                    <div className="option-indicator">{idx + 1}</div>
                    <span>{option.text}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
                <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                  <h4 style={{ color: (morale >= 40 && trust >= 40 && delivery >= 40) ? 'var(--accent-emerald)' : 'var(--accent-rose)', marginBottom: '8px' }}>
                    {(morale >= 40 && trust >= 40 && delivery >= 40) ? 'Scenario Passed Successfully! (+60 XP)' : 'Scenario Failed (Metrics Too Low)'}
                  </h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {(morale >= 40 && trust >= 40 && delivery >= 40) 
                      ? 'You successfully navigated the competing interests of David and Clara while maintaining system delivery.' 
                      : 'The friction in your team was too severe, resulting in attrition or project failure. Try a more collaborative, empathy-driven approach.'}
                  </p>
                </div>

                <button className="btn btn-primary" onClick={handleResetConflict} style={{ alignSelf: 'flex-start' }}>
                  <RefreshIcon size={18} />
                  Restart Simulator
                </button>
              </div>
            )}
          </div>

          {/* Metrics dashboard */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <h4 style={{ fontSize: '1.1rem' }}>Team Metrics Scorecard</h4>
              <Meter label="Team Morale" value={morale} color={morale >= 50 ? 'var(--accent-emerald)' : 'var(--accent-rose)'} />
              <Meter label="CTO & Manager Trust" value={trust} color={trust >= 50 ? 'var(--accent-cyan)' : 'var(--accent-rose)'} />
              <Meter label="Project Delivery Stability" value={delivery} color={delivery >= 50 ? 'var(--accent-violet)' : 'var(--accent-rose)'} />
              <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '14px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <ProgressRing
                  percentage={Math.round((morale + trust + delivery) / 3)}
                  size={64}
                  stroke={6}
                  color="var(--accent)"
                />
                <div>
                  <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', fontWeight: 600 }}>Overall Standing</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Keep every metric above 40 to pass.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEGOTIATION TAB */}
      {activeTab === 'negotiation' && (
        <div className="grid-dashboard">
          
          {/* Active Logs and Dialog */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <span className="badge badge-cyan" style={{ marginBottom: '8px' }}>Salary Negotiation Sandbox</span>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Current base offer: <span className="gradient-text-cyan-violet" style={{ fontSize: '1.5rem', fontWeight: 800 }}>${currentOffer.toLocaleString()}</span></h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Practice negotiating salary with a simulated Recruiter. Build rapport while advocating for your market value.
              </p>
            </div>

            {/* Negotiation log */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '250px', overflowY: 'auto', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
              {negotiationLog.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Recruiter: 'We are thrilled to offer you the Software Engineer role at $85,000 base salary. What are your thoughts?'</p>
              ) : (
                negotiationLog.map((log, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: idx < negotiationLog.length - 1 ? '1px solid var(--card-border)' : 'none', paddingBottom: '8px' }}>
                    {log.split('\n').map((line, lidx) => (
                      <p key={lidx} style={{ 
                        fontSize: '0.875rem', 
                        color: line.startsWith('Candidate:') ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                        fontWeight: line.startsWith('Candidate:') ? 600 : 400
                      }}>
                        {line}
                      </p>
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Options */}
            {!negotiationFinished ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h5 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Choose your response strategy:</h5>
                <button className="quiz-option" onClick={() => handleNegotiationChoice('collaborative')} style={{ margin: 0 }}>
                  <div className="option-indicator">C</div>
                  <div>
                    <strong>Collaborative Ask:</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>Acknowledge offer, propose range backed by market data, check for flexibility.</div>
                  </div>
                </button>
                <button className="quiz-option" onClick={() => handleNegotiationChoice('aggressive')} style={{ margin: 0 }}>
                  <div className="option-indicator">A</div>
                  <div>
                    <strong>Demanding / Competitive Ask:</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>State a high target, declare current offer is below standard, threaten to walk.</div>
                  </div>
                </button>
                <button className="quiz-option" onClick={() => handleNegotiationChoice('passive')} style={{ margin: 0 }}>
                  <div className="option-indicator">P</div>
                  <div>
                    <strong>Passive Accept:</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>Immediately accept the initial base salary without negotiation.</div>
                  </div>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                  <h4 style={{ color: (currentOffer > 85000 && recruiterRapport >= 40) ? 'var(--accent-emerald)' : 'var(--accent-rose)', marginBottom: '8px' }}>
                    {(currentOffer > 85000 && recruiterRapport >= 40) ? 'Negotiation Complete! (+50 XP)' : 'Negotiation Terminated'}
                  </h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {(currentOffer > 85000 && recruiterRapport >= 40)
                      ? `Successful result. You closed at a base salary of $${currentOffer.toLocaleString()} with decent recruiter rapport (${recruiterRapport}%).`
                      : recruiterRapport < 40 
                        ? 'The recruiter felt your tone was too aggressive, leading to friction or withdrawal of the offer. Avoid combative demands.'
                        : `You accepted the initial offer of $${currentOffer.toLocaleString()} without capturing additional value. Practice collaborative negotiation to secure better base figures.`
                    }
                  </p>
                </div>

                <button className="btn btn-primary" onClick={handleResetNegotiation} style={{ alignSelf: 'flex-start' }}>
                  <RefreshIcon size={18} />
                  Restart Sandbox
                </button>
              </div>
            )}
          </div>

          {/* Rapport status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', justifyContent: 'center' }}>
              <h4 style={{ fontSize: '1.1rem', alignSelf: 'flex-start' }}>Recruiter Relations</h4>
              
              <div className="circle-progress-container">
                <svg width="120" height="120">
                  <circle cx="60" cy="60" r="50" className="circle-progress-bg" />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    className="circle-progress-fill"
                    style={{
                      stroke: recruiterRapport >= 50 ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                      strokeDasharray: 2 * Math.PI * 50,
                      strokeDashoffset: (2 * Math.PI * 50) - (recruiterRapport / 100) * (2 * Math.PI * 50),
                    }}
                  />
                </svg>
                <div className="circle-progress-text">{recruiterRapport}%</div>
              </div>
              
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '10px' }}>
                <strong>Status:</strong> {recruiterRapport >= 70 ? 'Highly Collaborative' : recruiterRapport >= 45 ? 'Professional' : 'Strained / Risky'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ETIQUETTE TAB */}
      {activeTab === 'etiquette' && (
        <div ref={etiquetteBankRef} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {etiquetteSet === null && (
            <div className="reveal-item">
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                {etiquetteSets.length} sets of workplace email &amp; conflict scenarios — 10 questions each. Pick a set to begin.
              </p>
              <div className="set-grid">
                {etiquetteSets.map((set, idx) => {
                  const answeredInSet = set.filter(q => etiquetteSubmitted[q.id]).length;
                  const correctInSet = set.filter(q => etiquetteSubmitted[q.id] && etiquetteAnswers[q.id] === q.correctIndex).length;
                  const isDone = answeredInSet === set.length;
                  return (
                    <div
                      key={idx}
                      className={`set-card ${isDone ? 'set-card-done' : ''}`}
                      onClick={() => pickEtiquetteSet(idx)}
                    >
                      <div className="set-card-number">{idx + 1}</div>
                      <h4 style={{ fontSize: '1rem', marginBottom: '4px' }}>Set {idx + 1}</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                        Email Diplomacy · {set.length} questions
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
            </div>
          )}

          {etiquetteSet !== null && currentEtiquette && (
            <>
              <button className="btn btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => setEtiquetteSet(null)}>
                <ChevronLeftIcon size={16} /> Back to sets
              </button>
              <div className="glass-panel reveal-item" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <span className="badge badge-amber">Email Diplomacy Challenge · Set {etiquetteSet + 1}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Challenge {etiquetteIndex + 1} of {currentSetQuestions.length}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '12px' }}>Rewrite This Email Professionally</h3>

                <pre style={{
                  padding: '20px',
                  background: 'rgba(201, 70, 63, 0.05)',
                  borderRadius: '12px',
                  border: '1px solid rgba(201, 70, 63, 0.2)',
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  marginBottom: '24px'
                }} dangerouslySetInnerHTML={{ __html: currentEtiquette.rawEmail }} />

                <h4 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>{currentEtiquette.question}</h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {currentEtiquette.options.map((option, idx) => {
                    const isAnswered = etiquetteSubmitted[currentEtiquette.id];
                    const selectedOpt = etiquetteAnswers[currentEtiquette.id];
                    let styleClass = "quiz-option";
                    if (isAnswered) {
                      if (idx === currentEtiquette.correctIndex) {
                        styleClass += " quiz-option-correct";
                      } else if (idx === selectedOpt) {
                        styleClass += " quiz-option-incorrect";
                      }
                    } else {
                      if (idx === selectedOpt) {
                        styleClass += " quiz-option-selected";
                      }
                    }

                    return (
                      <button
                        key={idx}
                        className={styleClass}
                        onClick={() => handleEtiquetteSubmit(idx)}
                        disabled={isAnswered}
                        style={{ margin: 0 }}
                      >
                        <div className="option-indicator">
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span>{option}</span>
                      </button>
                    );
                  })}
                </div>

                {etiquetteSubmitted[currentEtiquette.id] && (
                  <div className="animate-fade-in" style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--card-border)', marginTop: '24px' }}>
                    <h5 style={{ color: etiquetteAnswers[currentEtiquette.id] === currentEtiquette.correctIndex ? 'var(--accent-emerald)' : 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      {etiquetteAnswers[currentEtiquette.id] === currentEtiquette.correctIndex ? 'Diplomacy Mastered! (+15 XP)' : 'Improvement needed'}
                    </h5>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{currentEtiquette.explanation}</p>

                    <button className="btn btn-primary" onClick={handleNextEtiquette} style={{ marginTop: '16px' }}>
                      {etiquetteIndex < currentSetQuestions.length - 1 ? 'Next Challenge' : 'Finish Set'}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

        </div>
      </div>
    </div>
  );
};
