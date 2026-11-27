/**
 * Computes live coach-score and wave analytics from a school's session records
 * for Milestone Story Poster previews (no hardcoded dummy scores).
 */
export function computePosterCoachAnalytics(sessionsList) {
  const list = Array.isArray(sessionsList) ? sessionsList : [];
  const scores = [];
  const waves = [];
  const popUps = [];
  let latestRated = null;
  let latestCompleted = null;

  const normalizeOutOfTen = (val) => {
    const num = Number(val);
    if (isNaN(num) || num <= 0) return null;
    const outOf10 = num > 10 ? num / 10 : num;
    const clamped = Math.min(10, Math.max(1, outOf10));
    return Math.round(clamped * 10) / 10;
  };

  list.forEach((sess) => {
    if (!sess) return;
    const status = String(sess.status || '').toLowerCase().trim();
    if (status === 'cancelled' || status === 'rejected') return;

    const notes = String(sess.notes || '');
    let score = normalizeOutOfTen(sess.score || sess.technique_score || sess.coach_rating);
    if (score === null && notes) {
      const m = notes.match(/(?:Coach (?:Rating|Score)|Technique Score|Score):\s*(\d+(?:\.\d+)?)/i)
        || notes.match(/\[\s*(\d+(?:\.\d+)?)\s*(?:out of|\/)\s*100\s*\]/i)
        || notes.match(/(?:Rating|Points|Score|Grade)\s*[:=-]\s*(\d+(?:\.\d+)?)/i);
      if (m) score = normalizeOutOfTen(m[1]);
    }

    let waveCount = null;
    const directWaves = parseInt(sess.waves_caught ?? sess.wave_count, 10);
    if (!isNaN(directWaves) && directWaves >= 0) {
      waveCount = directWaves;
    } else if (notes) {
      const wm = notes.match(/Wave Count:\s*(\d+)/i) || notes.match(/(\d+)\s+waves?/i);
      if (wm) waveCount = parseInt(wm[1], 10);
    }

    let popUp = null;
    if (notes) {
      const pm = notes.match(/pop[- ]?up.*?\[?(\d+(?:\.\d+)?)\s*(?:out of|\/)\s*10/i);
      if (pm) popUp = normalizeOutOfTen(pm[1]);
    }

    if (score !== null) {
      scores.push(score);
      if (!latestRated) latestRated = { sess, score, waveCount, popUp };
    }
    if (waveCount !== null && !isNaN(waveCount)) waves.push(waveCount);
    if (popUp !== null) popUps.push(popUp);
    if (status === 'completed' && !latestCompleted) {
      latestCompleted = { sess, score, waveCount, popUp };
    }
  });

  const avgScore = scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : null;
  const avgWaves = waves.length > 0
    ? Math.round(waves.reduce((a, b) => a + b, 0) / waves.length)
    : null;
  const avgPopUp = popUps.length > 0
    ? Math.round((popUps.reduce((a, b) => a + b, 0) / popUps.length) * 10) / 10
    : avgScore;

  const ref = latestRated || latestCompleted;
  const refSess = ref?.sess || null;
  const mins = refSess?.duration_mins ? parseInt(refSess.duration_mins, 10) : null;
  const durationLabel = mins && !isNaN(mins)
    ? `${Math.round((mins / 60) * 10) / 10} Hours (${mins}m)`
    : '--';

  let dateLabel = '--';
  if (refSess?.date) {
    const parsed = new Date(`${refSess.date}T00:00:00`);
    dateLabel = !isNaN(parsed.getTime())
      ? parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : refSess.date;
  }

  let verdict = 'Coach feedback from completed sessions will reflect here.';
  if (refSess?.notes) {
    const wellMatch = String(refSess.notes).match(/What You did Well:\s*\n?\s*-?\s*([^\n]+)/i);
    if (wellMatch && wellMatch[1].trim()) {
      verdict = wellMatch[1].trim();
    }
  }
  if (verdict === 'Coach feedback from completed sessions will reflect here.' && avgScore !== null) {
    verdict = avgScore >= 8
      ? `Strong ocean technique (${avgScore}/10 avg across ${scores.length} rated session${scores.length > 1 ? 's' : ''}).`
      : `Consistent progress (${avgScore}/10 avg across ${scores.length} rated session${scores.length > 1 ? 's' : ''}).`;
  }

  const rawCoach = refSess?.instructor || refSess?.instructor_name || '';
  const coachName = rawCoach
    ? (rawCoach.toLowerCase().startsWith('coach') ? rawCoach : `Coach ${rawCoach}`)
    : 'Coach';

  return {
    avgScore,
    avgWaves,
    avgPopUp,
    ratedCount: scores.length,
    durationLabel,
    studentName: refSess?.student || refSess?.student_name || 'Athlete Preview',
    level: refSess?.level || refSess?.type || 'Surfer',
    dateLabel,
    coachName,
    coachInitial: (coachName.replace(/^coach\s+/i, '').trim().charAt(0) || 'C').toUpperCase(),
    location: refSess?.location || 'Surf Beach',
    verdict,
  };
}
