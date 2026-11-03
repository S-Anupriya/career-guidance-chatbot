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

  // Sync form state if student profile updates
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

    const year = graduationYear.trim()
      ? Number(graduationYear)
      : null;

    if (year !== null && (!Number.isInteger(year) || year < 2000 || year > 2100)) {
      setError("Please enter a valid graduation year between 2000 and 2100.");
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
      setError(err instanceof Error ? err.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="dashboard-page">
      <div className="profile-page-container">
        <button className="profile-back-button" onClick={onBack}>
          &larr; Back to Dashboard
        </button>

        <div className="profile-page-header">
          <div className="hero-pill">
            <span>✦</span>
            <span>ACADEMIC PROFILE</span>
          </div>
          <h1>My Student Profile</h1>
          <p className="dashboard-subtitle">
            Keep your degree, timeline, and current skills updated so CareerPath AI tailors all guidance to your stage.
          </p>
        </div>

        <form className="profile-editor-card" onSubmit={handleSubmit}>
          <div className="profile-section-heading">
            <span className="section-badge-icon">👤</span>
            <div>
              <h3>Basic Academic Information</h3>
              <p>Your registered profile details and college enrollment</p>
            </div>
          </div>

          <div className="profile-form-grid">
            <label>
              Full Name
              <input value={student.name} disabled className="input-disabled" />
            </label>

            <label>
              Email Address
              <input value={student.email} disabled className="input-disabled" />
            </label>

            <label>
              Course / Degree
              <input
                value={course}
                onChange={e => setCourse(e.target.value)}
                placeholder="e.g. BCA, B.Tech CSE, B.Com"
                maxLength={100}
              />
            </label>

            <label>
              College / Institution
              <input
                value={institution}
                onChange={e => setInstitution(e.target.value)}
                placeholder="e.g. East Point College of Higher Education"
                maxLength={150}
              />
            </label>

            <label>
              Graduation Year
              <input
                type="number"
                min="2000"
                max="2100"
                value={graduationYear}
                onChange={e => setGraduationYear(e.target.value)}
                placeholder="e.g. 2026"
              />
            </label>
          </div>

          <div className="profile-section-heading">
            <span className="section-badge-icon">✨</span>
            <div>
              <h3>Skills, Interests & Target Domains</h3>
              <p>Separate items with commas (e.g., Python, SQL, Cloud Computing)</p>
            </div>
          </div>

          <div className="profile-form-grid full-width-stack">
            <label>
              Your Technical & Soft Skills
              <textarea
                value={skills}
                onChange={e => setSkills(e.target.value)}
                placeholder="e.g. Python, SQL, Data Structures, Git, Problem Solving"
                rows={3}
              />
            </label>

            <label>
              Your Academic & Professional Interests
              <textarea
                value={interests}
                onChange={e => setInterests(e.target.value)}
                placeholder="e.g. Machine Learning, Cloud Architecture, Financial Modeling"
                rows={3}
              />
            </label>

            <label>
              Preferred Career Domains
              <textarea
                value={domains}
                onChange={e => setDomains(e.target.value)}
                placeholder="e.g. AI/ML Engineering, Product Management, NIT MCA, PSU / Govt"
                rows={3}
              />
            </label>
          </div>

          {error && <div className="auth-message error">{error}</div>}

          <div className="profile-actions-bar">
            <button
              type="button"
              className="action-button-secondary"
              onClick={onBack}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="action-button-primary"
              disabled={saving}
            >
              {saving ? "Saving Changes..." : "Save My Profile \u2192"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
