/**
 * Deterministic synthetic profile generator (seeded PRNG -> same data on every run).
 * Distributions are loosely modelled on Indian matrimony demographics so matching behaves realistically:
 * religion-linked surnames/communities/languages, age-linked income, gendered height curves, etc.
 */

// mulberry32 - tiny, fast, deterministic PRNG.
export function makeRng(seed = 42) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MALE_NAMES = ['Aarav', 'Vivaan', 'Arjun', 'Rohan', 'Karthik', 'Aditya', 'Rahul', 'Siddharth', 'Nikhil', 'Varun', 'Ishaan', 'Kunal', 'Manish', 'Vikram', 'Harsh', 'Akash', 'Pranav', 'Tarun', 'Gaurav', 'Yash', 'Abhishek', 'Sameer', 'Dev', 'Ankit', 'Neeraj'];
const FEMALE_NAMES = ['Ananya', 'Diya', 'Priya', 'Sneha', 'Kavya', 'Isha', 'Meera', 'Riya', 'Neha', 'Pooja', 'Shreya', 'Aditi', 'Tanvi', 'Nisha', 'Divya', 'Simran', 'Anjali', 'Radhika', 'Swati', 'Kritika', 'Sanya', 'Aishwarya', 'Mansi', 'Ritika', 'Pallavi'];

const COMMUNITIES = {
  Hindu: {
    weight: 70,
    surnames: ['Sharma', 'Verma', 'Iyer', 'Reddy', 'Nair', 'Patel', 'Gupta', 'Joshi', 'Kulkarni', 'Menon', 'Agarwal', 'Mishra', 'Bose', 'Rao', 'Desai'],
    castes: ['Brahmin', 'Reddy', 'Nair', 'Patel', 'Agarwal', 'Kayastha', 'Maratha', 'Rajput'],
    languages: ['Hindi', 'Tamil', 'Telugu', 'Marathi', 'Gujarati', 'Bengali', 'Malayalam', 'Kannada'],
    diets: ['vegetarian', 'vegetarian', 'non_vegetarian', 'eggetarian'],
  },
  Muslim: {
    weight: 8, surnames: ['Khan', 'Ahmed', 'Sheikh', 'Qureshi', 'Ansari'], castes: ['Sunni', 'Shia'],
    languages: ['Urdu', 'Hindi', 'Telugu'], diets: ['non_vegetarian', 'non_vegetarian', 'eggetarian'],
  },
  Christian: {
    weight: 7, surnames: ['Fernandes', "D'Souza", 'Thomas', 'George', 'Mathew'], castes: ['Catholic', 'Protestant', 'Syrian Christian'],
    languages: ['Malayalam', 'Konkani', 'Tamil'], diets: ['non_vegetarian', 'non_vegetarian', 'eggetarian'],
  },
  Sikh: {
    weight: 7, surnames: ['Gill', 'Sandhu', 'Bedi', 'Grewal', 'Dhillon'], castes: ['Jat Sikh', 'Khatri', 'Arora'],
    languages: ['Punjabi', 'Hindi'], diets: ['non_vegetarian', 'vegetarian', 'eggetarian'],
  },
  Jain: {
    weight: 5, surnames: ['Shah', 'Jain', 'Mehta', 'Doshi'], castes: ['Digambar', 'Shwetambar'],
    languages: ['Gujarati', 'Hindi', 'Marathi'], diets: ['jain', 'jain', 'vegetarian'],
  },
  Buddhist: {
    weight: 3, surnames: ['Gaikwad', 'Jadhav', 'Kamble'], castes: ['Mahar', 'Navayana'],
    languages: ['Marathi', 'Hindi'], diets: ['vegetarian', 'non_vegetarian'],
  },
};

const LOCATIONS = [
  ['Mumbai', 'India', 14], ['Delhi', 'India', 12], ['Bengaluru', 'India', 14], ['Hyderabad', 'India', 10],
  ['Pune', 'India', 8], ['Chennai', 'India', 7], ['Kolkata', 'India', 4], ['Ahmedabad', 'India', 4],
  ['Jaipur', 'India', 3], ['Kochi', 'India', 3], ['Chandigarh', 'India', 3], ['Gurugram', 'India', 4], ['Noida', 'India', 3],
  ['Dubai', 'UAE', 3], ['London', 'UK', 2], ['New York', 'USA', 2], ['Toronto', 'Canada', 2], ['Sydney', 'Australia', 1], ['Singapore', 'Singapore', 1],
];
const COUNTRY_DIAL = { India: '+91', UAE: '+971', UK: '+44', USA: '+1', Canada: '+1', Australia: '+61', Singapore: '+65' };

