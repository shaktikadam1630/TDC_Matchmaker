import { dash, formatDate, formatHeight, formatIncome, humanize } from '../utils/format.js';

const Field = ({ label, children }) => (
  <div className="kv"><dt>{label}</dt><dd>{dash(children)}</dd></div>
);

const Section = ({ title, children }) => (
  <section className="card">
    <h3>{title}</h3>
    <dl className="kv-grid">{children}</dl>
  </section>
);

/** Read-only full biodata, grouped the way matchmakers talk to families. */
export default function Biodata({ c }) {
  const sib = c.siblings ?? {};
  return (
    <div className="grid-2">
      <Section title="Personal">
        <Field label="First name">{c.firstName}</Field>
        <Field label="Last name">{c.lastName}</Field>
        <Field label="Gender">{humanize(c.gender)}</Field>
        <Field label="Date of birth">{`${formatDate(c.dob)} (${c.age} yrs)`}</Field>
        <Field label="Height">{formatHeight(c.heightCm)}</Field>
        <Field label="Marital status">{humanize(c.maritalStatus)}</Field>
        <Field label="Languages">{c.languages?.join(', ')}</Field>
        <Field label="Mother tongue">{c.motherTongue}</Field>
      </Section>

      <Section title="Contact & location">
        <Field label="Email">{c.email}</Field>
        <Field label="Phone">{c.phone}</Field>
        <Field label="City">{c.city}</Field>
        <Field label="Country">{c.country}</Field>
      </Section>

      <Section title="Education & career">
        <Field label="College">{c.college}</Field>
        <Field label="Degree">{c.degree}</Field>
        <Field label="Company">{c.company}</Field>
        <Field label="Designation">{c.designation}</Field>
        <Field label="Income">{formatIncome(c.incomeLpa)}</Field>
      </Section>

      <Section title="Family & community">
        <Field label="Religion">{c.religion}</Field>
        <Field label="Caste">{c.caste}</Field>
        <Field label="Manglik">{humanize(c.manglik)}</Field>
        <Field label="Siblings">{`${sib.brothers ?? 0} brother(s), ${sib.sisters ?? 0} sister(s)`}</Field>
        <Field label="Family type">{humanize(c.familyType)}</Field>
        <Field label="Family values">{humanize(c.familyValues)}</Field>
        <Field label="Father">{c.fatherOccupation}</Field>
        <Field label="Mother">{c.motherOccupation}</Field>
      </Section>

      <Section title="Lifestyle & outlook">
        <Field label="Want kids">{humanize(c.wantKids)}</Field>
        <Field label="Open to relocate">{humanize(c.openToRelocate)}</Field>
        <Field label="Open to pets">{humanize(c.openToPets)}</Field>
        <Field label="Diet">{humanize(c.diet)}</Field>
        <Field label="Smoking">{humanize(c.smoking)}</Field>
        <Field label="Drinking">{humanize(c.drinking)}</Field>
      </Section>

      <section className="card">
        <h3>About</h3>
        <p>{c.bio || '—'}</p>
      </section>
    </div>
  );
}
