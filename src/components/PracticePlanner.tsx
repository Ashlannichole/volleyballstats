import { useState } from 'react'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ── Types ─────────────────────────────────────────────────────────────────────

type SkillTag = 'warm-up' | 'serving' | 'passing' | 'setting' | 'attacking' | 'defense' | 'blocking' | 'conditioning' | 'cool-down'
type StationMode = 'full' | 'split'

interface Drill {
  id: string
  name: string
  description: string
  minPlayers: number
  maxPlayers: number   // 99 = no upper limit
  defaultDuration: number
  tags: SkillTag[]
  stations: StationMode
  coachNotes?: string
  isCustom?: boolean
}

interface PlanBlock {
  id: string
  name: string
  duration: number
  tags: SkillTag[]
  stations: StationMode
  notes: string
  drillId?: string
}

interface PracticePlan {
  id: string
  name: string
  date: string
  startTime: string   // HH:MM
  totalMinutes: number
  playerCount: number
  blocks: PlanBlock[]
  isTemplate: boolean
}

// ── Storage ───────────────────────────────────────────────────────────────────

const PLANS_KEY  = 'vb_plans'
const DRILLS_KEY = 'vb_custom_drills'

function loadPlans(): PracticePlan[]  { try { return JSON.parse(localStorage.getItem(PLANS_KEY)  ?? '[]') } catch { return [] } }
function loadCustom(): Drill[]        { try { return JSON.parse(localStorage.getItem(DRILLS_KEY) ?? '[]') } catch { return [] } }
function savePlans(p: PracticePlan[]) { localStorage.setItem(PLANS_KEY,  JSON.stringify(p)) }
function saveCustom(d: Drill[])       { localStorage.setItem(DRILLS_KEY, JSON.stringify(d)) }

// ── Drill Library ─────────────────────────────────────────────────────────────