// designation, companies, degrees, base income (LPA) at ~25y
const CAREERS = [
  ['Software Engineer', ['Infosys', 'Google', 'Microsoft', 'Flipkart', 'Atlassian', 'Razorpay'], ['B.Tech', 'M.Tech', 'B.E'], 18, 14],
  ['Data Scientist', ['Fractal', 'Amazon', 'Swiggy', 'Mu Sigma'], ['M.Tech', 'M.Sc', 'B.Tech'], 20, 14],
  ['Product Manager', ['Zomato', 'PhonePe', 'Adobe', 'Paytm'], ['MBA', 'B.Tech'], 28, 16],
  ['Doctor', ['AIIMS', 'Apollo Hospitals', 'Fortis', 'Manipal Hospitals'], ['MBBS', 'MD'], 16, 18],
  ['Chartered Accountant', ['Deloitte', 'EY', 'KPMG', 'Own practice'], ['CA', 'B.Com'], 14, 12],
  ['Investment Banker', ['Goldman Sachs', 'JP Morgan', 'Kotak', 'HDFC Bank'], ['MBA', 'B.Com'], 30, 18],
  ['Marketing Manager', ['Unilever', 'Ogilvy', 'P&G', 'Nykaa'], ['MBA', 'BBA'], 16, 12],
  ['Lawyer', ['Khaitan & Co', 'AZB & Partners', 'High Court', 'Own practice'], ['LLB', 'LLM'], 14, 14],
  ['Professor', ['IIT Delhi', 'Delhi University', 'BITS Pilani', 'Christ University'], ['PhD', 'M.Sc', 'M.A'], 12, 8],
  ['UX Designer', ['Figma', 'Adobe', 'Myntra', 'InMobi'], ['B.Des', 'B.A'], 14, 10],
  ['Business Owner', ['Family business', 'Own startup', 'Own firm'], ['BBA', 'B.Com', 'MBA'], 25, 25],
  ['Civil Services Officer', ['Government of India'], ['B.A', 'B.Tech'], 14, 4],
  ['Architect', ['Morphogenesis', 'Own studio', 'HCP Design'], ['B.Arch', 'M.Arch'], 12, 8],
  ['Consultant', ['McKinsey', 'BCG', 'Accenture', 'Bain'], ['MBA', 'B.Tech'], 28, 16],
];

const COLLEGES = ['IIT Bombay', 'IIT Delhi', 'IIT Madras', 'NIT Trichy', 'BITS Pilani', 'IIM Ahmedabad', 'IIM Bangalore', 'SRCC Delhi', 'St. Stephen\'s College', 'Christ University', 'Symbiosis Pune', 'Manipal University', 'VIT Vellore', 'Anna University', 'Delhi University', 'Mumbai University', 'NLSIU Bangalore', 'AIIMS Delhi', 'Osmania University', 'Jadavpur University'];
const MEDICAL_COLLEGES = ['AIIMS Delhi', 'CMC Vellore', 'Grant Medical College', 'KEM Mumbai', 'JIPMER'];

const FATHER_JOBS = ['Retired Banker', 'Businessman', 'Government Officer', 'Professor', 'Engineer', 'Doctor', 'Farmer', 'Retired Army Officer'];
const MOTHER_JOBS = ['Homemaker', 'Teacher', 'Doctor', 'Retired Professor', 'Businesswoman', 'Banker', 'Government Officer'];
const HOBBIES = ['trekking', 'classical music', 'cooking', 'reading', 'travelling', 'photography', 'yoga', 'cricket', 'painting', 'badminton', 'baking', 'gardening', 'movies', 'dancing'];

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const randInt = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const clampN = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

