/**
 * Biodata shared by Customer (the matchmaker's clients) and Profile (the match pool).
 * Required spec fields come first; the "extra" block holds fields that matter in
 * Indian matrimony (diet, manglik, family values, ...) and feed the matching engine.
 */
export const GENDERS = ['male', 'female'];
export const MARITAL_STATUSES = ['never_married', 'divorced', 'widowed', 'awaiting_divorce'];
export const TRI = ['yes', 'no', 'maybe'];
export const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Buddhist', 'Other'];
export const DIETS = ['vegetarian', 'non_vegetarian', 'eggetarian', 'vegan', 'jain'];
export const HABITS = ['never', 'occasionally', 'regularly'];
export const FAMILY_TYPES = ['nuclear', 'joint'];
export const FAMILY_VALUES = ['traditional', 'moderate', 'liberal'];
export const MANGLIK = ['yes', 'no', 'partial'];

const str = (max = 80, extra = {}) => ({ type: String, trim: true, maxlength: max, ...extra });
const oneOf = (values, extra = {}) => ({ type: String, enum: values, ...extra });

export const profileFields = {
  firstName: str(50, { required: true }),
  lastName: str(50, { required: true }),
  gender: oneOf(GENDERS, { required: true }),
  dob: { type: Date, required: true },
  country: str(60, { required: true }),
  city: str(60, { required: true }),
  heightCm: { type: Number, min: 120, max: 230 },
  email: str(120, {
    required: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
  }),
  phone: str(20, { match: [/^[+\d][\d\s-]{6,18}$/, 'Invalid phone number'] }),

  college: str(120),
  degree: str(60),
  incomeLpa: { type: Number, min: 0, max: 10000 }, // annual income in INR lakhs
  company: str(80),
  designation: str(80),

  maritalStatus: oneOf(MARITAL_STATUSES, { required: true }),
  languages: { type: [str(30)], default: [] },
  siblings: {
    brothers: { type: Number, min: 0, max: 20, default: 0 },
    sisters: { type: Number, min: 0, max: 20, default: 0 },
  },
  religion: oneOf(RELIGIONS, { required: true }),
  caste: str(60),

  wantKids: oneOf(TRI),
  openToRelocate: oneOf(TRI),
  openToPets: oneOf(TRI),

  // --- extra fields relevant to Indian matchmaking ---
  subCaste: str(60),
  motherTongue: str(30),
  manglik: oneOf(MANGLIK),
  diet: oneOf(DIETS),
  smoking: oneOf(HABITS),
  drinking: oneOf(HABITS),
  familyType: oneOf(FAMILY_TYPES),
  familyValues: oneOf(FAMILY_VALUES),
  fatherOccupation: str(80),
  motherOccupation: str(80),
  bio: str(500),
  verified: { type: Boolean, default: false },
};
