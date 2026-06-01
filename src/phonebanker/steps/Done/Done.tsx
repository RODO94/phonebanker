import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { usePhonebankerStore } from '../../phonebankerStore';
import { apiFetch } from '@/shared/api/apiFetch';
import { Button } from '@/shared/Button/Button';
import { SessionStateResponseSchema } from '@/session/sessionStateSchema';
import './Done.css';

const BRAND_COLORS = ['#F53754', '#1E9F50', '#FFFFFF', '#0B0C0C'];

function fireConfetti() {
  const shared = { colors: BRAND_COLORS, ticks: 200 };
  confetti({ ...shared, particleCount: 90, angle: 60, spread: 60, origin: { x: 0, y: 0.65 } });
  confetti({ ...shared, particleCount: 90, angle: 120, spread: 60, origin: { x: 1, y: 0.65 } });
  setTimeout(() => {
    confetti({ ...shared, particleCount: 40, spread: 80, origin: { x: 0.5, y: 0.4 } });
  }, 300);
}

function AnimatedNumber({ value }: { value: number }) {
  const raw = useMotionValue(0);
  const spring = useSpring(raw, { stiffness: 55, damping: 18 });
  const display = useTransform(spring, (v) => String(Math.round(v)));

  useEffect(() => {
    raw.set(value);
  }, [value, raw]);

  return <motion.span>{display}</motion.span>;
}

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};

const slideUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 22 } },
};

const pop = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring' as const, stiffness: 320, damping: 18 } },
};

export function Done() {
  const sessionId = usePhonebankerStore((s) => s.sessionId);
  const participantId = usePhonebankerStore((s) => s.participantId);
  const displayName = usePhonebankerStore((s) => s.displayName);
  const total = usePhonebankerStore((s) => s.total);
  const called = usePhonebankerStore((s) => s.called);
  const setProgress = usePhonebankerStore((s) => s.setProgress);
  const reset = usePhonebankerStore((s) => s.reset);

  // The transitions into this screen log the final outcome but don't refresh
  // progress — only the 10s AssignedContact poll does, so `called` arrives here
  // stale (excluding the contact that triggered the transition). Re-fetch once
  // on mount so the burn-down reflects the server's actual state.
  useEffect(() => {
    let cancelled = false;
    apiFetch(`/sessions/${sessionId}/state`, SessionStateResponseSchema, {
      headers: { 'X-Participant-Id': participantId ?? '' },
    })
      .then((state) => {
        if (!cancelled) setProgress(state.progress.total, state.progress.called);
      })
      .catch(() => {
        // Stale figures are tolerable on a terminal screen — leave them as-is.
      });
    return () => { cancelled = true; };
  }, [sessionId, participantId, setProgress]);

  useEffect(() => {
    fireConfetti();
  }, []);

  return (
    <motion.div
      className="done"
      variants={container}
      initial="hidden"
      animate="visible"
    >
      <motion.header className="done-header" variants={slideUp}>
        <motion.h2 className="done-title" variants={pop}>
          That&rsquo;s the whole list.
        </motion.h2>
        <motion.p className="done-subtitle" variants={slideUp}>
          Thank you, {displayName ?? 'volunteer'}.
        </motion.p>
      </motion.header>

      <motion.dl className="done-stats" variants={slideUp}>
        <div className="done-stat">
          <dt className="done-stat-label">Calls made</dt>
          <dd className="done-stat-value">
            <AnimatedNumber value={called} />
          </dd>
        </div>
        <div className="done-stat">
          <dt className="done-stat-label">Remaining</dt>
          <dd className="done-stat-value">
            <AnimatedNumber value={total - called} />
          </dd>
        </div>
      </motion.dl>

      <motion.div className="done-actions" variants={slideUp}>
        <Button variant="primary" fullWidth onClick={reset}>
          Done
        </Button>
      </motion.div>

      <motion.p className="done-handoff" variants={slideUp}>
        Stay on the Zoom for the debrief.
      </motion.p>
    </motion.div>
  );
}
