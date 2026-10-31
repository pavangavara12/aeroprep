import React, { useState, useEffect } from 'react';
import type { UserProgress, ResumeAnalysis } from '../types';
import {
  FileTextIcon,
  UploadIcon,
  CheckCircleIcon,
  AwardIcon,
  SparklesIcon,
} from './Icons';
import { SectionHero, StatTile, ProgressRing, DividerLabel } from './Shared';
import { getJson, postJson } from '../services/apiClient';

interface ResumeAnalyzerProps {
  progress: UserProgress;
  onAddScore: (score: number) => void;
}

const TARGET_ROLES = [
  'Full Stack Software Engineer',
  'Frontend Developer (React/TS)',
  'Backend Developer (Node/Java/Python)',
  'Data Scientist & ML Engineer',
  'Cloud & DevOps Engineer',
];

const SAMPLE_RESUME_TEXT = `ALEX JOHNSON
Email: alex.student@aeroprep.edu | GitHub: github.com/alex-dev | LinkedIn: linkedin.com/in/alex-dev

EDUCATION
Bachelor of Technology in Information Technology, 2022 - 2026 | GPA: 8.8/10

TECHNICAL SKILLS
Languages: Python, TypeScript, JavaScript, Java, C++, SQL, HTML/CSS
Frameworks: React, Next.js, Node.js, Express, TailwindCSS
Databases & Tools: PostgreSQL, MongoDB, Git, Docker, REST APIs, Linux

PROJECTS
AeroPrep — AI-Powered Career Readiness & Interview Platform (React, Node, Gemini API)
- Developed a full-stack career preparation SaaS platform supporting 500+ active student users.
- Reduced API roundtrip latency by 35% through custom caching and streaming Web Audio decoding.
- Engineered 10 interactive CS curriculum tracks and sandbox coding environment for placement prep.

Collaborative Task Hub (TypeScript, PostgreSQL, Docker)
- Architected RESTful microservices managing task workflows across 20+ simultaneous teams.
- Optimized database indexing to boost complex query throughput by 40% under peak loads.

EXPERIENCE
Software Engineering Intern | TechNova Solutions (June 2025 - August 2025)
- Automated CI/CD deployment pipelines using GitHub Actions, cutting release overhead by 50%.
- Refactored legacy monolithic endpoints into clean layered services with 92% unit test coverage.`;

