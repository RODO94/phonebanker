import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '@/shared/api/apiFetch';
import {
  MemberSearchResponseSchema,
  JoinResponseSchema,
  type MemberMatch,
} from '@/session/joinSchema';
import { SessionSchema } from '@/session/sessionSchema';
import { SessionStateResponseSchema } from '@/session/sessionStateSchema';
import { ClaimResultSchema } from '@/contact/contactSchema';
import { usePhonebankerStore } from '../../phonebankerStore';
import './Join.css';

type SearchState =
  | { kind: 'idle' }
  | { kind: 'debouncing' }
  | { kind: 'searching' }
  | { kind: 'results'; matches: MemberMatch[]; truncated: boolean }
  | { kind: 'empty'; isRealName: boolean }
  | { kind: 'error'; message: string };

type JoinState =
  | { kind: 'idle' }
  | { kind: 'joining' }
  | { kind: 'error'; message: string; memberId: string };

function looksLikeRealName(query: string): boolean {
  const trimmed = query.trim();
  return trimmed.includes(' ') || trimmed.length >= 6;
}

export function Join() {
  const sessionId = usePhonebankerStore((s) => s.sessionId);
  const setStep = usePhonebankerStore((s) => s.setStep);
  const setParticipant = usePhonebankerStore((s) => s.setParticipant);
  const setSession = usePhonebankerStore((s) => s.setSession);
  const setCurrentContact = usePhonebankerStore((s) => s.setCurrentContact);
  const setProgress = usePhonebankerStore((s) => s.setProgress);

  const [query, setQuery] = useState('');
  const [searchState, setSearchState] = useState<SearchState>({ kind: 'idle' });
  const [joinState, setJoinState] = useState<JoinState>({ kind: 'idle' });
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const doSearch = useCallback(
    async (q: string) => {
      setSearchState({ kind: 'searching' });
      try {
        const response = await apiFetch(
          `/sessions/${sessionId}/members/search`,
          MemberSearchResponseSchema,
          { method: 'POST', body: JSON.stringify({ query: q.trim() }) },
        );
        if (response.matches.length === 0) {
          setSearchState({ kind: 'empty', isRealName: looksLikeRealName(q) });
        } else {
          setSearchState({
            kind: 'results',
            matches: response.matches,
            truncated: response.truncated,
          });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Search failed';
        setSearchState({ kind: 'error', message });
      }
    },
    [sessionId],
  );

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (value.trim().length === 0) {
        setSearchState({ kind: 'idle' });
        return;
      }

      setSearchState({ kind: 'debouncing' });
      debounceRef.current = setTimeout(() => doSearch(value), 2000);
    },
    [doSearch],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleJoin = async (memberId: string) => {
    setJoinState({ kind: 'joining' });
    try {
      const joinResponse = await apiFetch(
        `/sessions/${sessionId}/join`,
        JoinResponseSchema,
        { method: 'POST', body: JSON.stringify({ memberId }) },
      );
      setParticipant({
        participantId: joinResponse.participantId,
        displayName: joinResponse.displayName,
      });

      const session = await apiFetch(`/sessions/${sessionId}`, SessionSchema);
      setSession(session);
      if (session.status !== 'active') {
        setStep('sessionEnded');
        return;
      }

      const state = await apiFetch(
        `/sessions/${sessionId}/state`,
        SessionStateResponseSchema,
        { headers: { 'X-Participant-Id': joinResponse.participantId } },
      );
      setProgress(state.progress.total, state.progress.called);

      switch (state.claim.kind) {
        case 'assigned': {
          setCurrentContact(state.claim.assignment.contact);
          setStep('assigned');
          break;
        }
        case 'idle': {
          const claimResult = await apiFetch(
            `/sessions/${sessionId}/next`,
            ClaimResultSchema,
            {
              method: 'POST',
              headers: { 'X-Participant-Id': joinResponse.participantId },
            },
          );
          if (claimResult.kind === 'claimed') {
            setCurrentContact(claimResult.contact);
            setStep('assigned');
          } else {
            setStep('done');
          }
          break;
        }
        case 'exhausted': {
          setStep('done');
          break;
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to join';
      setJoinState({ kind: 'error', message, memberId });
    }
  };

  const retrySearch = () => {
    if (query.trim().length > 0) {
      doSearch(query);
    }
  };

  const retryJoin = () => {
    if (joinState.kind === 'error') {
      handleJoin(joinState.memberId);
    }
  };

  const isJoining = joinState.kind === 'joining';

  return (
    <section className="join">
      <header className="join-header">
        <h1 className="join-heading">Phonebanker</h1>
        <p className="join-subhead">
          Search your name to join the phonebanking session.
        </p>
      </header>

      <label className="join-field" htmlFor="member-search">
        <span className="join-label">Your name</span>
        <input
          id="member-search"
          className="join-input"
          type="text"
          autoComplete="name"
          placeholder="Start typing…"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
        />
      </label>

      {searchState.kind === 'debouncing' && (
        <p className="join-hint">Typing…</p>
      )}

      {searchState.kind === 'searching' && (
        <p className="join-hint">Searching…</p>
      )}

      {searchState.kind === 'results' && (
        <ul className="join-results">
          {searchState.matches.map((m) => (
            <li key={m.id}>
              <button
                className="join-result"
                type="button"
                disabled={isJoining}
                onClick={() => handleJoin(m.id)}
              >
                {m.name}
              </button>
            </li>
          ))}
          {searchState.truncated && (
            <li className="join-truncated-hint">
              Too many results — type more letters to narrow down.
            </li>
          )}
        </ul>
      )}

      {searchState.kind === 'empty' && (
        <div className="join-empty">
          {searchState.isRealName ? (
            <p>
              No one found with that name. Check your spelling, or ask your
              organiser if you're on the list.
            </p>
          ) : (
            <p>
              No matches yet — keep typing your full name.
            </p>
          )}
        </div>
      )}

      {searchState.kind === 'error' && (
        <div className="join-error">
          <p>Couldn't search — {searchState.message}. Have another go.</p>
          <button
            className="join-retry-button"
            type="button"
            onClick={retrySearch}
          >
            Retry
          </button>
        </div>
      )}

      {joinState.kind === 'error' && (
        <div className="join-error">
          <p>Couldn't join — {joinState.message}. Want to try again?</p>
          <button
            className="join-retry-button"
            type="button"
            onClick={retryJoin}
          >
            Retry
          </button>
        </div>
      )}
    </section>
  );
}
