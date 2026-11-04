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

type Props = {
  student: Student;
  onOpenChat: (prompt: string) => void;
  onEditProfile: () => void;
};

export function StudentDashboard({
  student,
  onOpenChat,
  onEditProfile
}: Props) {
  const firstName = student.name.trim().split(/\s+/)[0];
  const courseDisplay = student.course || "Undergraduate";
  const institutionDisplay = student.institution || "College / Institution not set";
  const yearDisplay = student.graduation_year ? `Batch of ${student.graduation_year}` : "Graduation year unset";

  return (
    <section className="dashboard-page">
      <div className="dashboard-container">
        {/* Editorial Masthead */}
        <header className="dashboard-masthead">
          <div className="masthead-meta">
            <span className="masthead-tag">PAN-INDIA CAREER INTELLIGENCE · ACADEMIC SESSION 2025–26</span>
            <span className="masthead-date">GROUNDED BENCHMARKS & VERIFIED ROADMAPS</span>
          </div>

          <div className="masthead-hero">
            <h1 className="masthead-title">
              Advisory Dossier for <span className="student-name-editorial">{firstName}</span>
            </h1>
            <p className="masthead-lead">
              Personalized career trajectories, fresher CTC indices, and competitive exam roadmaps calibrated for students in India.
            </p>
          </div>
        </header>

        {/* Collegiate Student Docket Card */}
        <div className="student-docket">
          <div className="docket-header">
            <div className="docket-seal" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="docket-id-block">
              <span className="docket-eyebrow">VERIFIED CANDIDATE RECORD</span>
              <span className="docket-name">{student.name}</span>
            </div>
            <div className="docket-actions">
              <span className="docket-status-tag">Active Dossier</span>
              <button type="button" className="docket-edit-btn" onClick={onEditProfile}>
                Update Profile
              </button>
            </div>
          </div>

          <div className="docket-grid">
            <div className="docket-col">
              <span className="docket-label">Course & Specialization</span>
              <span className="docket-val docket-highlight">{courseDisplay}</span>
            </div>
            <div className="docket-col">
              <span className="docket-label">Institution</span>
              <span className="docket-val">{institutionDisplay}</span>
            </div>
            <div className="docket-col">
              <span className="docket-label">Academic Milestone</span>
              <span className="docket-val">{yearDisplay}</span>
            </div>
            <div className="docket-col">
              <span className="docket-label">Registered Contact</span>
              <span className="docket-val docket-mono">{student.email}</span>
            </div>
          </div>

          {student.skills && student.skills.length > 0 && (
            <div className="docket-skills-row">
              <span className="docket-label-inline">Recorded Skills:</span>
              <div className="docket-pills">
                {student.skills.slice(0, 7).map((skill, i) => (
                  <span key={i} className="docket-skill-tag">
                    {skill}
                  </span>
                ))}
                {student.skills.length > 7 && (
                  <span className="docket-skill-more">+{student.skills.length - 7} more</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section Title */}
        <div className="bento-section-header">
          <div className="header-left">
            <span className="section-chapter">MODULE A</span>
            <h2 className="section-title">Strategic Pathways & Benchmarks</h2>
          </div>
          <p className="header-desc">
            Direct access to localized career models, current compensation levels, and exam curricula.
          </p>
        </div>

        {/* Asymmetrical Bento Grid */}
        <div className="editorial-bento">
          {/* Tile 1: Primary Career Explorer (Span 2 / Featured) */}
          <article className="bento-card bento-featured" onClick={() => onOpenChat(`Help me explore career options and top trajectories suited for a ${courseDisplay} student in India.`)}>
            <div className="bento-card-top">
              <span className="bento-index">01 / TRAJECTORY</span>
              <span className="bento-badge">Degree Specialization</span>
            </div>
            <div className="bento-card-body">
              <h3 className="bento-heading">Degree-to-Industry Trajectory Matrix</h3>
              <p className="bento-summary">
                Map your current coursework directly to hiring verticals: Core Product Engineering, Data Analytics, Fintech, or Higher Technical Education.
              </p>

              <div className="bento-preview-list">
                <div className="preview-item">
                  <span className="preview-label">Software & Full-Stack</span>
                  <span className="preview-meta">Median: ₹5.5L – ₹14.0L CTC</span>
                </div>
                <div className="preview-item">
                  <span className="preview-label">Data Engineering & ML</span>
                  <span className="preview-meta">Median: ₹6.0L – ₹16.0L CTC</span>
                </div>
                <div className="preview-item">
                  <span className="preview-label">Advanced Degrees (MCA / M.Tech)</span>
                  <span className="preview-meta">NIMCET · GATE CS Pathway</span>
                </div>
              </div>
            </div>
            <div className="bento-card-footer">
              <span className="bento-action-link">Explore {courseDisplay} Pathways &rarr;</span>
            </div>
          </article>

          {/* Tile 2: Compensation Index (Span 1) */}
          <article className="bento-card bento-salary" onClick={() => onOpenChat("What are the realistic starting CTC salary benchmarks for freshers in India across Tier 1, 2, and 3 colleges in tech and core domains?")}>
            <div className="bento-card-top">
              <span className="bento-index">02 / BENCHMARK</span>
              <span className="bento-badge">Market Data 2025</span>
            </div>
            <div className="bento-card-body">
              <h3 className="bento-heading">Indian Fresher CTC Compensation Index</h3>
              <p className="bento-summary">
                Grounded compensation figures separating base pay, variable bonus, and ESOPs across Indian tech and corporate recruiters.
              </p>
              
              <div className="salary-metric-box">
                <div className="metric-row">
                  <span className="metric-name">Product Companies</span>
                  <span className="metric-val">₹12.0L – ₹28.0L</span>
                </div>
                <div className="metric-row">
                  <span className="metric-name">Growth Startups</span>
                  <span className="metric-val">₹6.5L – ₹14.0L</span>
                </div>
                <div className="metric-row">
                  <span className="metric-name">IT Services & Placements</span>
                  <span className="metric-val">₹3.8L – ₹7.2L</span>
                </div>
              </div>
            </div>
            <div className="bento-card-footer">
              <span className="bento-action-link">Query Salary Benchmarks &rarr;</span>
            </div>
          </article>

          {/* Tile 3: Competitive Exams (Span 1) */}
          <article className="bento-card bento-exams" onClick={() => onOpenChat("Give me a comprehensive preparation roadmap for competitive exams in India like NIMCET, GATE, CAT, and SSC CGL including eligibility and timelines.")}>
            <div className="bento-card-top">
              <span className="bento-index">03 / ADMISSIONS</span>
              <span className="bento-badge">National Level</span>
            </div>
            <div className="bento-card-body">
              <h3 className="bento-heading">Competitive Exam & Entrance Milestones</h3>
              <p className="bento-summary">
                Structured preparation blueprints for NIMCET (NIT MCA), GATE, CAT, and Central Government examinations.
              </p>
              <div className="exam-tags-row">
                <span className="exam-chip">NIMCET 2026</span>
                <span className="exam-chip">GATE CS</span>
                <span className="exam-chip">CAT / XAT</span>
                <span className="exam-chip">SSC CGL</span>
              </div>
            </div>
            <div className="bento-card-footer">
              <span className="bento-action-link">Open Exam Roadmaps &rarr;</span>
            </div>
          </article>

          {/* Tile 4: Skill Gap & Readiness (Span 2) */}
          <article className="bento-card bento-readiness" onClick={() => onOpenChat("What practical projects, certifications, and technical skills should I build over the next 6 months to be competitive in campus and off-campus placements in India?")}>
            <div className="bento-card-top">
              <span className="bento-index">04 / AUDIT</span>
              <span className="bento-badge">Portfolio Review</span>
            </div>
            <div className="bento-card-body">
              <h3 className="bento-heading">Skill Gap & Placement Readiness Review</h3>
              <p className="bento-summary">
                Analyze your current skill inventory against 2025 hiring expectations. Identify high-leverage technical projects and interview focus areas.
              </p>
              <div className="readiness-columns">
                <div className="readiness-col">
                  <span className="readiness-heading">Recommended Focus Areas</span>
                  <ul className="readiness-list">
                    <li>Data Structures & Algorithmic Problem Solving</li>
                    <li>End-to-End Applied Projects (APIs, Database Design)</li>
                    <li>Core CS Fundamentals (DBMS, OS, Computer Networks)</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="bento-card-footer">
              <span className="bento-action-link">Analyze My Skill Portfolio &rarr;</span>
            </div>
          </article>
        </div>

        {/* Editorial Advisory Note */}
        <section className="editorial-callout-panel">
          <div className="callout-content">
            <span className="callout-kicker">ADVISORY MEMORANDUM · CAREER ADVICE</span>
            <h3 className="callout-title">Building enduring career momentum as an Indian graduate</h3>
            <p className="callout-text">
              Placement seasons in India reward systematic compounding over last-minute preparation. 
              Rather than scattering effort across ten shallow tutorials, focus on building two substantial, production-quality projects, mastering foundational data structures, and verifying entrance exam eligibility early.
            </p>
          </div>
          <div className="callout-action-col">
            <button
              type="button"
              className="callout-action-btn"
              onClick={() => onOpenChat("I want personalized guidance on prioritizing my remaining semesters and setting up a realistic 12-month career plan.")}
            >
              Consult Career Counselor &rarr;
            </button>
            <span className="callout-note">Direct AI consultation backed by verified Indian datasets</span>
          </div>
        </section>
      </div>
    </section>
  );
}