const LIBRARY: Drill[] = [
  // Warm-Up
  { id: 'dyn-warmup',   name: 'Dynamic Warm-Up',       description: 'Jogging, high knees, butt kicks, arm circles around the court.',                   minPlayers: 2, maxPlayers: 99, defaultDuration: 10, tags: ['warm-up'],              stations: 'full' },
  { id: 'ball-handle',  name: 'Ball Handling',          description: 'Individual ball control — self-setting, overhead toss, platform work.',             minPlayers: 2, maxPlayers: 99, defaultDuration: 10, tags: ['warm-up', 'passing'],    stations: 'full' },
  { id: 'pepper',       name: 'Pepper',                 description: 'Partner passing: pass → set → hit → dig, continuous rally.',                       minPlayers: 4, maxPlayers: 99, defaultDuration: 10, tags: ['warm-up', 'passing'],    stations: 'split' },
  // Serving
  { id: 'serving-lines',name: 'Serving Lines',          description: 'Players serve from baseline. Rotate targets on the other side.',                   minPlayers: 2, maxPlayers: 99, defaultDuration: 15, tags: ['serving'],               stations: 'full' },
  { id: 'serve-zones',  name: 'Zone Serving',           description: 'Cones placed in target zones. Score points for hitting the zone.',                 minPlayers: 2, maxPlayers: 99, defaultDuration: 10, tags: ['serving'],               stations: 'full' },
  { id: 'ace-hunt',     name: 'Ace Hunt',               description: 'Servers compete to ace passers. Track score. Rotate passers.',                     minPlayers: 6, maxPlayers: 99, defaultDuration: 15, tags: ['serving', 'passing'],    stations: 'full' },
  { id: 'srv-pressure', name: 'Pressure Serving',       description: 'Must make 5 in a row before rotating. Miss = restart count.',                     minPlayers: 2, maxPlayers: 99, defaultDuration: 10, tags: ['serving', 'conditioning'],stations: 'full' },
  // Passing
  { id: 'butterfly',    name: 'Butterfly Passing',      description: 'Classic butterfly drill: pass to target, follow pass, shag, repeat.',              minPlayers: 6, maxPlayers: 99, defaultDuration: 15, tags: ['passing'],               stations: 'split' },
  { id: 'freeball-pass',name: 'Freeball Passing',       description: 'Coach tosses freeballs. Passers call "free" and pass to target.',                  minPlayers: 4, maxPlayers: 99, defaultDuration: 10, tags: ['passing'],               stations: 'full' },
  { id: 'srv-receive',  name: 'Serve Receive 3-Person', description: '3 passers in serve receive formation. Serve → pass → set → tip. Rotate.',        minPlayers: 6, maxPlayers: 99, defaultDuration: 20, tags: ['passing', 'serving'],    stations: 'full' },
  { id: 'wash-drill',   name: 'Wash Drill',             description: 'Win 2 in a row to score. Freeball → side out, then coach ball second ball.',       minPlayers: 8, maxPlayers: 99, defaultDuration: 20, tags: ['passing', 'defense'],    stations: 'full' },
  // Setting
  { id: 'set-targets',  name: 'Setting to Targets',     description: 'Setter sets to targets at OH and RS. Coach feeds. Rotate after set number.',      minPlayers: 4, maxPlayers: 99, defaultDuration: 15, tags: ['setting'],               stations: 'split' },
  { id: 'quick-sets',   name: 'Quick Set Work',         description: 'MB runs slide and 1-ball. Setter practices timing with various middle approaches.',minPlayers: 4, maxPlayers: 12, defaultDuration: 15, tags: ['setting', 'attacking'],  stations: 'split' },
  { id: 'setting-reps', name: 'Setting Reps',           description: 'High volume setting reps from different pass quality — perfect, off, and shanked.',minPlayers: 3, maxPlayers: 8,  defaultDuration: 10, tags: ['setting'],               stations: 'split' },
  // Attacking
  { id: 'hitting-lines',name: 'Hitting Lines',          description: 'Standard hitting lines: OH, RS, MB. Coach or setter sets, blocker optional.',      minPlayers: 6, maxPlayers: 99, defaultDuration: 20, tags: ['attacking'],             stations: 'full' },
  { id: 'gauntlet',     name: 'Gauntlet',               description: 'Hitter must beat a 3-person block/dig crew. Crew wins if they stop 3 in a row.',  minPlayers: 8, maxPlayers: 99, defaultDuration: 15, tags: ['attacking', 'defense'],  stations: 'full' },
  { id: 'cut-shots',    name: 'Cut Shot Clinic',        description: 'OH works sharp angle and cut shots crosscourt. Set up deep vs short targets.',    minPlayers: 4, maxPlayers: 12, defaultDuration: 15, tags: ['attacking'],             stations: 'split' },
  { id: 'trans-attack', name: '6-2 Transition',         description: 'Full team in 6-2 system. Coach initiates, team transitions and runs offenses.',   minPlayers: 12,maxPlayers: 99, defaultDuration: 20, tags: ['attacking', 'setting'],  stations: 'full' },
  { id: 'tip-roll',     name: 'Tip & Roll Shot',        description: 'Hitters practice controlled tip to open zones and roll shots off the block.',      minPlayers: 4, maxPlayers: 12, defaultDuration: 10, tags: ['attacking'],             stations: 'split' },
  // Defense
  { id: 'dig-lines',    name: 'Dig Lines',              description: 'Coach hits at defenders in rotation. Work on platform angle and footwork.',        minPlayers: 4, maxPlayers: 99, defaultDuration: 15, tags: ['defense'],               stations: 'full' },
  { id: 'scramble-def', name: 'Scramble Defense',       description: 'Coach hits randomly. Team must keep ball alive for 3 contacts.',                  minPlayers: 6, maxPlayers: 99, defaultDuration: 15, tags: ['defense'],               stations: 'full' },
  { id: 'def-cover',    name: 'Defense & Cover',        description: 'Setter sets, hitter attacks, team digs and covers. Coach adds block touch.',      minPlayers: 8, maxPlayers: 99, defaultDuration: 20, tags: ['defense', 'attacking'],  stations: 'full' },
  { id: 'dive-roll',    name: 'Dive & Roll Work',       description: 'Defensive footwork and floor work — rolls, dives, and emergency saves.',          minPlayers: 2, maxPlayers: 99, defaultDuration: 10, tags: ['defense'],               stations: 'full' },
  // Blocking
  { id: 'block-foot',   name: 'Block Footwork',         description: 'Blockers work lateral movement — side shuffle, crossover step, and close.',       minPlayers: 2, maxPlayers: 99, defaultDuration: 10, tags: ['blocking'],              stations: 'full' },
  { id: 'block-swing',  name: 'Block & Swing',          description: 'MB blocks quick, then swings around the outside for a set. Setter feeds.',        minPlayers: 6, maxPlayers: 12, defaultDuration: 15, tags: ['blocking', 'attacking'], stations: 'split' },
  { id: 'seam-attack',  name: 'Seam Attack',            description: 'Two blockers, hitter aims at the seam. Blockers work closing footwork.',          minPlayers: 6, maxPlayers: 99, defaultDuration: 15, tags: ['blocking'],              stations: 'full' },
  // Conditioning
  { id: 'cond-passing', name: 'Passing Reps',           description: 'High volume passing — 100 reps per person with partner or coach feed.',           minPlayers: 2, maxPlayers: 99, defaultDuration: 10, tags: ['passing', 'conditioning'],stations: 'split' },
  { id: 'cond-serving', name: 'Serving Conditioning',   description: '10 serves, sprint to net and back between each. Competitive team scoring.',        minPlayers: 2, maxPlayers: 99, defaultDuration: 10, tags: ['serving', 'conditioning'],stations: 'full' },
  // Cool-Down
  { id: 'team-stretch', name: 'Team Stretch',           description: 'Full team cool-down — hamstrings, quads, hip flexors, shoulder stretch.',         minPlayers: 2, maxPlayers: 99, defaultDuration: 10, tags: ['cool-down'],             stations: 'full' },
  { id: 'huddle',       name: 'Team Huddle',            description: 'Review practice highlights, set goals for next session, team hand-in.',           minPlayers: 2, maxPlayers: 99, defaultDuration: 5,  tags: ['cool-down'],             stations: 'full' },

  // ── Imported from team Drill Bank ──────────────────────────────────────────
  // Attacking
  { id: 'bank-2-ball-deep-ball', name: '2 Ball Deep Ball', description: 'One player sets her partner Goal is to hit it, otherwise send it deep 1 point for an overhand hit or a ball sent to the deep backcourt 2 points if it lands in…', minPlayers: 4, maxPlayers: 99, defaultDuration: 15, tags: ['attacking'], stations: 'split', coachNotes: 'One player sets her partner Goal is to hit it, otherwise send it deep 1 point for an overhand hit or a ball sent to the deep backcourt 2 points if it lands in a corner Minus a point if it lands in front of the 10-ft line' },
  { id: 'bank-3-before-10', name: '3 Before 10', description: 'Defense needs 10 total digs (not consecutive) – a dig only counts if someone catches the 2nd ball; blocks count as digs Hitting side needs 3 kills in a row…', minPlayers: 6, maxPlayers: 99, defaultDuration: 15, tags: ['attacking', 'defense'], stations: 'full', coachNotes: 'Defense needs 10 total digs (not consecutive) – a dig only counts if someone catches the 2nd ball; blocks count as digs Hitting side needs 3 kills in a row Any dig, block or hitting error sends the hitting side back to 0' },
  { id: 'bank-attack-block-school-attack-box', name: 'Attack Block School (Attack Box)', description: 'Hitting lines with blockers – never hit on an open net Coach assigns specific zones to hit Mid-system tosses about 7 ft off the net', minPlayers: 6, maxPlayers: 99, defaultDuration: 15, tags: ['attacking', 'blocking'], stations: 'full', coachNotes: 'Hitting lines with blockers – never hit on an open net Coach assigns specific zones to hit Mid-system tosses about 7 ft off the net' },
  { id: 'bank-cross-court-release', name: 'Cross Court Release', description: '7 standing 7 full approach (jumping) 5 in a row', minPlayers: 6, maxPlayers: 99, defaultDuration: 5, tags: ['attacking'], stations: 'full', coachNotes: '7 standing 7 full approach (jumping) 5 in a row | Variations: Shorter version: 5 standing / 5 jumping / 5 in a row Add a 10-min time limit – 10 burpees if not finished' },
  { id: 'bank-down-the-line-sideline-hitting', name: 'Down the Line / Sideline Hitting', description: '3 Down the Line: 3-4 min to get 3 kills down the line Pins hit line; middles hit the sideline off ones/slides Missed serve, or server doesn\'t jump in to play…', minPlayers: 6, maxPlayers: 99, defaultDuration: 10, tags: ['attacking'], stations: 'full', coachNotes: '3 Down the Line: 3-4 min to get 3 kills down the line Pins hit line; middles hit the sideline off ones/slides Missed serve, or server doesn\'t jump in to play D = hitter back to 0 | Variations: 2 Down the Line: 2 in a row (or just 2 total) for pins & right side; 2 sideline for middles 3 min each round' },
  { id: 'bank-hitting-lines-with-ds-on-defense', name: 'Hitting Lines with DS on Defense', description: 'Middles: slides, A\'s, 3\'s Pins: 4\'s, 2\'s, quicks, 32\'s Right sides: A\'s, 2\'s, C\'s', minPlayers: 6, maxPlayers: 99, defaultDuration: 10, tags: ['attacking'], stations: 'full', coachNotes: 'Middles: slides, A\'s, 3\'s Pins: 4\'s, 2\'s, quicks, 32\'s Right sides: A\'s, 2\'s, C\'s | Coaching points: DS: hold, then react' },
  { id: 'bank-hitting-progression', name: 'Hitting Progression', description: 'Partner work, 10 each: wrist only, elbow to wrist, full swing Approach progression: no steps – jump and swing (final steps/arms only); last/closing step –…', minPlayers: 2, maxPlayers: 99, defaultDuration: 15, tags: ['attacking'], stations: 'split', coachNotes: 'Partner work, 10 each: wrist only, elbow to wrist, full swing Approach progression: no steps – jump and swing (final steps/arms only); last/closing step – start right foot forward, bring left foot together, jump and swing; balance on left foot, then final 2 steps; back up to full approach | Variations: Build the approach backwards (from the last step out)' },
  { id: 'bank-line-angle', name: 'Line Angle', description: 'Need 4 of 6 balls Each group gets 5 min to complete', minPlayers: 3, maxPlayers: 99, defaultDuration: 5, tags: ['attacking'], stations: 'split', coachNotes: 'Need 4 of 6 balls Each group gets 5 min to complete' },
  { id: 'bank-modified-no-fly-zone', name: 'Modified No Fly Zone', description: 'Round 1 – hitters vs each other (defenders can stop points): start at 4, first to 8; only earned points (kills); can only hit line or sharp angle; ball in the…', minPlayers: 6, maxPlayers: 99, defaultDuration: 20, tags: ['attacking', 'defense'], stations: 'full', coachNotes: 'Round 1 – hitters vs each other (defenders can stop points): start at 4, first to 8; only earned points (kills); can only hit line or sharp angle; ball in the 6 = minus a point; aggressive tips count Round 2 – defense vs all hitters: start at 4, first to 8; defenders score on digs high to middle, minus for kills; hitters score on angle/line kills, minus if dug or hit into the no fly zone' },
  { id: 'bank-one-minute-hitting', name: 'One-Minute Hitting', description: 'Rotate hitter groups and D positions each round', minPlayers: 2, maxPlayers: 99, defaultDuration: 10, tags: ['attacking'], stations: 'full', coachNotes: 'Rotate hitter groups and D positions each round' },
  { id: 'bank-survivor', name: 'Survivor', description: 'Hit it in = shag your ball and go to the end of the line Hit it out or into the net = go to the other side and get ready to catch Catch a ball = you replace…', minPlayers: 6, maxPlayers: 99, defaultDuration: 15, tags: ['attacking'], stations: 'full', coachNotes: 'Hit it in = shag your ball and go to the end of the line Hit it out or into the net = go to the other side and get ready to catch Catch a ball = you replace the player who hit it Last player standing wins' },
  { id: 'bank-toss-to-self-hit', name: 'Toss to Self & Hit', description: 'Hit off a bounce Self toss and hit Add a block', minPlayers: 6, maxPlayers: 99, defaultDuration: 10, tags: ['attacking', 'blocking'], stations: 'full', coachNotes: 'Hit off a bounce Self toss and hit Add a block' },
  { id: 'bank-trash-can', name: 'Trash Can', description: 'Hitter keeps swinging back to back until she hits her goal Each hitter picks 5 shots and goes until she\'s hit all 5', minPlayers: 2, maxPlayers: 99, defaultDuration: 15, tags: ['attacking'], stations: 'full', coachNotes: 'Hitter keeps swinging back to back until she hits her goal Each hitter picks 5 shots and goes until she\'s hit all 5' },
  // Ball Control
  { id: 'bank-chaos-ball', name: 'Chaos Ball', description: 'Coach tosses 3 balls in at once Teams communicate to keep as many alive as possible Points for each ball that stays up longer than 5 touches', minPlayers: 6, maxPlayers: 99, defaultDuration: 15, tags: ['passing'], stations: 'full', coachNotes: 'Coach tosses 3 balls in at once Teams communicate to keep as many alive as possible Points for each ball that stays up longer than 5 touches' },
  { id: 'bank-cooperative-pepper-over-the-net', name: 'Cooperative Pepper (Over the Net)', description: 'Pass, set, hit the ball over the net to your teammates After your contact, run under the net to the other side and get ready to receive your teammate\'s hit…', minPlayers: 6, maxPlayers: 99, defaultDuration: 10, tags: ['attacking', 'passing', 'setting'], stations: 'full', coachNotes: 'Pass, set, hit the ball over the net to your teammates After your contact, run under the net to the other side and get ready to receive your teammate\'s hit Passer, setter and hitter all follow the same pattern The next wave of players comes on Goal: keep it continuous | Coaching points: communicate with your teammates on where you are hustle under the net' },
  { id: 'bank-narrow-lane-passing', name: 'Narrow Lane Passing', description: 'Start with 2 balls, 1 min each Tilt pass with one ball Go under the net', minPlayers: 3, maxPlayers: 99, defaultDuration: 5, tags: ['passing'], stations: 'split', coachNotes: 'Start with 2 balls, 1 min each Tilt pass with one ball Go under the net | Coaching points: Stay low' },
  { id: 'bank-pass-and-switch', name: 'Pass and Switch', description: '1st progression: passing 2nd progression: setting 3rd progression: commands (e.g. pass then set, 3 passes then 3 sets, 5 sets then 2 passes)', minPlayers: 3, maxPlayers: 99, defaultDuration: 10, tags: ['passing', 'setting'], stations: 'split', coachNotes: '1st progression: passing 2nd progression: setting 3rd progression: commands (e.g. pass then set, 3 passes then 3 sets, 5 sets then 2 passes)' },
  { id: 'bank-t-drill', name: 'T Drill', description: 'Dig to the setter, setter sets one of the pins, follow your ball', minPlayers: 4, maxPlayers: 99, defaultDuration: 15, tags: ['passing'], stations: 'full', coachNotes: 'Dig to the setter, setter sets one of the pins, follow your ball' },
  // Blocking
  { id: 'bank-blocking-hitting-timing', name: 'Blocking & Hitting Timing', description: 'Rotate through every 10 min block', minPlayers: 6, maxPlayers: 99, defaultDuration: 5, tags: ['attacking', 'blocking'], stations: 'full', coachNotes: 'Rotate through every 10 min block' },
  { id: 'bank-blocking-press-progression', name: 'Blocking Press Progression', description: 'Blockers shuffle, balance, go up and catch the ball over the net Add middles and swing-block to the pin, catch a tossed ball (to the pin: opposite catches;…', minPlayers: 3, maxPlayers: 99, defaultDuration: 15, tags: ['blocking'], stations: 'full', coachNotes: 'Blockers shuffle, balance, go up and catch the ball over the net Add middles and swing-block to the pin, catch a tossed ball (to the pin: opposite catches; inside: middle catches) Add a setter and catch while doing the blocking move to work timing | Coaching points: Low and tight press – pinch elbows in as you go up and press through the plane of the net | Variations: Static vs swing blocking' },
  { id: 'bank-blocking-review', name: 'Blocking Review', description: 'Pins footwork Middles: cover ground with the crossover step Timing & footwork without a ball Add ball – reach and grab DS hit off the box Review off-block…', minPlayers: 6, maxPlayers: 99, defaultDuration: 10, tags: ['blocking'], stations: 'full', coachNotes: 'Pins footwork Middles: cover ground with the crossover step Timing & footwork without a ball Add ball – reach and grab DS hit off the box Review off-block defense' },
  { id: 'bank-box-hitting-blocking', name: 'Box Hitting & Blocking', description: 'Box hitters work on reaching and snapping while blockers block Move to live hitting from transition off the net (hitters vs hitters)', minPlayers: 6, maxPlayers: 99, defaultDuration: 20, tags: ['blocking'], stations: 'full', coachNotes: 'Box hitters work on reaching and snapping while blockers block Move to live hitting from transition off the net (hitters vs hitters) | Coaching points: Drop thumb and pinky | Variations: Blocking progression: 1) block and transition without a ball – 1\'s and 3\'s 2) block live hitter on box, transition and play it out' },
  { id: 'bank-close-10', name: 'Close 10', description: 'Each middle has to close 10 blocks (about 5 min each) No effort on D when the ball drops = back to 0 Setter tries to set away from the block', minPlayers: 6, maxPlayers: 99, defaultDuration: 15, tags: ['blocking', 'defense'], stations: 'full', coachNotes: 'Each middle has to close 10 blocks (about 5 min each) No effort on D when the ball drops = back to 0 Setter tries to set away from the block | Variations: Close 5 for middles and pins, then transition off and hit (needs boxes)' },
  { id: 'bank-hitters-vs-block', name: 'Hitters vs Block', description: 'From the team drill bank — no written description yet.', minPlayers: 4, maxPlayers: 99, defaultDuration: 5, tags: ['blocking'], stations: 'full', coachNotes: '' },
  // Conditioning
  { id: 'bank-four-corners', name: 'Four Corners', description: 'Up-downs, hit in the middle', minPlayers: 4, maxPlayers: 99, defaultDuration: 10, tags: ['conditioning'], stations: 'full', coachNotes: 'Up-downs, hit in the middle' },
  { id: 'bank-obstacle-course-passing-relay', name: 'Obstacle Course Passing Relay', description: 'After a good pass to target, sprint around a sideline cone, weave through an agility ladder and get back in line Relay race – first team to 30 good passes…', minPlayers: 2, maxPlayers: 99, defaultDuration: 10, tags: ['conditioning', 'passing'], stations: 'full', coachNotes: 'After a good pass to target, sprint around a sideline cone, weave through an agility ladder and get back in line Relay race – first team to 30 good passes through the course wins' },
  { id: 'bank-scream-run', name: 'Scream & Run', description: 'From the team drill bank — no written description yet.', minPlayers: 4, maxPlayers: 99, defaultDuration: 10, tags: ['conditioning'], stations: 'full', coachNotes: '' },
  // Defense
  { id: 'bank-back-row-pepper', name: 'Back Row Pepper', description: 'Warm up standing, then swing Need 10 as a team', minPlayers: 6, maxPlayers: 99, defaultDuration: 5, tags: ['attacking', 'defense'], stations: 'full', coachNotes: 'Warm up standing, then swing Need 10 as a team' },
  { id: 'bank-backs-to-net', name: 'Backs to Net', description: 'Can\'t turn until you hear the ball hit the ground Aim for 3 touches', minPlayers: 4, maxPlayers: 99, defaultDuration: 15, tags: ['defense'], stations: 'full', coachNotes: 'Can\'t turn until you hear the ball hit the ground Aim for 3 touches' },
  { id: 'bank-belly-up', name: 'Belly Up', description: 'Coach slams the ball into the ground – get up and get 3 touches on it Goal: more than 10', minPlayers: 2, maxPlayers: 99, defaultDuration: 15, tags: ['defense'], stations: 'full', coachNotes: 'Coach slams the ball into the ground – get up and get 3 touches on it Goal: more than 10 | Variations: Team version (3 players): get up, play it before the 2nd bounce – 3 touches and over Partner version: one passes, the other catches the pass' },
  { id: 'bank-defensive-drill-1-chase-down-ball', name: 'Defensive Drill 1 (Chase & Down Ball)', description: 'Coach throws the ball over the player\'s head – chase it down and pop it up Player turns around and digs a down ball from the coach', minPlayers: 2, maxPlayers: 99, defaultDuration: 15, tags: ['defense'], stations: 'full', coachNotes: 'Coach throws the ball over the player\'s head – chase it down and pop it up Player turns around and digs a down ball from the coach' },
  { id: 'bank-defensive-work', name: 'Defensive Work', description: 'From the team drill bank — no written description yet.', minPlayers: 4, maxPlayers: 99, defaultDuration: 15, tags: ['defense'], stations: 'full', coachNotes: '' },
  { id: 'bank-dig-or-die', name: 'Dig or Die', description: 'Play a game to 15 If the ball hits the floor and nobody touched it, that team goes back to 0', minPlayers: 2, maxPlayers: 99, defaultDuration: 15, tags: ['defense'], stations: 'full', coachNotes: 'Play a game to 15 If the ball hits the floor and nobody touched it, that team goes back to 0 | Variations: 5v5 with no middle back' },
  { id: 'bank-dig-tip-chase', name: 'Dig Tip Chase', description: 'Coach hits a hard line ball Then someone throws a tip Then the first coach throws a chase ball across the court Go through 3 times, then switch groups', minPlayers: 6, maxPlayers: 99, defaultDuration: 15, tags: ['defense'], stations: 'full', coachNotes: 'Coach hits a hard line ball Then someone throws a tip Then the first coach throws a chase ball across the court Go through 3 times, then switch groups' },
  { id: 'bank-hitters-vs-defense', name: 'Hitters vs Defense', description: 'Off hitters and setter fully transition and swing off the DS pass Hitters earn 5 before D earns 3 = big point First to 2 big points wins Wave through until…', minPlayers: 6, maxPlayers: 99, defaultDuration: 20, tags: ['attacking', 'defense'], stations: 'full', coachNotes: 'Off hitters and setter fully transition and swing off the DS pass Hitters earn 5 before D earns 3 = big point First to 2 big points wins Wave through until every hitter goes | Coaching points: Discuss smart shots | Variations: 3 defenders, no block – reaction time and feet First to 10 wins version Down and back for each one not completed' },
  { id: 'bank-net-work-stations', name: 'Net Work (Stations)', description: 'Station 1 – passing out of the net: coach hits the ball into the net, players dig it out Station 2 – setting tight balls: coach throws a tight ball, player…', minPlayers: 3, maxPlayers: 99, defaultDuration: 15, tags: ['defense'], stations: 'full', coachNotes: 'Station 1 – passing out of the net: coach hits the ball into the net, players dig it out Station 2 – setting tight balls: coach throws a tight ball, player follows it to the net and either makes sure it goes over or sets it off the net Station 3 – blocking tight balls: coach tosses tight over the net, player jumps and plays the ball above the net' },
  { id: 'bank-pit-drill', name: 'Pit Drill', description: 'Coach tosses balls rapidly all over the court Any touch on the ball counts Need 3 in a row to get out of the pit', minPlayers: 2, maxPlayers: 99, defaultDuration: 15, tags: ['defense'], stations: 'full', coachNotes: 'Coach tosses balls rapidly all over the court Any touch on the ball counts Need 3 in a row to get out of the pit' },
  { id: 'bank-pursuit', name: 'Pursuit', description: 'Coach bounces a ball toward the net After one bounce, use 3 touches to get it over 1 minute – as many over as possible', minPlayers: 4, maxPlayers: 99, defaultDuration: 10, tags: ['defense'], stations: 'full', coachNotes: 'Coach bounces a ball toward the net After one bounce, use 3 touches to get it over 1 minute – as many over as possible' },
  { id: 'bank-reaction-drill', name: 'Reaction Drill', description: 'Reaction', minPlayers: 4, maxPlayers: 99, defaultDuration: 15, tags: ['defense'], stations: 'full', coachNotes: '' },
  { id: 'bank-six-down', name: 'Six Down', description: 'Coach down-balls at one player – dig it high Someone communicates and sets the out-of-system ball Hitters transition and attack', minPlayers: 4, maxPlayers: 99, defaultDuration: 15, tags: ['defense'], stations: 'full', coachNotes: 'Coach down-balls at one player – dig it high Someone communicates and sets the out-of-system ball Hitters transition and attack' },
  { id: 'bank-table-d', name: 'Table D', description: 'Starting side gets 7 balls: serve, 2 outside, 2 middle, 2 right side Must execute the serve receive to get the other 6 Need 3 of 6 to rotate', minPlayers: 6, maxPlayers: 99, defaultDuration: 30, tags: ['defense'], stations: 'full', coachNotes: 'Starting side gets 7 balls: serve, 2 outside, 2 middle, 2 right side Must execute the serve receive to get the other 6 Need 3 of 6 to rotate | Coaching points: Pick up tips between two players Line defense with setter releasing early | Variations: Modified defense with setter forward; double blocking with the middle' },
  { id: 'bank-the-gauntlet', name: 'The Gauntlet', description: 'Attackers score by hitting into the taped target Defenders score a stop with a dig + transition pass (2 playable touches) Race to 10', minPlayers: 5, maxPlayers: 99, defaultDuration: 15, tags: ['defense'], stations: 'full', coachNotes: 'Attackers score by hitting into the taped target Defenders score a stop with a dig + transition pass (2 playable touches) Race to 10' },
  { id: 'bank-under-the-net-digs', name: 'Under the Net Digs', description: 'Staying low, quick reactions', minPlayers: 4, maxPlayers: 99, defaultDuration: 15, tags: ['defense'], stations: 'full', coachNotes: 'Coaching points: Stay low through the pass, take the ball around the knee pads, finish the pass before turning to the next attacker | Variations: Older players: add a down ball and slow it down' },
  // Passing / Serve Receive
  { id: 'bank-100-before-50', name: '100 Before 50', description: 'Passers add up their pass scores (0–3) Servers get 50 serves; a missed serve counts as a 3-pass for the passers Servers win if they finish 50 serves before…', minPlayers: 2, maxPlayers: 99, defaultDuration: 15, tags: ['passing', 'serving'], stations: 'full', coachNotes: 'Passers add up their pass scores (0–3) Servers get 50 serves; a missed serve counts as a 3-pass for the passers Servers win if they finish 50 serves before the passers reach 100' },
  { id: 'bank-100-perfect-passes', name: '100 Perfect Passes', description: 'Only 2- or 3-passes count toward 100 Switch sides at 50 Goal: under 10 minutes', minPlayers: 6, maxPlayers: 99, defaultDuration: 5, tags: ['passing', 'serving'], stations: 'full', coachNotes: 'Only 2- or 3-passes count toward 100 Switch sides at 50 Goal: under 10 minutes | Coaching points: Passer must be called by name or the pass doesn\'t count' },
  { id: 'bank-125-of-150', name: '125 of 150', description: 'Serve 50 balls; passes scored 0–3 (150 max) Goal 125 of 150 (2.5 average); 100 of 150 = 2.0', minPlayers: 2, maxPlayers: 99, defaultDuration: 15, tags: ['passing'], stations: 'full', coachNotes: 'Serve 50 balls; passes scored 0–3 (150 max) Goal 125 of 150 (2.5 average); 100 of 150 = 2.0' },
  { id: 'bank-20-before-2', name: '20 Before 2', description: '20 caught passes in 2 minutes (any catch counts) Make it → one player serves; make the serve = done, miss = run it again Servers go to the passer line after…', minPlayers: 7, maxPlayers: 99, defaultDuration: 2, tags: ['passing', 'serving'], stations: 'full', coachNotes: '20 caught passes in 2 minutes (any catch counts) Make it → one player serves; make the serve = done, miss = run it again Servers go to the passer line after serving | Coaching points: Remember your seams' },
  { id: 'bank-75-caught-passes-free-down-serve', name: '75 Caught Passes (Free / Down / Serve)', description: 'Continuous: 25 caught free balls, then 25 caught down balls, then 25 caught serves Pass, then go to target; target puts the ball in the cart and goes to the…', minPlayers: 4, maxPlayers: 99, defaultDuration: 15, tags: ['passing'], stations: 'full', coachNotes: 'Continuous: 25 caught free balls, then 25 caught down balls, then 25 caught serves Pass, then go to target; target puts the ball in the cart and goes to the back of the line Team counts out loud | Coaching points: Split on contact, know your seams' },
  { id: 'bank-butterfly', name: 'Butterfly', description: 'Coach tosses to the passer Passer makes a good pass to the setter Setter sets the hitter a nice high ball to attack', minPlayers: 6, maxPlayers: 99, defaultDuration: 10, tags: ['attacking', 'passing', 'setting'], stations: 'full', coachNotes: 'Coach tosses to the passer Passer makes a good pass to the setter Setter sets the hitter a nice high ball to attack | Variations: Modified version: need 15 as a team' },
  { id: 'bank-cone-catches', name: 'Cone Catches', description: 'Partner tosses a tennis ball; catch it with a cone', minPlayers: 2, maxPlayers: 99, defaultDuration: 15, tags: ['passing'], stations: 'split', coachNotes: 'Partner tosses a tennis ball; catch it with a cone | Coaching points: Feet to the ball, angle ready, cone facing target on the catch' },
  { id: 'bank-dead-arm-passing', name: 'Dead Arm Passing', description: 'Make your move, then let the ball bounce off the platform – no movement once the ball touches the platform', minPlayers: 2, maxPlayers: 99, defaultDuration: 10, tags: ['passing'], stations: 'split', coachNotes: 'Make your move, then let the ball bounce off the platform – no movement once the ball touches the platform | Coaching points: Keep SR movement simple' },
  { id: 'bank-platform-angles', name: 'Platform Angles', description: 'Pass outside your body on one knee – 10 each side Pass outside your body standing with one step – 10 each side', minPlayers: 2, maxPlayers: 99, defaultDuration: 15, tags: ['passing'], stations: 'split', coachNotes: 'Pass outside your body on one knee – 10 each side Pass outside your body standing with one step – 10 each side' },
  { id: 'bank-pressure-serve-receive-danger', name: 'Pressure Serve Receive (Danger)', description: 'Each player starts at 10 points 3-pass = +1 (cap at 10); 2-pass = wash 1-pass or ace = -1 and you\'re "in danger" – server serves you again and you need a 3 to…', minPlayers: 6, maxPlayers: 99, defaultDuration: 10, tags: ['passing'], stations: 'full', coachNotes: 'Each player starts at 10 points 3-pass = +1 (cap at 10); 2-pass = wash 1-pass or ace = -1 and you\'re "in danger" – server serves you again and you need a 3 to stay If aced, or a 1 or 2 pass while in danger, the server takes your spot | Variations: Short version: start at 4, first to 8 wins' },
  { id: 'bank-read-let-it-bounce', name: 'Read & Let It Bounce', description: 'Coach underhand-bowls/throws at or around the passers Player gets to a low ready position and lets the ball bounce between her legs without being hit Shag…', minPlayers: 2, maxPlayers: 99, defaultDuration: 15, tags: ['passing'], stations: 'full', coachNotes: 'Coach underhand-bowls/throws at or around the passers Player gets to a low ready position and lets the ball bounce between her legs without being hit Shag your ball, bring it back, get in line | Coaching points: Feet before arms | Variations: Throw short/deep to make them move Run fast for conditioning' },
  { id: 'bank-reading-the-serve-cone-toss', name: 'Reading the Serve (Cone Toss)', description: 'Phase 1: player throws a cone to the side the ball is heading, then tries to catch the ball Phase 2: throw the cone, then pass the serve', minPlayers: 2, maxPlayers: 99, defaultDuration: 15, tags: ['passing', 'serving'], stations: 'full', coachNotes: 'Phase 1: player throws a cone to the side the ball is heading, then tries to catch the ball Phase 2: throw the cone, then pass the serve | Coaching points: Reading/reacting, not form' },
  { id: 'bank-serve-receive-angles-progression', name: 'Serve Receive & Angles Progression', description: 'Serve receive, angles', minPlayers: 4, maxPlayers: 99, defaultDuration: 15, tags: ['passing', 'serving'], stations: 'full', coachNotes: '' },
  { id: 'bank-serve-receive-conditioning', name: 'Serve Receive Conditioning', description: '3-pass = 0 burpees 2-pass = 1 burpee 1-pass = 2 burpees 0/ace = 3 burpees Rotate every pass Need 12 3-passes as a team or we run', minPlayers: 2, maxPlayers: 99, defaultDuration: 5, tags: ['passing'], stations: 'full', coachNotes: '3-pass = 0 burpees 2-pass = 1 burpee 1-pass = 2 burpees 0/ace = 3 burpees Rotate every pass Need 12 3-passes as a team or we run | Coaching points: Setter pushes to the pins and calls out passers' },
  { id: 'bank-serve-receive-platform-warm-up-progression', name: 'Serve Receive Platform Warm-up Progression', description: '1) Outside (sideline) → inside 2) Inside → outside 3) Two passers inside → out 4) Two passers outside → in', minPlayers: 3, maxPlayers: 99, defaultDuration: 15, tags: ['passing'], stations: 'full', coachNotes: '1) Outside (sideline) → inside 2) Inside → outside 3) Two passers inside → out 4) Two passers outside → in | Coaching points: Constant movement, different angles to target' },
  { id: 'bank-servers-vs-passers', name: 'Servers vs Passers', description: 'Servers score on aces or 1-passes, -1 for missed serves Passers score on 3-passes or missed serves, -1 for 0-passes 2-passes are a wash', minPlayers: 10, maxPlayers: 99, defaultDuration: 20, tags: ['passing', 'serving'], stations: 'full', coachNotes: 'Servers score on aces or 1-passes, -1 for missed serves Passers score on 3-passes or missed serves, -1 for 0-passes 2-passes are a wash | Variations: Best 2 of 3 – winner enforces the consequence Setter works on pushing to the pins (outside and backside)' },
  { id: 'bank-touch-shuffle-angle-passing', name: 'Touch-Shuffle Angle Passing', description: 'Touch, shuffle back, pass an angle one side; run, touch, shuffle back, angle the other way', minPlayers: 2, maxPlayers: 99, defaultDuration: 15, tags: ['passing'], stations: 'split', coachNotes: 'Touch, shuffle back, pass an angle one side; run, touch, shuffle back, angle the other way | Coaching points: Stay low, let the ball come to your platform, use angles to target, arms apart when moving' },
  { id: 'bank-wave-passing', name: 'Wave Passing', description: 'Rotate server → passer → target; go for time Need 10 (or a level-appropriate number) Overpass or ace = back to 0', minPlayers: 2, maxPlayers: 99, defaultDuration: 15, tags: ['passing', 'serving'], stations: 'split', coachNotes: 'Rotate server → passer → target; go for time Need 10 (or a level-appropriate number) Overpass or ace = back to 0' },
  // Serving
  { id: 'bank-around-the-world-serving', name: 'Around the World Serving', description: 'Serve to each spot around the court from both sides Goal: 7-8 as a team', minPlayers: 2, maxPlayers: 99, defaultDuration: 5, tags: ['serving'], stations: 'full', coachNotes: 'Serve to each spot around the court from both sides Goal: 7-8 as a team | Coaching points: Communication | Variations: Add chairs and work on short serving' },
  { id: 'bank-blackout-serving', name: 'Blackout Serving', description: 'From the team drill bank — no written description yet.', minPlayers: 4, maxPlayers: 99, defaultDuration: 15, tags: ['serving'], stations: 'full', coachNotes: '' },
  { id: 'bank-dead-fish', name: 'Dead Fish', description: 'Hit a teammate who\'s lying down and she gets up and joins in serving First team with every player serving wins', minPlayers: 2, maxPlayers: 99, defaultDuration: 15, tags: ['serving'], stations: 'full', coachNotes: 'Hit a teammate who\'s lying down and she gets up and joins in serving First team with every player serving wins' },
  { id: 'bank-knockout-serving', name: 'Knockout (Serving)', description: 'From the team drill bank — no written description yet.', minPlayers: 4, maxPlayers: 99, defaultDuration: 15, tags: ['serving'], stations: 'full', coachNotes: '' },
  { id: 'bank-otm-on-the-mat-serving', name: 'OTM (On the Mat) Serving', description: 'Pick a seam or zone (e.g. 1 and 4, deep 2x2 corners, short 5 and 6) Serve 5–10 to each and count how many you make', minPlayers: 6, maxPlayers: 99, defaultDuration: 5, tags: ['serving'], stations: 'full', coachNotes: 'Pick a seam or zone (e.g. 1 and 4, deep 2x2 corners, short 5 and 6) Serve 5–10 to each and count how many you make' },
  { id: 'bank-serving-horse', name: 'Serving HORSE', description: 'Serving accuracy', minPlayers: 2, maxPlayers: 99, defaultDuration: 5, tags: ['serving'], stations: 'split', coachNotes: '' },
  { id: 'bank-serving-rally', name: 'Serving Rally', description: 'From the team drill bank — no written description yet.', minPlayers: 2, maxPlayers: 99, defaultDuration: 5, tags: ['serving'], stations: 'full', coachNotes: '' },
  { id: 'bank-serving-tier', name: 'Serving Tier', description: 'Serve through tiers to 7 or 8 – sidelines, deep corners, short', minPlayers: 2, maxPlayers: 99, defaultDuration: 10, tags: ['serving'], stations: 'split', coachNotes: 'Serve through tiers to 7 or 8 – sidelines, deep corners, short | Variations: Sidelines only; evens = push-ups, odds = sit-ups 10-minute limit or 4 down and backs' },
  { id: 'bank-team-serving-21-sideline-points', name: 'Team Serving – 21 / Sideline Points', description: 'Team target 21 (or 40) points Deep corners & sideline = 3 pts, short corners = 2, short front/back seam = 1 Missed serve = -1 Serve and chase', minPlayers: 6, maxPlayers: 99, defaultDuration: 5, tags: ['serving'], stations: 'full', coachNotes: 'Team target 21 (or 40) points Deep corners & sideline = 3 pts, short corners = 2, short front/back seam = 1 Missed serve = -1 Serve and chase' },
  { id: 'bank-wall-serving-basics', name: 'Wall Serving Basics', description: '3 exercises against the wall before going to the net', minPlayers: 4, maxPlayers: 99, defaultDuration: 15, tags: ['serving'], stations: 'full', coachNotes: '3 exercises against the wall before going to the net | Coaching points: Shoulders open, chest up, hand firm and fully open' },
  // Team / Game-like
  { id: 'bank-0-vs-18', name: '0 vs 18', description: 'Side at 0 scores on everything Side at 18 only scores on the other side\'s errors The 0 side must reach 25 before making 7 errors', minPlayers: 2, maxPlayers: 99, defaultDuration: 15, tags: ['attacking', 'defense', 'passing', 'setting'], stations: 'full', coachNotes: 'Side at 0 scores on everything Side at 18 only scores on the other side\'s errors The 0 side must reach 25 before making 7 errors' },
  { id: 'bank-21-15-drill', name: '21 / 15 Drill', description: '21: 0-7 passing only, 7-14 pass and set, 14-21 pass, set and hit 15: 0-5, 5-10, 10-15 with the same steps Only earned points count', minPlayers: 4, maxPlayers: 99, defaultDuration: 10, tags: ['attacking', 'defense', 'passing', 'setting'], stations: 'full', coachNotes: '21: 0-7 passing only, 7-14 pass and set, 14-21 pass, set and hit 15: 0-5, 5-10, 10-15 with the same steps Only earned points count | Variations: Winner picks the consequence' },
  { id: 'bank-3-ball-perfect', name: '3 Ball Perfect', description: '9 balls to get 3 side-outs from serve receive with no errors Must take a swing; can\'t hit into the block', minPlayers: 6, maxPlayers: 99, defaultDuration: 15, tags: ['attacking', 'blocking', 'defense', 'passing', 'setting'], stations: 'full', coachNotes: '9 balls to get 3 side-outs from serve receive with no errors Must take a swing; can\'t hit into the block' },
  { id: 'bank-3-ball-scrimmage', name: '3 Ball Scrimmage', description: 'One side gets 3 balls in a row: serve, down ball, free ball Win 2 of 3 = 1 point; win 3 of 3 = 2 big points', minPlayers: 2, maxPlayers: 99, defaultDuration: 15, tags: ['attacking', 'defense', 'passing', 'setting'], stations: 'full', coachNotes: 'One side gets 3 balls in a row: serve, down ball, free ball Win 2 of 3 = 1 point; win 3 of 3 = 2 big points' },
  { id: 'bank-3-way-knockout', name: '3-Way Knockout', description: 'Play until a player makes a mistake – that player steps off, leaving her team with 2 Buy-back: a short-handed team can bring a player back by scoring while…', minPlayers: 6, maxPlayers: 99, defaultDuration: 15, tags: ['attacking', 'defense', 'passing', 'setting'], stations: 'full', coachNotes: 'Play until a player makes a mistake – that player steps off, leaving her team with 2 Buy-back: a short-handed team can bring a player back by scoring while attacking into a designated zone Game ends when a team is out of players or hits the point limit' },
  { id: 'bank-4-ball-scrimmage', name: '4 Ball Scrimmage', description: '4 balls: serve, out of system, down ball, free ball Get 3 of 4 earned points before the other side gets 2 = big point First to 3 big points wins Flip front to…', minPlayers: 2, maxPlayers: 99, defaultDuration: 30, tags: ['attacking', 'defense', 'passing', 'setting'], stations: 'full', coachNotes: '4 balls: serve, out of system, down ball, free ball Get 3 of 4 earned points before the other side gets 2 = big point First to 3 big points wins Flip front to back | Variations: Need 3 of 4 to rotate; stay in rotation until done Out-of-system ball can come on a bounce' },
  { id: 'bank-4-on-4', name: '4 on 4', description: 'First to 10 or mini games to 15', minPlayers: 8, maxPlayers: 99, defaultDuration: 30, tags: ['attacking', 'defense', 'passing', 'setting'], stations: 'full', coachNotes: 'First to 10 or mini games to 15' },
  { id: 'bank-5v5-assigned-shots', name: '5v5 Assigned Shots', description: 'Each hitter has 2 assigned shots (e.g. hard-driven ball and an out shot) Not using your assigned shots = lose the point', minPlayers: 10, maxPlayers: 99, defaultDuration: 15, tags: ['attacking', 'defense', 'passing', 'setting'], stations: 'full', coachNotes: 'Each hitter has 2 assigned shots (e.g. hard-driven ball and an out shot) Not using your assigned shots = lose the point' },
  { id: 'bank-6-ball-scrimmage-rotation', name: '6 Ball Scrimmage / Rotation', description: '2 serve receive, 2 down balls, 2 free balls Need 3 to rotate', minPlayers: 2, maxPlayers: 99, defaultDuration: 15, tags: ['attacking', 'defense', 'passing', 'setting'], stations: 'full', coachNotes: '2 serve receive, 2 down balls, 2 free balls Need 3 to rotate' },
  { id: 'bank-6v6-serve-receive-stay', name: '6v6 Serve Receive Stay', description: 'Starting side stays in serve receive the whole time, whether they win the point or not', minPlayers: 12, maxPlayers: 99, defaultDuration: 15, tags: ['attacking', 'defense', 'passing', 'serving', 'setting'], stations: 'full', coachNotes: 'Starting side stays in serve receive the whole time, whether they win the point or not' },
  { id: 'bank-activate-terminate', name: 'Activate / Terminate', description: 'Play 6 on 6 A team has to activate a hitter before it can start earning points Once activated, the team earns points until it makes an error or the other team…', minPlayers: 12, maxPlayers: 99, defaultDuration: 30, tags: ['attacking', 'defense', 'passing', 'setting'], stations: 'full', coachNotes: 'Play 6 on 6 A team has to activate a hitter before it can start earning points Once activated, the team earns points until it makes an error or the other team scores Then it has to reactivate a hitter to start earning points again' },
  { id: 'bank-all-out-scrimmage', name: 'All Out Scrimmage', description: '2 points for getting back to the middle after each point Minus a point if there\'s no communication on the ball', minPlayers: 2, maxPlayers: 99, defaultDuration: 15, tags: ['attacking', 'defense', 'passing', 'setting'], stations: 'full', coachNotes: '2 points for getting back to the middle after each point Minus a point if there\'s no communication on the ball' },
  { id: 'bank-basketball-volleyball-game', name: 'Basketball (Volleyball Game)', description: 'Two 8-min halves; switch sides at half Ace = 3 pts; front-row kill = 2; back-row kill = 1; block = 1 Double or net violation = foul, other side gets a free…', minPlayers: 2, maxPlayers: 99, defaultDuration: 15, tags: ['attacking', 'defense', 'passing', 'setting'], stations: 'full', coachNotes: 'Two 8-min halves; switch sides at half Ace = 3 pts; front-row kill = 2; back-row kill = 1; block = 1 Double or net violation = foul, other side gets a free ball Most points wins' },
  { id: 'bank-bounce', name: 'Bounce', description: 'Each time the ball crosses the net, the team gets one bounce Let it bounce when you didn\'t need to = lose the point Shanks or slammed balls that bounce can…', minPlayers: 2, maxPlayers: 99, defaultDuration: 5, tags: ['attacking', 'defense', 'passing', 'setting'], stations: 'full', coachNotes: 'Each time the ball crosses the net, the team gets one bounce Let it bounce when you didn\'t need to = lose the point Shanks or slammed balls that bounce can still be played' },
  { id: 'bank-capture-the-cone', name: 'Capture the Cone', description: 'Score a point = run AROUND the court and grab a cone First side to have all 6 cones wins', minPlayers: 2, maxPlayers: 99, defaultDuration: 15, tags: ['attacking', 'defense', 'passing', 'setting'], stations: 'full', coachNotes: 'Score a point = run AROUND the court and grab a cone First side to have all 6 cones wins | Coaching points: Make sure players communicate Helps players see the other side of the court' },
  { id: 'bank-chaos-side-out-off-a-difficult-hit', name: 'Chaos (Side-Out off a Difficult Hit)', description: 'Start the play with a difficult hit at the working side; they have to side out off it Goal 8 of 10 before switching; penalties if you miss', minPlayers: 12, maxPlayers: 99, defaultDuration: 15, tags: ['attacking', 'defense', 'passing', 'setting'], stations: 'full', coachNotes: 'Start the play with a difficult hit at the working side; they have to side out off it Goal 8 of 10 before switching; penalties if you miss' },
  { id: 'bank-communication-game', name: 'Communication Game', description: 'Communication', minPlayers: 4, maxPlayers: 99, defaultDuration: 10, tags: ['attacking', 'defense', 'passing', 'setting'], stations: 'full', coachNotes: '' },
  { id: 'bank-fire-drill', name: 'Fire Drill', description: 'Everyone plays every position and rotates after each ball Setter comes out of right back, so players end up in unfamiliar spots', minPlayers: 2, maxPlayers: 99, defaultDuration: 15, tags: ['attacking', 'defense', 'passing', 'setting'], stations: 'full', coachNotes: 'Everyone plays every position and rotates after each ball Setter comes out of right back, so players end up in unfamiliar spots | Coaching points: Extra communication' },
  { id: 'bank-first-ball-terminate-serve-receive', name: 'First Ball Terminate (Serve Receive)', description: 'Receive 8 balls, need 6 of 8 First-ball terminate = 2 points; rally won on earned point = 1 Error by the non-receiving side is a wash All 6 rotations', minPlayers: 6, maxPlayers: 99, defaultDuration: 35, tags: ['attacking', 'defense', 'passing', 'serving', 'setting'], stations: 'full', coachNotes: 'Receive 8 balls, need 6 of 8 First-ball terminate = 2 points; rally won on earned point = 1 Error by the non-receiving side is a wash All 6 rotations | Variations: 8-ball SR: need 5 of 8 6-ball SR: need 4 of 6, earned only, non-starting side errors serve again Use to try different lineups (5-1 vs 6-2)' },
  { id: 'bank-m-drill', name: 'M Drill', description: 'Need 4 of 6 balls', minPlayers: 2, maxPlayers: 99, defaultDuration: 5, tags: ['attacking', 'defense', 'passing', 'setting'], stations: 'full', coachNotes: 'Need 4 of 6 balls' },
  { id: 'bank-mini-tournament-2s-4s', name: 'Mini Tournament (2s / 4s)', description: 'Round-robin; teams track their wins', minPlayers: 4, maxPlayers: 99, defaultDuration: 20, tags: ['attacking', 'defense', 'passing', 'setting'], stations: 'full', coachNotes: 'Round-robin; teams track their wins' },
  { id: 'bank-no-spectators', name: 'No Spectators', description: 'If a player is standing upright watching when the ball is contacted, coach blows the whistle and the point goes to the other team', minPlayers: 8, maxPlayers: 99, defaultDuration: 15, tags: ['attacking', 'defense', 'passing', 'setting'], stations: 'full', coachNotes: 'If a player is standing upright watching when the ball is contacted, coach blows the whistle and the point goes to the other team' },
  { id: 'bank-pins-middle-3-drill', name: 'Pins / Middle 3 Drill', description: 'Both sides try to first-ball terminate from each serving zone (1→6 and 5→6) Pins transition from passing to hitting outside or right side; setter can set pins…', minPlayers: 8, maxPlayers: 99, defaultDuration: 25, tags: ['attacking', 'defense', 'passing', 'serving', 'setting'], stations: 'full', coachNotes: 'Both sides try to first-ball terminate from each serving zone (1→6 and 5→6) Pins transition from passing to hitting outside or right side; setter can set pins or middle Keep receiving as long as you terminate; aced or no kill = switch First side to 3 kills in each zone wins | Coaching points: Setters initiate the middles | Variations: Middles count 1 point, pins ½ Only counts if middle runs a slide or 3 – otherwise set outside and they must hit line Switch sides after a zone; flip middles' },
  { id: 'bank-positional-breakout', name: 'Positional Breakout', description: 'Setters: footwork and transitions Pins & middles: timing and approach DS: emergency balls, knee drops, transition Middles: blocking – pressing and footwork…', minPlayers: 4, maxPlayers: 99, defaultDuration: 15, tags: ['attacking', 'defense', 'passing', 'setting'], stations: 'full', coachNotes: 'Setters: footwork and transitions Pins & middles: timing and approach DS: emergency balls, knee drops, transition Middles: blocking – pressing and footwork Outsides/right sides: out-of-system swings, tracking DS: run-throughs, footwork, platform' },
  { id: 'bank-pot-of-gold', name: 'Pot of Gold', description: 'Every time the ball crosses the net, a point goes into the pot (2 points if the team used 3 touches) Win the rally = win everything in the pot Game to 15', minPlayers: 2, maxPlayers: 99, defaultDuration: 15, tags: ['attacking', 'defense', 'passing', 'setting'], stations: 'full', coachNotes: 'Every time the ball crosses the net, a point goes into the pot (2 points if the team used 3 touches) Win the rally = win everything in the pot Game to 15' },
  { id: 'bank-queen-of-the-court', name: 'Queen of the Court', description: 'From the team drill bank — no written description yet.', minPlayers: 4, maxPlayers: 99, defaultDuration: 10, tags: ['attacking', 'defense', 'passing', 'setting'], stations: 'full', coachNotes: '' },
  { id: 'bank-secret-squirrel', name: 'Secret Squirrel', description: 'From the team drill bank — no written description yet.', minPlayers: 2, maxPlayers: 99, defaultDuration: 15, tags: ['attacking', 'defense', 'passing', 'setting'], stations: 'full', coachNotes: '' },
  { id: 'bank-serve-earn-the-kill', name: 'Serve + Earn the Kill', description: 'Receive one serve and earn a kill (no ball to 6, no tip over, over and in)', minPlayers: 6, maxPlayers: 99, defaultDuration: 15, tags: ['attacking', 'defense', 'passing', 'serving', 'setting'], stations: 'full', coachNotes: 'Receive one serve and earn a kill (no ball to 6, no tip over, over and in)' },
  { id: 'bank-serve-receive-to-coverage-to-out-of-system', name: 'Serve Receive to Coverage to Out of System', description: 'Serve receive → setter delivers in-system set → setter immediately covers the hitter Coach tosses a ball over to simulate a block Setter plays it, a back-row…', minPlayers: 6, maxPlayers: 99, defaultDuration: 15, tags: ['attacking', 'defense', 'passing', 'setting'], stations: 'full', coachNotes: 'Serve receive → setter delivers in-system set → setter immediately covers the hitter Coach tosses a ball over to simulate a block Setter plays it, a back-row player sets out of system back to the hitter' },
  { id: 'bank-social-media-drill-coaching-staff-video', name: 'Social Media Drill (coaching staff video)', description: 'From the team drill bank — no written description yet.', minPlayers: 4, maxPlayers: 99, defaultDuration: 15, tags: ['attacking', 'defense', 'passing', 'setting'], stations: 'full', coachNotes: '' },
  { id: 'bank-speed-triples-doubles', name: 'Speed Triples / Doubles', description: 'First to 10 (or first to win 5)', minPlayers: 4, maxPlayers: 99, defaultDuration: 10, tags: ['attacking', 'defense', 'passing', 'setting'], stations: 'full', coachNotes: 'First to 10 (or first to win 5)' },
  { id: 'bank-switch-hit', name: 'Switch Hit', description: 'Every attack and serve must use the non-dominant hand (or whole team plays left-handed / lefties play right-handed)', minPlayers: 8, maxPlayers: 99, defaultDuration: 15, tags: ['attacking', 'defense', 'passing', 'setting'], stations: 'full', coachNotes: 'Every attack and serve must use the non-dominant hand (or whole team plays left-handed / lefties play right-handed) | Variations: No-jumping rule: all attacks from a standing position' },
  { id: 'bank-team-communication-drill', name: 'Team Communication Drill', description: 'Communication', minPlayers: 4, maxPlayers: 99, defaultDuration: 15, tags: ['attacking', 'defense', 'passing', 'setting'], stations: 'full', coachNotes: '' },
  { id: 'bank-tennis', name: 'Tennis', description: 'If you send the ball over, you rotate off the court', minPlayers: 6, maxPlayers: 99, defaultDuration: 10, tags: ['attacking', 'defense', 'passing', 'setting'], stations: 'full', coachNotes: 'If you send the ball over, you rotate off the court | Variations: Up to 2 contacts – platform only 2 contacts – 2nd must be one-handed 2 contacts – 2nd has to be with hands' },
  { id: 'bank-touch-progression', name: 'Touch Progression', description: 'First mini game: 1 touch only Second: 2 touches Last: 3 touches only', minPlayers: 2, maxPlayers: 99, defaultDuration: 15, tags: ['attacking', 'defense', 'passing', 'setting'], stations: 'full', coachNotes: 'First mini game: 1 touch only Second: 2 touches Last: 3 touches only' },
  // Transition
  { id: 'bank-hitting-transition-on-full-6', name: 'Hitting Transition on Full 6', description: '1½ min each group; need 7 kills, one has to be a slide', minPlayers: 6, maxPlayers: 99, defaultDuration: 10, tags: ['attacking', 'defense'], stations: 'full', coachNotes: '1½ min each group; need 7 kills, one has to be a slide' },
  { id: 'bank-nebraska', name: 'Nebraska', description: 'Whoever doesn\'t dig sets either pin, who hits it over In but not to zone 1 or 5 = wash; zone 1 or 5 = +1 Hitting error, tip, or ball to zone 6 = -1', minPlayers: 4, maxPlayers: 99, defaultDuration: 15, tags: ['attacking', 'defense'], stations: 'full', coachNotes: 'Whoever doesn\'t dig sets either pin, who hits it over In but not to zone 1 or 5 = wash; zone 1 or 5 = +1 Hitting error, tip, or ball to zone 6 = -1' },
  { id: 'bank-out-of-system-doubles', name: 'Out of System Doubles', description: '2 girls step onto the court side by side Coach tosses in ball to one of them, they then need to set the other Other girl is working on a hit or a freeball', minPlayers: 4, maxPlayers: 99, defaultDuration: 10, tags: ['attacking', 'defense'], stations: 'full', coachNotes: '2 girls step onto the court side by side Coach tosses in ball to one of them, they then need to set the other Other girl is working on a hit or a freeball | Coaching points: Freeballs MUST be deep to count' },
  { id: 'bank-out-of-system-progression', name: 'Out of System Progression', description: '10 without a target 10 with a target 10 with a hitter – hitter must stay out of the 6 to count 10 with blockers', minPlayers: 6, maxPlayers: 99, defaultDuration: 15, tags: ['attacking', 'defense', 'setting'], stations: 'full', coachNotes: '10 without a target 10 with a target 10 with a hitter – hitter must stay out of the 6 to count 10 with blockers | Coaching points: Stay away from the 6 | Variations: 8 each: in the box / target & tip (covering) / hitter / blockers 5 each version: to the pins / target / hitting / with a block No communication = start over' },
  { id: 'bank-rotations-back-to-base', name: 'Rotations (Back to Base)', description: 'Coach serves, then immediately throws a short or deep ball in for the team to play out Coach hits a down ball, then throws a ball to the opposite spot for the…', minPlayers: 6, maxPlayers: 99, defaultDuration: 15, tags: ['attacking', 'defense'], stations: 'full', coachNotes: 'Coach serves, then immediately throws a short or deep ball in for the team to play out Coach hits a down ball, then throws a ball to the opposite spot for the team to play out Player serves and coach immediately throws a ball into the server\'s spot After all 3 balls, rotate' },
  { id: 'bank-transition-out-of-system-cover-repeat', name: 'Transition Out of System, Cover, Repeat', description: 'From the team drill bank — no written description yet.', minPlayers: 4, maxPlayers: 99, defaultDuration: 10, tags: ['attacking', 'defense'], stations: 'full', coachNotes: '' },
  { id: 'bank-x-drill', name: 'X Drill', description: 'Start at 4; need to get to 8 before 0 Lines every time not completed Switch until all pins and middles have run', minPlayers: 6, maxPlayers: 99, defaultDuration: 20, tags: ['attacking', 'defense'], stations: 'full', coachNotes: 'Start at 4; need to get to 8 before 0 Lines every time not completed Switch until all pins and middles have run | Variations: 2 points for a block, a one/slide/3 from the middle, or pins hitting line' },
  // Warm-up
  { id: 'bank-assassin', name: 'Assassin', description: 'Coach calls right or left – players shuffle that way Coach calls a number – that player grabs the ball while everyone else runs Hit by the ball = out; miss…', minPlayers: 6, maxPlayers: 99, defaultDuration: 10, tags: ['warm-up'], stations: 'full', coachNotes: 'Coach calls right or left – players shuffle that way Coach calls a number – that player grabs the ball while everyone else runs Hit by the ball = out; miss your throw = out | Variations: Groups of 4–8 around a dodgeball – a fun alternative to agility star drills' },
  { id: 'bank-ball-out', name: 'Ball Out', description: 'Go all out – high-risk swings, loud communication Work up to 10 minutes straight', minPlayers: 10, maxPlayers: 99, defaultDuration: 5, tags: ['warm-up'], stations: 'full', coachNotes: 'Go all out – high-risk swings, loud communication Work up to 10 minutes straight | Variations: Bounce variation (see Bounce)' },
  { id: 'bank-barnyard-communication', name: 'Barnyard Communication', description: 'Players make barnyard sounds to find each other', minPlayers: 4, maxPlayers: 99, defaultDuration: 10, tags: ['warm-up'], stations: 'full', coachNotes: 'Players make barnyard sounds to find each other' },
  { id: 'bank-communication-warm-up', name: 'Communication Warm-up', description: '2 min each: Shuttle passing & setting – most in a row as a team Partner ground-bounce pass Partner ground-bounce set Partner ground-bounce set, partner hits', minPlayers: 2, maxPlayers: 99, defaultDuration: 15, tags: ['warm-up'], stations: 'split', coachNotes: '2 min each: Shuttle passing & setting – most in a row as a team Partner ground-bounce pass Partner ground-bounce set Partner ground-bounce set, partner hits' },
  { id: 'bank-hourglass', name: 'Hourglass', description: 'Ball travels 1→2→3→4→1, diagonally over the net Follow your ball to the line you sent it to Add a 2nd ball: as 1 sends to 2, 3 sends to 4 – the balls chase…', minPlayers: 8, maxPlayers: 99, defaultDuration: 5, tags: ['passing', 'warm-up'], stations: 'split', coachNotes: 'Ball travels 1→2→3→4→1, diagonally over the net Follow your ball to the line you sent it to Add a 2nd ball: as 1 sends to 2, 3 sends to 4 – the balls chase each other around | Coaching points: Keep timing so one ball doesn\'t catch the other | Variations: Start with 1 ball if ball control is weak' },
  { id: 'bank-standard-warm-up-cones-ball-control', name: 'Standard Warm-up (Cones + Ball Control)', description: '2 min cones 3 min short to long 3 min long to short 4 min ball control: 10 pass & bounce right hand, 10 pass & bounce left hand, 10 roll & pass, 10 pass…', minPlayers: 6, maxPlayers: 99, defaultDuration: 20, tags: ['warm-up'], stations: 'full', coachNotes: '2 min cones 3 min short to long 3 min long to short 4 min ball control: 10 pass & bounce right hand, 10 pass & bounce left hand, 10 roll & pass, 10 pass up-downs Pass, set, hit to partner | Variations: Later version: start with 2 laps + agilities and cut each block to 2 min Often split: setters + middles (or pins) work timing/connection with an assistant while the rest do the ball-control warm-up' },
]

