
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
      description: "Discover career paths that match your education and interests.",
      prompt: "Help me explore career options based on my education and interests."
    },
    {
      icon: "✨",
      title: "AI Career Recommendations",
      description: "Get personalized suggestions for your future career.",
      prompt: "Recommend suitable career paths for me in India and explain why they may fit."
    },
    {
      icon: "📚",
      title: "Learning Roadmap",
      description: "Find the skills, courses and steps needed to reach your goal.",
      prompt: "Create a step-by-step learning roadmap to help me prepare for my future career."
    },
    {
      icon: "🎯",
      title: "Exam Preparation",
      description: "Explore competitive exams, eligibility and preparation plans.",
      prompt: "Help me explore competitive exams in India and create a preparation roadmap."
    }
  ];

  return (
    <section className="dashboard-page">

      <div className="dashboard-welcome">
        <div>
          <span className="dashboard-eyebrow">STUDENT DASHBOARD</span>
          <h1>Welcome back, {firstName}! <span>✦</span></h1>
          <p>Your future is full of possibilities. Let's find your direction.</p>
        </div>

        <div className="dashboard-avatar">
          {student.name.charAt(0).toUpperCase()}
        </div>
      </div>

      <div className="dashboard-profile">
        <div className="dashboard-profile-icon">🎓</div>

        <div className="dashboard-profile-info">
          <span className="dashboard-card-label">YOUR STUDENT PROFILE</span>
          <h2>{student.name}</h2>
          <p>{student.email}</p>

          <p>
            {student.course || "Course not added"}
            {student.institution ? ` · ${student.institution}` : ""}
            {student.graduation_year
              ? ` · Class of ${student.graduation_year}`
              : ""}
          </p>
        </div>

        <div className="dashboard-profile-actions">
          <span className="dashboard-profile-status">Account active</span>

          <button
            className="profile-edit-btn"
            onClick={onEditProfile}
          >
            ✎ Edit Profile
          </button>
        </div>
      </div>

      <div className="dashboard-section-heading">
        <div>
          <span className="dashboard-eyebrow">EXPLORE YOUR POSSIBILITIES</span>
          <h2>Your Career Journey</h2>
          <p>Choose where you would like to begin.</p>
        </div>
      </div>

      <div className="dashboard-feature-grid">
        {features.map((feature) => (
          <button
            className="dashboard-feature-card"
            key={feature.title}
            onClick={() => onOpenChat(feature.prompt)}
          >
            <span className="dashboard-feature-icon">{feature.icon}</span>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
            <span className="dashboard-card-action">
              Explore <span>→</span>
            </span>
          </button>
        ))}
      </div>

      <div className="dashboard-bottom-grid">

        <div className="dashboard-journey-card">
          <span className="dashboard-eyebrow">YOUR NEXT STEP</span>
          <h2>Start with a conversation.</h2>

          <p>
            Tell Future Forge about your goals, interests and education.
            Your AI career assistant can help you plan what comes next.
          </p>

          <button
            className="dashboard-primary-btn"
            onClick={() =>
              onOpenChat(
                "Help me understand my strengths and explore suitable career options."
              )
            }
          >
            Talk to AI Assistant <span>→</span>
          </button>
        </div>

        <div className="dashboard-tip-card">
          <span className="dashboard-tip-icon">💡</span>
          <span className="dashboard-eyebrow">A LITTLE REMINDER</span>
          <h3>Your journey, your pace.</h3>

          <p>
            You don't need to have everything figured out today.
            Explore, learn and take one step at a time.
          </p>
        </div>

      </div>
    </section>
  );
}
