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

  const features = [
    {
      icon: "🧭",
      title: "Career Explorer",
      description: "Discover career paths that match your degree, skills, and interests in India.",
      prompt: "Help me explore career options based on my education and interests."
    },
    {
      icon: "✨",
      title: "AI Recommendations",
      description: "Get personalized suggestions and CTC salary benchmarks for your profile.",
      prompt: "Recommend suitable career paths for me in India and explain why they may fit."
    },
    {
      icon: "📚",
      title: "Learning Roadmap",
      description: "Step-by-step guidance on skills, projects, and certifications needed.",
      prompt: "Create a step-by-step learning roadmap to help me prepare for my future career."
    },
    {
      icon: "🎯",
      title: "Exam Preparation",
      description: "Explore competitive entrance exams (NIMCET, GATE, CAT, SSC CGL) and roadmaps.",
      prompt: "Help me explore competitive exams in India and create a preparation roadmap."
    }
  ];

  return (
    <section className="dashboard-page">
      <div className="dashboard-container">
        <div className="dashboard-welcome">
          <div>
            <div className="hero-pill">
              <span>✦</span>
              <span>STUDENT DASHBOARD</span>
            </div>
            <h1 className="dashboard-welcome-heading">
              Welcome back, <span className="student-name-highlight">{firstName}</span>.
              <br />
              <em>Find your direction.</em>
            </h1>
            <p className="dashboard-subtitle">
              Your personalized career headquarters. Select a pathway below or talk directly to your AI counselor.
            </p>
          </div>
        </div>

        <div className="dashboard-profile-card">
          <div className="profile-card-left">
            <div className="profile-icon-badge" aria-hidden="true">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c0 2 4 3 6 3s6-1 6-3v-5" />
              </svg>
            </div>
            <div className="profile-card-details">
              <span className="profile-badge-label">REGISTERED STUDENT PROFILE</span>
              <h2>{student.name}</h2>
              <p className="profile-meta-text">
                {student.course ? <strong>{student.course}</strong> : "Course not set"}
                {student.institution ? ` · ${student.institution}` : ""}
                {student.graduation_year ? ` · Class of ${student.graduation_year}` : ""}
              </p>
              <p className="profile-email-text">{student.email}</p>

              {student.skills && student.skills.length > 0 && (
                <div className="profile-tags-row">
                  {student.skills.slice(0, 5).map((skill, idx) => (
                    <span key={idx} className="profile-skill-pill">
                      {skill}
                    </span>
                  ))}
                  {student.skills.length > 5 && (
                    <span className="profile-skill-more">+{student.skills.length - 5} more</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="profile-card-right">
            <span className="account-status-pill">Active</span>
            <button className="profile-edit-button" onClick={onEditProfile}>
              Edit Profile
            </button>
          </div>
        </div>

        <div className="dashboard-section-header">
          <div>
            <span className="section-eyebrow">EXPLORE YOUR POSSIBILITIES</span>
            <h2>Curated Career Pathways</h2>
            <p>Select a pathway to start a tailored counseling session with verified benchmarks.</p>
          </div>
        </div>

        <div className="pathway-grid">
          {features.map((feature) => (
            <button
              className="pathway-card"
              key={feature.title}
              onClick={() => onOpenChat(feature.prompt)}
            >
              <span className="pathway-icon">{feature.icon}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <span className="card-action">Explore track &rarr;</span>
            </button>
          ))}
        </div>

        <div className="dashboard-editorial-grid">
          <div className="editorial-card callout-card">
            <span className="card-kicker">✦ IMMEDIATE NEXT STEP</span>
            <h3>Start with an open conversation</h3>
            <p>
              Share your target roles, doubts, or competitive exam ambitions. Your AI counselor uses verified Indian data to outline actionable next steps.
            </p>
            <button
              className="action-button-primary"
              onClick={() =>
                onOpenChat(
                  "Help me understand my strengths and explore suitable career options after my degree in India."
                )
              }
            >
              Talk to AI Counselor &rarr;
            </button>
          </div>

          <div className="editorial-card reminder-card">
            <span className="card-kicker">💡 COUNSELOR ADVICE</span>
            <h3>Your journey, your timeline</h3>
            <p>
              Great careers are built systematically over quarters, not overnight. Focus on practical projects, core fundamentals, and verified eligibility requirements.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