// ── UI Helpers ────────────────────────────────────────────────────────────────

const TAG_STYLES: Record<SkillTag, { label: string; color: string; bg: string }> = {
  'warm-up':     { label: 'Warm-Up',    color: 'text-orange-400',  bg: 'bg-orange-900/30 border-orange-600/40' },
  'serving':     { label: 'Serving',    color: 'text-yellow-400',  bg: 'bg-yellow-900/30 border-yellow-600/40' },
  'passing':     { label: 'Passing',    color: 'text-blue-400',    bg: 'bg-blue-900/30 border-blue-600/40' },
  'setting':     { label: 'Setting',    color: 'text-purple-400',  bg: 'bg-purple-900/30 border-purple-600/40' },
  'attacking':   { label: 'Attacking',  color: 'text-green-400',   bg: 'bg-green-900/30 border-green-600/40' },
  'defense':     { label: 'Defense',    color: 'text-pb-400',      bg: 'bg-pb-900/30 border-pb-600/40' },
  'blocking':    { label: 'Blocking',   color: 'text-red-400',     bg: 'bg-red-900/30 border-red-600/40' },
  'conditioning':{ label: 'Cond.',      color: 'text-pink-400',    bg: 'bg-pink-900/30 border-pink-600/40' },
  'cool-down':   { label: 'Cool-Down',  color: 'text-gray-400',    bg: 'bg-gray-800/50 border-gray-600/40' },
}