function weighted(rng, items, weightOf) {
  const total = items.reduce((s, i) => s + weightOf(i), 0);
  let r = rng() * total;
  for (const item of items) {
    r -= weightOf(item);
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

/** Box-Muller normal sample. */
function gauss(rng, mean, sd) {
  const u = 1 - rng();
  const v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const tri = (rng, yes, no) => {
  const r = rng();
  return r < yes ? 'yes' : r < yes + no ? 'no' : 'maybe';
};

const slug = (s) => s.toLowerCase().replace(/[^a-z]/g, '');

/**
 * Generates one profile.
 * @param {() => number} rng
 * @param {{gender: 'male'|'female', index: number, now?: Date}} opts
 */
export function generateProfile(rng, { gender, index, now = new Date(), ageRange = [23, 38] }) {
  const religion = weighted(rng, Object.keys(COMMUNITIES), (k) => COMMUNITIES[k].weight);
  const comm = COMMUNITIES[religion];
  const [city, country] = (() => { const l = weighted(rng, LOCATIONS, (x) => x[2]); return [l[0], l[1]]; })();

  const firstName = pick(rng, gender === 'male' ? MALE_NAMES : FEMALE_NAMES);
  const lastName = pick(rng, comm.surnames);

  const age = randInt(rng, ageRange[0], ageRange[1]);
  const dob = new Date(now);
  dob.setFullYear(now.getFullYear() - age, randInt(rng, 0, 11), randInt(rng, 1, 28));

  const career = pick(rng, CAREERS);
  const [designation, companies, degrees, baseIncome, spread] = career;
  const degree = pick(rng, degrees);
  const experience = Math.max(0, age - 23);
  const income = clampN(Math.round((baseIncome * (1 + experience * 0.1) + (rng() - 0.4) * spread) * 10) / 10, 4, 400);
  const college = ['MBBS', 'MD'].includes(degree) ? pick(rng, MEDICAL_COLLEGES) : pick(rng, COLLEGES);

  const mainLanguage = pick(rng, comm.languages);
  const languages = [...new Set([mainLanguage, 'English', ...(rng() < 0.6 ? ['Hindi'] : [])])];

  const maritalRoll = rng();
  const maritalStatus = maritalRoll < 0.86 ? 'never_married' : maritalRoll < 0.96 ? 'divorced' : 'widowed';

  const diet = pick(rng, comm.diets);
  const first = slug(firstName);
  const dial = COUNTRY_DIAL[country];

  return {
    firstName,
    lastName,
    gender,
    dob,
    country,
    city,
    heightCm: Math.round(clampN(gauss(rng, gender === 'male' ? 174 : 161, gender === 'male' ? 6 : 5.5), gender === 'male' ? 155 : 145, gender === 'male' ? 196 : 182)),
    email: `${first}.${slug(lastName)}${index}@example.com`,
    phone: `${dial} ${randInt(rng, 6, 9)}${String(randInt(rng, 0, 999999999)).padStart(9, '0')}`,
    college,
    degree,
    incomeLpa: income,
    company: pick(rng, companies),
    designation,
    maritalStatus,
    languages,
    siblings: { brothers: randInt(rng, 0, 2), sisters: randInt(rng, 0, 2) },
    religion,
    caste: pick(rng, comm.castes),
    wantKids: tri(rng, 0.55, 0.12),
    openToRelocate: tri(rng, 0.35, 0.25),
    openToPets: tri(rng, 0.4, 0.3),
    motherTongue: mainLanguage,
    manglik: pick(rng, ['no', 'no', 'no', 'yes', 'partial']),
    diet,
    smoking: pick(rng, ['never', 'never', 'never', 'occasionally', 'regularly']),
    drinking: pick(rng, ['never', 'occasionally', 'occasionally', 'regularly']),
    familyType: rng() < 0.65 ? 'nuclear' : 'joint',
    familyValues: pick(rng, ['traditional', 'moderate', 'moderate', 'liberal']),
    fatherOccupation: pick(rng, FATHER_JOBS),
    motherOccupation: pick(rng, MOTHER_JOBS),
    bio: `${designation} who enjoys ${pick(rng, HOBBIES)} and ${pick(rng, HOBBIES)}. Looking for a kind, grounded partner to build a happy family with.`,
    verified: rng() < 0.85,
  };
}

/** `perGender` profiles of each gender -> 2 * perGender total. */
export function generatePool(perGender = 120, seed = 7) {
  const rng = makeRng(seed);
  const out = [];
  for (let i = 0; i < perGender; i++) {
    out.push(generateProfile(rng, { gender: 'female', index: i + 1 }));
    out.push(generateProfile(rng, { gender: 'male', index: i + 1 }));
  }
  return out;
}

const STATUS_CYCLE = ['onboarding', 'verified', 'searching', 'searching', 'match_sent', 'in_conversation', 'verified', 'on_hold', 'engaged'];
const NOTE_SAMPLES = [
  'Intro call done. Prefers someone from a similar family background; open to meeting soon.',
  'Parents keen on a Bengaluru/Hyderabad based match. Wants to avoid long-distance.',
  'Shared updated photos. Asked us to prioritise career-oriented profiles.',
];

/** Demo customers (the matchmaker's clients) incl. two deliberate edge cases. */
export function generateCustomers(matchmakerId, count, seed = 99) {
  const rng = makeRng(seed + count);
  const list = [];
  for (let i = 0; i < count; i++) {
    const gender = i % 2 === 0 ? 'male' : 'female';
    // Clients sit mid-range (26-35) so a younger/older partner exists on both sides of the pool (23-38).
    const c = generateProfile(rng, {
      gender,
      index: 1000 + i + Number(String(matchmakerId).slice(-2).replace(/\D/g, '') || 0) * 100,
      ageRange: [26, 35],
    });
    c.email = `${slug(c.firstName)}.${slug(c.lastName)}.client${i + 1}.${String(matchmakerId).slice(-4)}@example.com`;
    c.maritalStatus = i % 7 === 3 ? 'divorced' : 'never_married';
    c.verified = i % 5 !== 4;
    list.push({
      ...c,
      matchmaker: matchmakerId,
      status: STATUS_CYCLE[i % STATUS_CYCLE.length],
      notes: i % 3 === 0 ? [{ text: NOTE_SAMPLES[i % NOTE_SAMPLES.length], author: 'Seed' }] : [],
    });
  }
  if (list.length >= 3) {
    // Edge case 1: sparse profile -> engine must cope with missing data (lower confidence).
    Object.assign(list[1], { incomeLpa: undefined, wantKids: undefined, heightCm: undefined, diet: undefined, status: 'onboarding', verified: false });
    // Edge case 2: divorce not finalised -> matching must be paused.
    Object.assign(list[2], { maritalStatus: 'awaiting_divorce', status: 'on_hold' });
  }
  return list;
}
