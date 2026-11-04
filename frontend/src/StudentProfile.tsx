import { useState, useEffect } from "react";

type Student = {
  id: number;
  name: string;
  email: string;
  course?: string | null;
  institution?: string | null;
  graduation_year?: number | null;
  interests?: string[];
  skills?: string[];
  preferred_domains?: string[];
};

type ProfileData = {
  course: string;
  institution: string;
  graduation_year: number | null;
  interests: string[];
  skills: string[];
  preferred_domains: string[];
};

type Props = {
  student: Student;
  onSave: (profile: ProfileData) => Promise<void>;
  onBack: () => void;
};

export function StudentProfile({ student, onSave, onBack }: Props) {
  const [course, setCourse] = useState(student.course || "");
  const [institution, setInstitution] = useState(student.institution || "");
  const [graduationYear, setGraduationYear] = useState(
    student.graduation_year?.toString() || ""
  );
  const [interests, setInterests] = useState(
    (student.interests || []).join(", ")
  );
  const [skills, setSkills] = useState(
    (student.skills || []).join(", ")
  );
  const [domains, setDomains] = useState(
    (student.preferred_domains || []).join(", ")
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setCourse(student.course || "");
    setInstitution(student.institution || "");
    setGraduationYear(student.graduation_year?.toString() || "");
    setInterests((student.interests || []).join(", "));
    setSkills((student.skills || []).join(", "));
    setDomains((student.preferred_domains || []).join(", "));
  }, [student]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const year = graduationYear.trim() ? Number(graduationYear) : null;

    if (year !== null && (!Number.isInteger(year) || year < 2000 || year > 2100)) {
      setError("Please specify a valid graduation batch year between 2000 and 2100.");
      return;
    }

    const toList = (value: string) =>
      [...new Set(value.split(",").map(item => item.trim()).filter(Boolean))];

    setSaving(true);

    try {
      await onSave({
        course: course.trim(),
        institution: institution.trim(),
        graduation_year: year,
        interests: toList(interests).slice(0, 20),
        skills: toList(skills).slice(0, 30),
        preferred_domains: toList(domains).slice(0, 15)
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save candidate profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="dashboard-page">
      <div className="profile-page-container">
        <button type="button" className="profile-back-button" onClick={onBack}>
          &larr; Return to Dashboard
        </button>

        <header className="profile-page-header">
          <div className="masthead-meta">
            <span className="masthead-tag">CANDIDATE DOSSIER AMENDMENT</span>
            <span className="masthead-date">SAVED TO LOCAL SQLITE REPOSITORY</span>
          </div>
          <h1 className="profile-title">Academic & Professional Profile</h1>
          <p className="profile-subtext">
            Update your degree, target batch, and technical skills. CareerPath AI references these parameters to customize career roadmaps, exam targets, and CTC salary ranges.
          </p>
        </header>

        <form className="profile-editor-card" onSubmit={handleSubmit}>
          {/* Section 1 */}
          <div className="profile-section-heading">
            <span className="section-index-pill">01</span>
            <div>
              <h3>Institutional Affiliation & Enrollment</h3>
              <p>Your verified degree program and academic schedule</p>
            </div>
          </div>

          <div className="profile-form-grid">
            <label className="profile-field">
              <span className="field-label">Candidate Name</span>
              <input value={student.name} disabled className="input-disabled" />
              <span className="field-hint">Fixed to registered account identity</span>
            </label>

            <label className="profile-field">
              <span className="field-label">Account Email</span>
              <input value={student.email} disabled className="input-disabled" />
              <span className="field-hint">Primary verification identifier</span>
            </label>

            <label className="profile-field">
              <span className="field-label">Degree & Branch</span>
              <input
                value={course}
                onChange={e => setCourse(e.target.value)}
                placeholder="e.g. BCA, B.Tech Computer Science, B.Sc"
                maxLength={100}
                className="profile-input"
              />
              <span className="field-hint">Used for degree-specific career eligibility mapping</span>
            </label>

            <label className="profile-field">
              <span className="field-label">College / University</span>
              <input
                value={institution}
                onChange={e => setInstitution(e.target.value)}
                placeholder="e.g. East Point College of Higher Education, Bengaluru"
                maxLength={150}
                className="profile-input"
              />
              <span className="field-hint">Enables tier-appropriate campus & off-campus counsel</span>
            </label>

            <label className="profile-field">
              <span className="field-label">Graduation Batch</span>
              <input
                type="number"
                min="2000"
                max="2100"
                value={graduationYear}
                onChange={e => setGraduationYear(e.target.value)}
                placeholder="e.g. 2026"
                className="profile-input"
              />
              <span className="field-hint">Determines remaining preparation runway</span>
            </label>
          </div>

          {/* Section 2 */}
          <div className="profile-section-heading">
            <span className="section-index-pill">02</span>
            <div>
              <h3>Skill Inventory & Career Ambitions</h3>
              <p>Comma-separated list of capabilities, interests, and target roles</p>
            </div>
          </div>

          <div className="profile-form-grid full-width-stack">
            <label className="profile-field">
              <span className="field-label">Technical & Foundational Skills</span>
              <textarea
                value={skills}
                onChange={e => setSkills(e.target.value)}
                placeholder="e.g. Python, SQL, React, Data Structures, Git, REST APIs"
                rows={3}
                className="profile-textarea"
              />
              <span className="field-hint">Separate items with commas</span>
            </label>

            <label className="profile-field">
              <span className="field-label">Academic & Industry Interests</span>
              <textarea
                value={interests}
                onChange={e => setInterests(e.target.value)}
                placeholder="e.g. Machine Learning, Cloud Systems, Financial Analysis, Competitive Programming"
                rows={3}
                className="profile-textarea"
              />
              <span className="field-hint">Domains where you wish to focus your projects</span>
            </label>

            <label className="profile-field">
              <span className="field-label">Target Trajectories & Exams</span>
              <textarea
                value={domains}
                onChange={e => setDomains(e.target.value)}
                placeholder="e.g. Product Engineering, NIMCET 2026, Data Science, Central PSU Roles"
                rows={3}
                className="profile-textarea"
              />
              <span className="field-hint">Aspirations that guide AI roadmap recommendations</span>
            </label>
          </div>

          {error && <div className="profile-error-box">{error}</div>}

          <div className="profile-actions-bar">
            <button
              type="submit"
              className="profile-save-button"
              disabled={saving}
            >
              {saving ? "Updating Dossier..." : "Save Profile Details →"}
            </button>
            <span className="profile-note">
              Modifications immediately update your personalized LLM context prompt.
            </span>
          </div>
        </form>
      </div>
    </section>
  );
}