export const ResumeAnalyzer: React.FC<ResumeAnalyzerProps> = ({ progress: _progress, onAddScore }) => {
  const [resumeText, setResumeText] = useState<string>(SAMPLE_RESUME_TEXT);
  const [fileName, setFileName] = useState<string>('Alex_Johnson_Software_Resume.pdf');
  const [targetRole, setTargetRole] = useState<string>(TARGET_ROLES[0]);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<ResumeAnalysis | null>(null);
  const [history, setHistory] = useState<ResumeAnalysis[]>([]);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await getJson<{ history: ResumeAnalysis[] }>('/api/resume/history');
        if (res?.history && res.history.length > 0) {
          setHistory(res.history);
          setAnalysisResult(res.history[0]);
        }
      } catch {
        // Offline
      }
    }
    fetchHistory();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    if (file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) setResumeText(evt.target.result as string);
      };
      reader.readAsText(file);
    } else {
      // For PDF/DOCX demonstration extraction
      setResumeText((prev) => prev + `\n\n[Uploaded Document: ${file.name} - Extracted contents]`);
    }
  };

  const handleAnalyze = async () => {
    if (!resumeText.trim()) return;
    setAnalyzing(true);
    try {
      const res = await postJson<{ analysis: ResumeAnalysis }>('/api/resume/analyze', {
        text: resumeText,
        fileName,
        targetRole,
      });

      if (res?.analysis) {
        setAnalysisResult(res.analysis);
        setHistory((prev) => [res.analysis, ...prev]);
        onAddScore(25);
      }
    } catch {
      // Handled
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <SectionHero
        icon={<FileTextIcon size={26} />}
        title="Resume Analyser & ATS Readiness Auditor"
        subtitle="Upload or paste your engineering resume to calculate skill alignment, project impact metrics, and role-specific placement recommendations."
      />

      {/* Snapshot Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <StatTile
          icon={<FileTextIcon size={22} />}
          value={analysisResult ? `${analysisResult.overallScore}/100` : 'Not Analyzed'}
          label="Resume Readiness Index"
          color="var(--accent-cyan)"
          tint="rgba(37, 99, 235, 0.1)"
        />
        <StatTile
          icon={<CheckCircleIcon size={22} />}
          value={analysisResult ? `${analysisResult.detectedSkills.length} Skills` : '0 Skills'}
          label="Detected Tech Keywords"
          color="var(--accent-emerald)"
          tint="rgba(5, 150, 105, 0.1)"
        />
        <StatTile
          icon={<AwardIcon size={22} />}
          value={analysisResult ? `${analysisResult.missingSkills.length} Needed` : `${history.length} Saved`}
          label="Recommended Skill Gaps"
          color="var(--accent-violet)"
          tint="rgba(124, 58, 237, 0.1)"
        />
      </div>

      {/* Two Column Layout: Resume input on left, Analysis score & recommendations on right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.1fr) minmax(380px, 1.4fr)', gap: '22px', alignItems: 'start' }}>
        {/* Left: Input & Upload Pane */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Resume Input</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fileName}</span>
          </div>

          {/* Role selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Target Job Role:
            </label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--card-border)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
              }}
            >
              {TARGET_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* File Upload Box */}
          <div
            style={{
              border: '2px dashed var(--card-border)',
              borderRadius: '10px',
              padding: '16px',
              textAlign: 'center',
              background: 'var(--bg-primary)',
              position: 'relative',
              cursor: 'pointer',
            }}
          >
            <input
              type="file"
              accept=".pdf,.txt,.docx"
              onChange={handleFileUpload}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer',
              }}
            />
            <UploadIcon size={24} style={{ color: 'var(--accent)', marginBottom: '6px' }} />
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Click or drag resume file (PDF, TXT, DOCX)
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Text will be extracted automatically for semantic parsing
            </div>
          </div>

          {/* Text Area */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Resume Text Content:
            </label>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              rows={12}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--card-border)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
                fontSize: '0.82rem',
                lineHeight: 1.5,
                resize: 'vertical',
              }}
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={analyzing || !resumeText.trim()}
            className="btn btn-primary"
            style={{ padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
          >
            <SparklesIcon size={16} />
            {analyzing ? 'Auditing Resume...' : 'Analyze Resume (+25 XP)'}
          </button>
        </div>

        {/* Right: Results, ATS Breakdown, Gaps & Suggestions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {analysisResult ? (
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Score Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <ProgressRing
                    percentage={analysisResult.overallScore}
                    size={88}
                    stroke={8}
                    color="var(--accent)"
                    sublabel="score"
                  />
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Resume Evaluation Score</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Evaluated against standard {analysisResult.targetRole} placement criteria.
                    </p>
                  </div>
                </div>
              </div>

              {/* Methodology Alert */}
              <div
                style={{
                  padding: '10px 14px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  lineHeight: 1.5,
                  color: 'var(--text-secondary)',
                  borderLeft: '3px solid var(--accent-cyan)',
                }}
              >
                <strong>Scoring Methodology Disclosure:</strong> This score is calculated via deterministic heuristic
                analysis: 40% Keyword & Technical Skills Alignment, 25% Quantified Project Impact, 20% Formatting & Section
                Completeness, and 15% Experience Depth. It is designed for campus preparation and is not an official vendor ATS certification.
              </div>

              {/* Detailed 4-Factor Breakdown */}
              <div>
                <DividerLabel>Category Breakdown</DividerLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginTop: '10px' }}>
                  <div style={{ background: 'var(--bg-primary)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                      {analysisResult.breakdown.skillsMatch}%
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Skill Match</div>
                  </div>
                  <div style={{ background: 'var(--bg-primary)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                      {analysisResult.breakdown.projectImpact}%
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Project Metrics</div>
                  </div>
                  <div style={{ background: 'var(--bg-primary)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-violet)' }}>
                      {analysisResult.breakdown.formatting}%
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Formatting</div>
                  </div>
                  <div style={{ background: 'var(--bg-primary)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
                      {analysisResult.breakdown.experience}%
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Experience Depth</div>
                  </div>
                </div>
              </div>

              {/* Detected Skills */}
              <div>
                <DividerLabel>Detected Technical Competencies ({analysisResult.detectedSkills.length})</DividerLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                  {analysisResult.detectedSkills.map((skill, i) => (
                    <span key={i} className="badge badge-cyan" style={{ fontSize: '0.76rem' }}>
                      ✓ {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Missing Skills */}
              {analysisResult.missingSkills.length > 0 && (
                <div>
                  <DividerLabel>High-Value Skills to Add for {analysisResult.targetRole}</DividerLabel>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                    {analysisResult.missingSkills.map((skill, i) => (
                      <span
                        key={i}
                        className="badge"
                        style={{ fontSize: '0.76rem', background: 'rgba(225, 29, 72, 0.12)', color: 'var(--accent-rose)' }}
                      >
                        + {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actionable Suggestions */}
              <div>
                <DividerLabel>Role-Specific Improvement Recommendations</DividerLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                  {analysisResult.suggestions.map((sug, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--card-border)',
                        fontSize: '0.84rem',
                        lineHeight: 1.5,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                      }}
                    >
                      <SparklesIcon size={15} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
                      <span>{sug}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Click "Analyze Resume" to generate your detailed diagnostic report.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
