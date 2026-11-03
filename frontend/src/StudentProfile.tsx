
import { useState } from "react";

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
    <section className="dashboard-page profile-editor-page">
      <button className="profile-back-btn" onClick={onBack}>
        ← Back to Dashboard
      </button>

      <div className="profile-editor-heading">
        <span className="dashboard-eyebrow">YOUR PERSONAL SPACE</span>
        <h1>My Student Profile</h1>
        <p>Tell Future Forge about your education, interests and skills.</p>
      </div>

      <form className="profile-editor-card" onSubmit={handleSubmit}>
        <div className="profile-section-heading">
          <span>👤</span>
          <div>
            <h2>Basic Information</h2>
            <p>Your registered account details</p>
          </div>
        </div>

        <div className="profile-form-grid">
          <label>
            Full Name
            <input value={student.name} disabled />
          </label>

          <label>
            Email Address
            <input value={student.email} disabled />
          </label>

          <label>
            Course
            <input
              value={course}
              onChange={e => setCourse(e.target.value)}
              placeholder="e.g. BCA"
              maxLength={100}
            />
          </label>

          <label>
            College / Institution
            <input
              value={institution}
              onChange={e => setInstitution(e.target.value)}
              placeholder="Enter your college name"
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
              placeholder="e.g. 2027"
            />
          </label>
        </div>

        <div className="profile-section-heading">
          <span>✨</span>
          <div>
            <h2>Interests & Skills</h2>
            <p>Separate each entry with a comma</p>
          </div>
        </div>

        <div className="profile-form-grid">
          <label className="profile-full-width">
            Your Interests
            <textarea
              value={interests}
              onChange={e => setInterests(e.target.value)}
              placeholder="e.g. Artificial Intelligence, Designing, Data Science"
              rows={3}
            />
          </label>

          <label className="profile-full-width">
            Your Skills
            <textarea
              value={skills}
              onChange={e => setSkills(e.target.value)}
              placeholder="e.g. Python, HTML, Communication, Excel"
              rows={3}
            />
          </label>

          <label className="profile-full-width">
            Preferred Career Domains
            <textarea
              value={domains}
              onChange={e => setDomains(e.target.value)}
              placeholder="e.g. AI and ML, Government Jobs, Web Development"
              rows={3}
            />
          </label>
        </div>

        {error && <p className="profile-error">{error}</p>}

        <div className="profile-form-actions">
          <button
            type="button"
            className="profile-cancel-btn"
            onClick={onBack}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="dashboard-primary-btn"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save My Profile →"}
          </button>
        </div>
      </form>
    </section>
  );
}