const ALL_TAGS = Object.keys(TAG_STYLES) as SkillTag[]

function fmt(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function addMins(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(':').map(Number)
  const total = h * 60 + m + mins
  const nh = Math.floor(total / 60) % 24
  const nm = total % 60
  return `${String(nh).padStart(2,'0')}:${String(nm).padStart(2,'0')}`
}

function displayTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12  = h % 12 || 12
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

function blockFromDrill(d: Drill): PlanBlock {
  return { id: uid(), drillId: d.id, name: d.name, duration: d.defaultDuration, tags: d.tags, stations: d.stations, notes: d.coachNotes ?? '' }
}

// ── SortableBlock ─────────────────────────────────────────────────────────────

interface SortableBlockProps {
  block: PlanBlock
  blockStart: string
  blockEnd: string
  isEditMode: boolean
  isExpanded: boolean
  onToggleNotes: () => void
  onDurationChange: (delta: number) => void
  onNotesChange: (notes: string) => void
  onRemove: () => void
}

function SortableBlock({ block, blockStart, blockEnd, isEditMode, isExpanded, onToggleNotes, onDurationChange, onNotesChange, onRemove }: SortableBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  if (!isEditMode) {
    return (
      <div ref={setNodeRef} style={style} className="bg-navy-800 border border-white/10 rounded-2xl px-4 py-3 flex items-start gap-3">
        <div className="flex flex-col items-center shrink-0 pt-0.5">
          <span className="text-gray-500 text-[10px] font-mono">{displayTime(blockStart)}</span>
          <div className="w-px flex-1 bg-white/10 my-1 min-h-[18px]" />
          <span className="text-gray-600 text-[10px] font-mono">{displayTime(blockEnd)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm">{block.name}</p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {block.tags.map(t => (
              <span key={t} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${TAG_STYLES[t].bg} ${TAG_STYLES[t].color}`}>
                {TAG_STYLES[t].label}
              </span>
            ))}
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
              block.stations === 'full' ? 'bg-navy-700 border-white/10 text-gray-500' : 'bg-vr-900/30 border-vr-600/30 text-vr-400'
            }`}>
              {block.stations === 'full' ? '⚡ Full team' : '🔀 Stations'}
            </span>
          </div>
          {block.notes && <p className="text-gray-600 text-xs italic mt-1.5">{block.notes}</p>}
        </div>
        <span className="text-gray-600 text-xs font-bold shrink-0 mt-0.5">{fmt(block.duration)}</span>
      </div>
    )
  }

  return (
    <div ref={setNodeRef} style={style} className={`bg-navy-800 border rounded-2xl overflow-hidden transition-colors ${isExpanded ? 'border-vr-500/50' : 'border-white/15'}`}>
      <div className="px-4 pt-2 pb-2 flex items-start gap-2">
        {/* Drag handle */}
        <button {...attributes} {...listeners}
          className="shrink-0 mt-0.5 touch-none text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing px-0.5 py-0.5 text-base leading-none">
          ⠿
        </button>
        {/* Time column */}
        <div className="flex flex-col items-center shrink-0 pt-0.5">
          <span className="text-gray-500 text-[10px] font-mono">{displayTime(blockStart)}</span>
          <div className="w-px flex-1 bg-white/10 my-0.5 min-h-[14px]" />
          <span className="text-gray-600 text-[10px] font-mono">{displayTime(blockEnd)}</span>
        </div>
        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm mb-1">{block.name}</p>
          <div className="flex flex-wrap gap-1 mb-1.5">
            {block.tags.map(t => (
              <span key={t} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${TAG_STYLES[t].bg} ${TAG_STYLES[t].color}`}>
                {TAG_STYLES[t].label}
              </span>
            ))}
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
              block.stations === 'full' ? 'bg-navy-700 border-white/10 text-gray-500' : 'bg-vr-900/30 border-vr-600/30 text-vr-400'
            }`}>
              {block.stations === 'full' ? '⚡ Full team' : '🔀 Stations'}
            </span>
          </div>
          {/* Controls: duration + actions */}
          <div className="flex items-center gap-1.5">
            <button onClick={() => onDurationChange(-5)}
              className="tap-btn w-7 h-7 rounded-lg bg-navy-700 border border-white/10 text-white flex items-center justify-center text-base leading-none shrink-0">−</button>
            <span className="text-white font-bold text-xs w-9 text-center shrink-0">{fmt(block.duration)}</span>
            <button onClick={() => onDurationChange(5)}
              className="tap-btn w-7 h-7 rounded-lg bg-navy-700 border border-white/10 text-white flex items-center justify-center text-base leading-none shrink-0">+</button>
            <div className="flex-1" />
            <button onClick={onToggleNotes}
              className={`tap-btn text-[11px] px-2 py-1 rounded-lg border shrink-0 ${isExpanded ? 'border-vr-500/50 text-vr-300' : 'border-white/10 text-gray-500'}`}>
              Notes
            </button>
            <button onClick={onRemove}
              className="tap-btn w-7 h-7 rounded-lg bg-red-900/20 border border-red-800/30 text-red-500 flex items-center justify-center text-xs shrink-0">✕</button>
          </div>
        </div>
      </div>
      {isExpanded && (
        <div className="px-4 pb-3">
          <textarea value={block.notes}
            onChange={e => onNotesChange(e.target.value)}
            placeholder="Coaching notes, cues, modifications…" rows={2}
            className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2 text-white text-xs placeholder-gray-600 focus:outline-none resize-none" />
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

type View = 'home' | 'setup' | 'build' | 'custom'

export default function PracticePlanner({ onBack, onSync }: { onBack?: () => void; onSync?: () => void }) {
  const [plans,        setPlans]        = useState<PracticePlan[]>(loadPlans)
  const [customDrills, setCustomDrills] = useState<Drill[]>(loadCustom)
  const [view,         setView]         = useState<View>('home')
  const [activePlan,   setActivePlan]   = useState<PracticePlan | null>(null)
  const [showLibrary,  setShowLibrary]  = useState(false)
  const [showPlanEdit, setShowPlanEdit] = useState(false)
  const [tagFilter,    setTagFilter]    = useState<SkillTag[]>([])
  const [editBlock,    setEditBlock]    = useState<string | null>(null)
  const [confirmDel,   setConfirmDel]   = useState<string | null>(null)
  const dndSensors = useSensors(
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )
  const [planNameEdit, setPlanNameEdit] = useState(false)

  // Setup form state
  const [setupName,       setSetupName]       = useState('')
  const [setupDate,       setSetupDate]       = useState(() => new Date().toISOString().split('T')[0])
  const [setupStart,      setSetupStart]      = useState('18:00')
  const [setupDuration,   setSetupDuration]   = useState(120)
  const [setupPlayers,    setSetupPlayers]    = useState(12)
  const [setupIsTemplate, setSetupIsTemplate] = useState(false)

  // Custom drill form
  const [cdName,     setCdName]     = useState('')
  const [cdDesc,     setCdDesc]     = useState('')
  const [cdMin,      setCdMin]      = useState(2)
  const [cdMax,      setCdMax]      = useState(99)
  const [cdDur,      setCdDur]      = useState(15)
  const [cdTags,     setCdTags]     = useState<SkillTag[]>([])
  const [cdStations, setCdStations] = useState<StationMode>('full')
  const [cdNotes,    setCdNotes]    = useState('')

  function upsertPlan(p: PracticePlan) {
    const next = plans.some(x => x.id === p.id) ? plans.map(x => x.id === p.id ? p : x) : [...plans, p]
    setPlans(next); savePlans(next); onSync?.()
    if (activePlan?.id === p.id) setActivePlan(p)
  }

  function deletePlan(id: string) {
    const next = plans.filter(p => p.id !== id)
    setPlans(next); savePlans(next)
    setConfirmDel(null)
  }

  function updateBlock(planId: string, block: PlanBlock) {
    const plan = plans.find(p => p.id === planId)
    if (!plan) return
    upsertPlan({ ...plan, blocks: plan.blocks.map(b => b.id === block.id ? block : b) })
  }

  function removeBlock(planId: string, blockId: string) {
    const plan = plans.find(p => p.id === planId)
    if (!plan) return
    upsertPlan({ ...plan, blocks: plan.blocks.filter(b => b.id !== blockId) })
    if (editBlock === blockId) setEditBlock(null)
  }

  function reorderBlocks(planId: string, fromIndex: number, toIndex: number) {
    const plan = plans.find(p => p.id === planId)
    if (!plan) return
    upsertPlan({ ...plan, blocks: arrayMove(plan.blocks, fromIndex, toIndex) })
  }

  function addDrillToPlan(drill: Drill) {
    if (!activePlan) return
    const block = blockFromDrill(drill)
    const updated = { ...activePlan, blocks: [...activePlan.blocks, block] }
    upsertPlan(updated)
    setShowLibrary(false)
  }

  // ── Home ──────────────────────────────────────────────────────────────────

  if (view === 'home') {
    const templates = plans.filter(p => p.isTemplate)
    const sessions  = plans.filter(p => !p.isTemplate).sort((a,b) => b.date.localeCompare(a.date))
    const today = new Date().toISOString().split('T')[0]

    return (
      <div className="flex flex-col h-full">
      <div className="bg-navy-800 border-b border-white/10 px-4 py-3 flex items-center shrink-0">
        <button onClick={onBack} className="tap-btn text-gray-400 text-sm">← Tools</button>
        <p className="flex-1 text-center text-white font-bold text-sm">Practice Planner</p>
        <div className="w-16" />
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain p-4 flex flex-col gap-4 pb-10">

        <button onClick={() => { setSetupIsTemplate(false); setSetupName(''); setView('setup') }}
          className="tap-btn w-full bg-vr-700 border border-vr-500 rounded-2xl py-3.5 text-white font-bold text-sm">
          + New Practice Plan
        </button>

        {templates.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wide">Templates</p>
            {templates.map(p => (
              <PlanCard key={p.id} plan={p} today={today}
                onOpen={() => { setActivePlan(p); setView('build') }}
                onCopy={() => {
                  const copy: PracticePlan = { ...p, id: uid(), name: `${p.name} (copy)`, date: today, isTemplate: false }
                  upsertPlan(copy); setActivePlan(copy); setView('build')
                }}
                onDelete={() => setConfirmDel(p.id)}
                confirmDel={confirmDel === p.id}
                onConfirmDel={() => deletePlan(p.id)}
                onCancelDel={() => setConfirmDel(null)} />
            ))}
          </div>
        )}

        {sessions.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wide">Recent Plans</p>
            {sessions.map(p => (
              <PlanCard key={p.id} plan={p} today={today}
                onOpen={() => { setActivePlan(p); setView('build') }}
                onCopy={() => {
                  const copy: PracticePlan = { ...p, id: uid(), name: `${p.name} (copy)`, date: today }
                  upsertPlan(copy); setActivePlan(copy); setView('build')
                }}
                onDelete={() => setConfirmDel(p.id)}
                confirmDel={confirmDel === p.id}
                onConfirmDel={() => deletePlan(p.id)}
                onCancelDel={() => setConfirmDel(null)} />
            ))}
          </div>
        )}

        {plans.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-gray-500 text-sm">No practice plans yet.</p>
            <p className="text-gray-600 text-xs mt-1">Create one above to get started.</p>
          </div>
        )}

        <button onClick={() => { setSetupIsTemplate(true); setSetupName(''); setView('setup') }}
          className="tap-btn w-full border border-dashed border-white/15 rounded-2xl py-3 text-gray-600 text-sm">
          + Save a Template
        </button>
      </div>
      </div>
    )
  }

  // ── Setup ─────────────────────────────────────────────────────────────────

  if (view === 'setup') {
    function create() {
      if (!setupName.trim()) return
      const plan: PracticePlan = {
        id: uid(), name: setupName.trim(), date: setupDate,
        startTime: setupStart, totalMinutes: setupDuration,
        playerCount: setupPlayers, blocks: [], isTemplate: setupIsTemplate,
      }
      upsertPlan(plan); setActivePlan(plan); setView('build')
    }

    return (
      <div className="flex flex-col h-full">
        <div className="bg-navy-800 border-b border-white/10 px-4 py-3 flex items-center shrink-0">
          <button onClick={() => setView('home')} className="tap-btn text-gray-400 text-sm">Cancel</button>
          <p className="flex-1 text-center text-white font-bold text-sm">
            {setupIsTemplate ? 'New Template' : 'New Plan'}
          </p>
          <button onClick={create} disabled={!setupName.trim()}
            className="tap-btn text-vr-300 font-bold text-sm disabled:opacity-40">Create</button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-gray-500 text-xs uppercase tracking-wide">Plan Name *</label>
            <input value={setupName} onChange={e => setSetupName(e.target.value)} autoFocus
              placeholder="e.g. Tuesday Serving Focus"
              className="bg-navy-700 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none" />
          </div>
          {!setupIsTemplate && (
            <div className="flex flex-col gap-1">
              <label className="text-gray-500 text-xs uppercase tracking-wide">Date</label>
              <input type="date" value={setupDate} onChange={e => setSetupDate(e.target.value)}
                className="bg-navy-700 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" />
            </div>
          )}
          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-gray-500 text-xs uppercase tracking-wide">Start Time</label>
              <input type="time" value={setupStart} onChange={e => setSetupStart(e.target.value)}
                className="bg-navy-700 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-gray-500 text-xs uppercase tracking-wide">Duration</label>
              <div className="flex items-center gap-2 bg-navy-700 border border-white/20 rounded-xl px-3 py-2">
                <button onClick={() => setSetupDuration(d => Math.max(30, d - 15))} className="tap-btn text-gray-400 text-lg w-6">−</button>
                <span className="flex-1 text-center text-white text-sm font-bold">{fmt(setupDuration)}</span>
                <button onClick={() => setSetupDuration(d => Math.min(240, d + 15))} className="tap-btn text-gray-400 text-lg w-6">+</button>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-gray-500 text-xs uppercase tracking-wide">Players at Practice</label>
            <div className="flex items-center gap-3 bg-navy-700 border border-white/20 rounded-xl px-4 py-3">
              <button onClick={() => setSetupPlayers(n => Math.max(2, n - 1))} className="tap-btn text-gray-400 text-2xl w-8 text-center">−</button>
              <span className="flex-1 text-center text-white text-2xl font-black">{setupPlayers}</span>
              <button onClick={() => setSetupPlayers(n => Math.min(30, n + 1))} className="tap-btn text-gray-400 text-2xl w-8 text-center">+</button>
            </div>
            <p className="text-gray-600 text-xs text-center">This filters drills to what works with your roster size</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  if (view === 'build' && activePlan) {
    const plan       = plans.find(p => p.id === activePlan.id) ?? activePlan
    const usedMins   = plan.blocks.reduce((s, b) => s + b.duration, 0)
    const remaining  = plan.totalMinutes - usedMins
    const pct        = Math.min(100, Math.round(usedMins / plan.totalMinutes * 100))
    const overTime   = usedMins > plan.totalMinutes
    const endTime    = addMins(plan.startTime, usedMins)

    // Tag breakdown
    const tagMinutes: Partial<Record<SkillTag, number>> = {}
    for (const b of plan.blocks) {
      for (const t of b.tags) {
        tagMinutes[t] = (tagMinutes[t] ?? 0) + b.duration / b.tags.length
      }
    }

    // All drills (library + custom), filtered by player count
    const allDrills = [...LIBRARY, ...customDrills].filter(d => plan.playerCount >= d.minPlayers && plan.playerCount <= d.maxPlayers)
    const filtered  = tagFilter.length ? allDrills.filter(d => tagFilter.some(t => d.tags.includes(t))) : allDrills

    // Group library by first tag for browsing
    const grouped: Partial<Record<SkillTag, Drill[]>> = {}
    for (const d of filtered) {
      const t = d.tags[0]
      if (!grouped[t]) grouped[t] = []
      grouped[t]!.push(d)
    }
    const groupOrder: SkillTag[] = ['warm-up','serving','passing','setting','attacking','defense','blocking','conditioning','cool-down']

    return (
      <div className="flex flex-col h-full relative">
        {/* Header */}
        <div className="bg-navy-800 border-b border-white/10 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => { setShowLibrary(false); setEditBlock(null); setShowPlanEdit(false); setView('home') }}
              className="tap-btn text-gray-400 text-sm">← Plans</button>
            <div className="flex-1 flex items-center justify-center gap-2">
              {planNameEdit ? (
                <input value={plan.name} autoFocus
                  onChange={e => upsertPlan({ ...plan, name: e.target.value })}
                  onBlur={() => setPlanNameEdit(false)}
                  onKeyDown={e => e.key === 'Enter' && setPlanNameEdit(false)}
                  className="bg-transparent text-white font-bold text-sm text-center border-b border-white/30 focus:outline-none w-40" />
              ) : (
                <button onClick={() => setPlanNameEdit(true)} className="tap-btn text-white font-bold text-sm">{plan.name}</button>
              )}
              {plan.isTemplate && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-vr-900/50 border border-vr-600/40 text-vr-400">TEMPLATE</span>}
            </div>
            <button
              onClick={() => { setShowPlanEdit(e => !e); setEditBlock(null) }}
              className={`tap-btn text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                showPlanEdit
                  ? 'bg-vr-700/50 border-vr-500/60 text-white'
                  : 'border-white/10 text-gray-400'
              }`}>
              {showPlanEdit ? 'Done' : 'Edit'}
            </button>
          </div>
          {/* Time bar */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-gray-500 text-[11px]">{displayTime(plan.startTime)}</span>
            <div className="flex-1 h-2 bg-navy-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${overTime ? 'bg-red-500' : 'bg-vr-500'}`}
                style={{ width: `${pct}%` }} />
            </div>
            <span className={`text-[11px] font-bold ${overTime ? 'text-red-400' : 'text-gray-500'}`}>
              {fmt(usedMins)}/{fmt(plan.totalMinutes)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-[10px]">
              {overTime
                ? `⚠️ ${fmt(Math.abs(remaining))} over`
                : remaining > 0 ? `${fmt(remaining)} remaining` : 'Practice full!'}
            </span>
            <span className="text-gray-600 text-[10px]">Ends {displayTime(endTime)} · {plan.playerCount} players</span>
          </div>
        </div>

        {/* Tag breakdown */}
        {plan.blocks.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto px-4 py-2 shrink-0 no-scrollbar">
            {ALL_TAGS.filter(t => tagMinutes[t]).map(t => (
              <div key={t} className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-bold shrink-0 ${TAG_STYLES[t].bg} ${TAG_STYLES[t].color}`}>
                {TAG_STYLES[t].label} {Math.round(tagMinutes[t]!)}m
              </div>
            ))}
          </div>
        )}

        {/* Plan blocks */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 flex flex-col gap-2 pb-28">
          {plan.blocks.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-gray-500 text-sm">No drills yet.</p>
              <p className="text-gray-600 text-xs mt-1">Tap "Add Drills" below to build your plan.</p>
            </div>
          ) : (() => {
            // Pre-compute time ranges before sortable rendering
            const timeRanges: { start: string; end: string }[] = []
            let t = plan.startTime
            for (const block of plan.blocks) {
              const s = t
              t = addMins(t, block.duration)
              timeRanges.push({ start: s, end: t })
            }
            return (
              <DndContext
                sensors={dndSensors}
                collisionDetection={closestCenter}
                onDragEnd={(event: DragEndEvent) => {
                  const { active, over } = event
                  if (!over || active.id === over.id) return
                  const from = plan.blocks.findIndex(b => b.id === active.id)
                  const to   = plan.blocks.findIndex(b => b.id === over.id)
                  reorderBlocks(plan.id, from, to)
                }}
              >
                <SortableContext items={plan.blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                  {plan.blocks.map((block, i) => (
                    <SortableBlock
                      key={block.id}
                      block={block}
                      blockStart={timeRanges[i].start}
                      blockEnd={timeRanges[i].end}
                      isEditMode={showPlanEdit}
                      isExpanded={editBlock === block.id}
                      onToggleNotes={() => setEditBlock(editBlock === block.id ? null : block.id)}
                      onDurationChange={delta => updateBlock(plan.id, { ...block, duration: Math.max(5, block.duration + delta) })}
                      onNotesChange={notes => updateBlock(plan.id, { ...block, notes })}
                      onRemove={() => removeBlock(plan.id, block.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )
          })()}
        </div>

        {/* Add Drills button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-navy-900 via-navy-900/95 to-transparent pointer-events-none">
          <button onClick={() => setShowLibrary(true)}
            className="tap-btn pointer-events-auto w-full bg-vr-700 border border-vr-500 rounded-2xl py-3.5 text-white font-bold text-sm shadow-xl">
            + Add Drills
          </button>
        </div>

        {/* Drill Library drawer */}
        {showLibrary && (
          <div className="absolute inset-0 z-40 flex flex-col">
            <button onClick={() => { setShowLibrary(false); setTagFilter([]) }}
              className="flex-1 bg-black/40 tap-btn" />
            <div className="bg-navy-800 border-t border-white/10 flex flex-col" style={{ maxHeight: '75vh' }}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
                <p className="text-white font-bold text-sm">Drill Library</p>
                <div className="flex gap-2">
                  <button onClick={() => { setShowLibrary(false); setView('custom') }}
                    className="tap-btn text-xs font-bold px-3 py-1.5 border border-white/10 rounded-xl text-gray-400">
                    + Custom
                  </button>
                  <button onClick={() => { setShowLibrary(false); setTagFilter([]) }}
                    className="tap-btn text-gray-400 text-sm">✕</button>
                </div>
              </div>
              {/* Tag filter chips */}
              <div className="flex gap-1.5 overflow-x-auto px-4 py-2 shrink-0 no-scrollbar">
                {ALL_TAGS.map(t => (
                  <button key={t} onClick={() => setTagFilter(f => f.includes(t) ? f.filter(x => x !== t) : [...f, t])}
                    className={`tap-btn px-2.5 py-1 rounded-full border text-[10px] font-bold shrink-0 transition-all ${
                      tagFilter.includes(t) ? `${TAG_STYLES[t].bg} ${TAG_STYLES[t].color}` : 'border-white/10 text-gray-600'
                    }`}>
                    {TAG_STYLES[t].label}
                  </button>
                ))}
              </div>
              <p className="text-gray-600 text-[10px] px-4 pb-1 shrink-0">
                Showing drills for {plan.playerCount} players
              </p>
              {/* Drill list */}
              <div className="overflow-y-auto overscroll-contain flex-1 px-4 pb-4 flex flex-col gap-1">
                {groupOrder.filter(g => grouped[g]?.length).map(g => (
                  <div key={g}>
                    <p className={`text-[10px] font-black uppercase tracking-wide py-2 ${TAG_STYLES[g].color}`}>{TAG_STYLES[g].label}</p>
                    {grouped[g]!.map(drill => (
                      <button key={drill.id}
                        onClick={() => addDrillToPlan(drill)}
                        className="tap-btn w-full bg-navy-700/60 border border-white/8 rounded-xl px-3 py-2.5 flex items-center gap-3 text-left mb-1.5 active:scale-[0.98]">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-white text-sm font-bold">{drill.name}</p>
                            {drill.isCustom && <span className="text-[9px] font-bold text-vr-400 border border-vr-600/40 px-1 rounded">CUSTOM</span>}
                          </div>
                          <p className="text-gray-600 text-[11px] mt-0.5 line-clamp-1">{drill.description}</p>
                          <p className="text-gray-600 text-[10px] mt-0.5">
                            {drill.stations === 'split' ? '🔀 Stations' : '⚡ Full team'}
                            {drill.minPlayers > 2 ? ` · min ${drill.minPlayers} players` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-white font-bold text-sm">{drill.defaultDuration}m</p>
                          <p className="text-vr-400 text-xs font-bold mt-1">+ Add</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
                {filtered.length === 0 && (
                  <p className="text-gray-600 text-sm text-center py-6">No drills match these filters.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Custom Drill ──────────────────────────────────────────────────────────

  if (view === 'custom') {
    function saveCustomDrill() {
      if (!cdName.trim() || cdTags.length === 0) return
      const d: Drill = {
        id: uid(), name: cdName.trim(), description: cdDesc.trim(),
        minPlayers: cdMin, maxPlayers: cdMax === 99 ? 99 : cdMax,
        defaultDuration: cdDur, tags: cdTags, stations: cdStations,
        coachNotes: cdNotes.trim(), isCustom: true,
      }
      const next = [...customDrills, d]
      setCustomDrills(next); saveCustom(next)
      setCdName(''); setCdDesc(''); setCdMin(2); setCdMax(99); setCdDur(15); setCdTags([]); setCdStations('full'); setCdNotes('')
      setView('build'); setShowLibrary(true)
    }

    return (
      <div className="flex flex-col h-full">
        <div className="bg-navy-800 border-b border-white/10 px-4 py-3 flex items-center shrink-0">
          <button onClick={() => { setView('build'); setShowLibrary(true) }} className="tap-btn text-gray-400 text-sm">Cancel</button>
          <p className="flex-1 text-center text-white font-bold text-sm">Custom Drill</p>
          <button onClick={saveCustomDrill} disabled={!cdName.trim() || cdTags.length === 0}
            className="tap-btn text-vr-300 font-bold text-sm disabled:opacity-40">Save</button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 flex flex-col gap-4 pb-10">
          <div className="flex flex-col gap-1">
            <label className="text-gray-500 text-xs uppercase tracking-wide">Drill Name *</label>
            <input value={cdName} onChange={e => setCdName(e.target.value)} placeholder="e.g. Queen of the Court"
              className="bg-navy-700 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-gray-500 text-xs uppercase tracking-wide">Description</label>
            <textarea value={cdDesc} onChange={e => setCdDesc(e.target.value)} rows={2}
              placeholder="Brief description of how the drill works…"
              className="bg-navy-700 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none resize-none" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-gray-500 text-xs uppercase tracking-wide">Skills (pick all that apply) *</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_TAGS.map(t => (
                <button key={t} onClick={() => setCdTags(f => f.includes(t) ? f.filter(x => x !== t) : [...f, t])}
                  className={`tap-btn px-2.5 py-1.5 rounded-full border text-xs font-bold transition-all ${
                    cdTags.includes(t) ? `${TAG_STYLES[t].bg} ${TAG_STYLES[t].color}` : 'border-white/10 text-gray-600'
                  }`}>
                  {TAG_STYLES[t].label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-gray-500 text-xs uppercase tracking-wide">Default Duration</label>
              <div className="flex items-center gap-2 bg-navy-700 border border-white/20 rounded-xl px-3 py-2">
                <button onClick={() => setCdDur(d => Math.max(5, d - 5))} className="tap-btn text-gray-400 text-lg">−</button>
                <span className="flex-1 text-center text-white font-bold text-sm">{cdDur}m</span>
                <button onClick={() => setCdDur(d => d + 5)} className="tap-btn text-gray-400 text-lg">+</button>
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-gray-500 text-xs uppercase tracking-wide">Format</label>
              <div className="flex gap-1">
                {(['full','split'] as StationMode[]).map(s => (
                  <button key={s} onClick={() => setCdStations(s)}
                    className={`tap-btn flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      cdStations === s ? 'bg-vr-700/50 border-vr-500/60 text-white' : 'border-white/10 text-gray-600'
                    }`}>
                    {s === 'full' ? '⚡ Full' : '🔀 Stations'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-gray-500 text-xs uppercase tracking-wide">Min Players</label>
              <div className="flex items-center gap-2 bg-navy-700 border border-white/20 rounded-xl px-3 py-2">
                <button onClick={() => setCdMin(n => Math.max(2, n - 1))} className="tap-btn text-gray-400 text-lg">−</button>
                <span className="flex-1 text-center text-white font-bold text-sm">{cdMin}</span>
                <button onClick={() => setCdMin(n => Math.min(cdMax === 99 ? 30 : cdMax, n + 1))} className="tap-btn text-gray-400 text-lg">+</button>
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-gray-500 text-xs uppercase tracking-wide">Max Players</label>
              <div className="flex items-center gap-2 bg-navy-700 border border-white/20 rounded-xl px-3 py-2">
                <button onClick={() => setCdMax(n => n === 99 ? 20 : Math.max(cdMin, n - 1))} className="tap-btn text-gray-400 text-lg">−</button>
                <span className="flex-1 text-center text-white font-bold text-sm">{cdMax === 99 ? '∞' : cdMax}</span>
                <button onClick={() => setCdMax(n => n >= 30 ? 99 : n + 1)} className="tap-btn text-gray-400 text-lg">+</button>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-gray-500 text-xs uppercase tracking-wide">Coaching Notes</label>
            <textarea value={cdNotes} onChange={e => setCdNotes(e.target.value)} rows={2}
              placeholder="Cues, progressions, common mistakes to watch for…"
              className="bg-navy-700 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none resize-none" />
          </div>
        </div>
      </div>
    )
  }

  return null
}

// ── Plan Card ─────────────────────────────────────────────────────────────────

function PlanCard({ plan, today, onOpen, onCopy, onDelete, confirmDel, onConfirmDel, onCancelDel }: {
  plan: PracticePlan; today: string
  onOpen: () => void; onCopy: () => void; onDelete: () => void
  confirmDel: boolean; onConfirmDel: () => void; onCancelDel: () => void
}) {
  const usedMins = plan.blocks.reduce((s,b) => s+b.duration, 0)
  const pct      = Math.min(100, Math.round(usedMins / plan.totalMinutes * 100))
  const isPast   = !plan.isTemplate && plan.date < today

  const tagMinutes: Partial<Record<SkillTag, number>> = {}
  for (const b of plan.blocks) {
    for (const t of b.tags) {
      tagMinutes[t] = (tagMinutes[t] ?? 0) + b.duration / b.tags.length
    }
  }
  const topTags = ALL_TAGS.filter(t => tagMinutes[t]).sort((a,b) => (tagMinutes[b] ?? 0) - (tagMinutes[a] ?? 0)).slice(0,3)

  return (
    <div className={`bg-navy-800 border border-white/10 rounded-2xl overflow-hidden ${isPast ? 'opacity-60' : ''}`}>
      <button onClick={onOpen} className="tap-btn w-full px-4 pt-3 pb-2 text-left">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            <p className="text-white font-bold text-sm">{plan.name}</p>
            <p className="text-gray-500 text-xs">
              {plan.isTemplate ? `${displayTime(plan.startTime)} · ${fmt(plan.totalMinutes)}` : `${plan.date} · ${displayTime(plan.startTime)}`}
              {` · ${plan.playerCount} players`}
            </p>
          </div>
          <span className="text-gray-600 text-sm">›</span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-vr-500 rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {topTags.map(t => (
              <span key={t} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${TAG_STYLES[t].bg} ${TAG_STYLES[t].color}`}>
                {TAG_STYLES[t].label}
              </span>
            ))}
          </div>
          <span className="text-gray-600 text-[10px]">{plan.blocks.length} drills · {fmt(usedMins)}/{fmt(plan.totalMinutes)}</span>
        </div>
      </button>
      <div className="flex border-t border-white/8">
        <button onClick={onCopy} className="tap-btn flex-1 py-2 text-gray-500 text-xs border-r border-white/8">📋 Copy</button>
        {confirmDel ? (
          <>
            <button onClick={onCancelDel} className="tap-btn flex-1 py-2 text-gray-500 text-xs border-r border-white/8">Cancel</button>
            <button onClick={onConfirmDel} className="tap-btn flex-1 py-2 text-red-500 text-xs font-bold">Delete</button>
          </>
        ) : (
          <button onClick={onDelete} className="tap-btn flex-1 py-2 text-gray-700 text-xs">Delete</button>
        )}
      </div>
    </div>
  )
}
